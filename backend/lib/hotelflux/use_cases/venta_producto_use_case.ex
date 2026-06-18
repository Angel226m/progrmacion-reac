defmodule HotelFlux.UseCases.VentaProductoUseCase do
  @moduledoc """
  Caso de uso: Venta de producto cargado a habitación.

  Pipeline funcional:
    producto |> verificar_stock |> calcular_total |> registrar_consumo
             |> actualizar_stock |> broadcast_venta

  Demuestra: composición pura de funciones con pipe |>.
  """

  alias HotelFlux.Repo
  alias HotelFlux.Domain.{Evento, Consumo, Producto}
  alias HotelFlux.Events.ProductoVendido
  alias HotelFlux.Adapters.Repos.{ProductoRepo, ConsumoRepo}

  require Logger

  def ejecutar(params, usuario \\ nil, ip \\ nil) do
    with {:ok, producto} <- ProductoRepo.obtener(params["producto_id"]),
         :ok <- verificar_disponibilidad(producto),
         {:ok, consumo} <- registrar_consumo(producto, params),
         {:ok, _producto} <- actualizar_stock(producto) do

      # Event Sourcing
      evento = ProductoVendido.nuevo(consumo, producto, usuario, ip)
      Repo.insert(Evento.changeset(%Evento{}, Map.from_struct(evento)))

      # Broadcast reactivo
      broadcast_venta(consumo, producto)

      Logger.info("[Venta] #{producto.nombre} x#{params["cantidad"]} → Reserva #{params["reserva_id"]}")
      {:ok, consumo}
    end
  end

  # Función PURA
  defp verificar_disponibilidad(producto) do
    if Producto.tiene_stock?(producto) and producto.disponible do
      :ok
    else
      {:error, :sin_stock}
    end
  end

  defp registrar_consumo(producto, params) do
    cantidad = params["cantidad"] || 1
    total = Consumo.calcular_total(producto.precio, cantidad)

    ConsumoRepo.crear(%{
      reserva_id: params["reserva_id"],
      producto_id: producto.id,
      cantidad: cantidad,
      precio_unitario: producto.precio,
      total: total,
      estado: "pendiente"
    })
  end

  defp actualizar_stock(producto) do
    attrs = Producto.descontar_stock(producto)
    if map_size(attrs) > 0 do
      ProductoRepo.actualizar(producto.id, attrs)
    else
      {:ok, producto}
    end
  end

  defp broadcast_venta(consumo, producto) do
    Phoenix.PubSub.broadcast(HotelFlux.PubSub, "dashboard", {
      :venta_realizada,
      %{
        producto: producto.nombre,
        categoria: producto.categoria,
        total: to_string(consumo.total),
        reserva_id: consumo.reserva_id
      }
    })

    # Si es room service, notificar a cocina
    if producto.categoria == "room_service" do
      Phoenix.PubSub.broadcast(HotelFlux.PubSub, "notificaciones", {
        :alerta,
        %{tipo: "room_service", mensaje: "Pedido: #{producto.nombre}", nivel: "warning"}
      })
    end
  end
end
