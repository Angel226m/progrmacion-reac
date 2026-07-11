defmodule HotelFlux.UseCases.VentaProductoUseCase do
  @moduledoc """
  Venta de producto cargado a habitación.

  FRP:
  - Sin if/else/switch: pattern matching en cláusulas de función
  - Pipeline funcional con |> y Result combinators
  - Funciones puras sin efectos secundarios
  - Map dispatch polimórfico para broadcast por categoría
  """

  alias HotelFlux.Repo
  alias HotelFlux.Domain.{Evento, Consumo, Producto, Result}
  alias HotelFlux.Events.ProductoVendido
  alias HotelFlux.Adapters.Repos.{ProductoRepo, ConsumoRepo}

  require Logger

  def ejecutar(params, usuario \\ nil, ip \\ nil) do
    params
    |> Result.ok()
    |> Result.flat_map(&ProductoRepo.obtener(&1["producto_id"]))
    |> Result.flat_map(&validar_stock(&1, params))
    |> Result.flat_map(&registrar_consumo(&1, params))
    |> Result.flat_map(&actualizar_stock(&1, params))
    |> Result.map(fn {consumo, producto} ->
      evento = ProductoVendido.nuevo(consumo, producto, usuario, ip)
      Repo.insert(Evento.changeset(%Evento{}, Map.from_struct(evento)))
      broadcast_venta(consumo, producto)
      Logger.info("[Venta] #{producto.nombre} x#{Map.get(params, "cantidad", 1)} → Reserva #{params["reserva_id"]}")
      consumo
    end)
  end

  defp validar_stock(%{disponible: false} = _producto, _params), do: {:error, :producto_no_disponible}
  defp validar_stock(%Producto{stock: s} = producto, _params) when s > 0, do: {:ok, producto}
  defp validar_stock(%Producto{}, _params), do: {:error, :sin_stock}

  defp registrar_consumo(producto, params) do
    cantidad = Map.get(params, "cantidad", 1)
    total = Consumo.calcular_total(producto.precio, cantidad)

    case ConsumoRepo.crear(%{
      reserva_id: params["reserva_id"],
      producto_id: producto.id,
      cantidad: cantidad,
      precio_unitario: producto.precio,
      total: total,
      estado: "pendiente"
    }) do
      {:ok, consumo} -> {:ok, {consumo, producto}}
      {:error, _} -> {:error, :error_al_crear_consumo}
    end
  end

  defp actualizar_stock({_consumo, producto}, params) do
    cantidad = Map.get(params, "cantidad", 1)
    attrs = Producto.descontar_stock(producto, cantidad)
    actualizar_si_hay_cambios(producto.id, attrs, params)
  end

  defp actualizar_si_hay_cambios(_id, %{}, params), do: {:ok, {nil, params}}
  defp actualizar_si_hay_cambios(id, attrs, _params), do: ProductoRepo.actualizar(id, attrs)

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

    notificar_si_room_service(producto.categoria, producto)
  end

  defp notificar_si_room_service("room_service", producto) do
    Phoenix.PubSub.broadcast(HotelFlux.PubSub, "notificaciones", {
      :alerta,
      %{tipo: "room_service", mensaje: "Pedido: #{producto.nombre}", nivel: "warning"}
    })
  end

  defp notificar_si_room_service(_otra_categoria, _producto), do: :ok
end
