defmodule HotelFluxWeb.ServicioController do
  use Phoenix.Controller

  alias HotelFlux.Adapters.Repos.{ReservaServicioRepo, ReservaRepo, ProductoRepo}
  alias HotelFlux.Domain.ReservaServicio
  alias HotelFlux.Repo
  alias HotelFlux.Domain.Evento
  alias HotelFlux.Events.ServicioAgregado

  require Logger

  def listar_por_reserva(conn, %{"reserva_id" => reserva_id}) do
    servicios = ReservaServicioRepo.por_reserva(reserva_id)
    agrupado = ReservaServicioRepo.agrupado_por_dia(reserva_id)
    total = ReservaServicioRepo.total_por_reserva(reserva_id)

    conn |> json(%{
      ok: true,
      servicios: Enum.map(servicios, &serialize/1),
      agrupado_por_dia: agrupado |> Enum.map(fn {dia, svcs} ->
        %{dia: dia, servicios: Enum.map(svcs, &serialize/1)}
      end),
      total: total
    })
  end

  def agregar_servicio(conn, %{"reserva_id" => reserva_id} = params) do
    usuario = Guardian.Plug.current_resource(conn)
    ip = conn.remote_ip |> :inet.ntoa() |> to_string()
    with {:ok, reserva} <- ReservaRepo.obtener(reserva_id),
         {:ok, _reserva} <- validar_reserva_activa(reserva),
         {:ok, producto} <- ProductoRepo.obtener(params["producto_id"]),
         dia = params["dia_numero"] || 1,
         cantidad = params["cantidad"] || 1,
         es_adicional = params["es_adicional"] || false,
         total = ReservaServicio.calcular_total(producto.precio, cantidad),
         {:ok, rs} <- ReservaServicioRepo.crear(%{
           reserva_id: reserva_id,
           producto_id: producto.id,
           dia_numero: dia,
           cantidad: cantidad,
           precio_unitario: producto.precio,
           total: total,
           es_adicional: es_adicional
         }) do
      evento = ServicioAgregado.nuevo(rs, producto, es_adicional, usuario, ip)
      Repo.insert(Evento.changeset(%Evento{}, Map.from_struct(evento)))
      actualizar_total_reserva(reserva_id)

      conn |> put_status(201) |> json(%{ok: true, servicio: serialize(rs)})
    else
      {:error, :reserva_inactiva} ->
        conn |> put_status(422) |> json(%{error: "La reserva no está activa"})
      {:error, reason} ->
        conn |> put_status(422) |> json(%{error: to_string(reason)})
    end
  end

  def agregar_servicios_lote(conn, %{"reserva_id" => reserva_id, "servicios" => servicios_params}) do
    usuario = Guardian.Plug.current_resource(conn)
    ip = conn.remote_ip |> :inet.ntoa() |> to_string()
    with {:ok, reserva} <- ReservaRepo.obtener(reserva_id),
         {:ok, _reserva} <- validar_reserva_activa(reserva) do
      results =
        Enum.reduce_while(servicios_params, {:ok, []}, fn svc, {:ok, acc} ->
          case ProductoRepo.obtener(svc["producto_id"]) do
            {:ok, producto} ->
              cantidad = svc["cantidad"] || 1
              dia = svc["dia_numero"] || 1
              es_adicional = svc["es_adicional"] || false
              total = ReservaServicio.calcular_total(producto.precio, cantidad)

              case ReservaServicioRepo.crear(%{
                reserva_id: reserva_id,
                producto_id: producto.id,
                dia_numero: dia,
                cantidad: cantidad,
                precio_unitario: producto.precio,
                total: total,
                es_adicional: es_adicional
              }) do
                {:ok, rs} ->
                  evento = ServicioAgregado.nuevo(rs, producto, es_adicional, usuario, ip)
                  Repo.insert(Evento.changeset(%Evento{}, Map.from_struct(evento)))
                  {:cont, {:ok, [serialize(rs) | acc]}}
                {:error, _} = err -> {:halt, err}
              end
            {:error, _} = err -> {:halt, err}
          end
        end)

      case results do
        {:ok, list} ->
          actualizar_total_reserva(reserva_id)
          conn |> put_status(201) |> json(%{ok: true, servicios: Enum.reverse(list), count: length(list)})
        {:error, reason} ->
          conn |> put_status(422) |> json(%{error: to_string(reason)})
      end
    else
      {:error, :reserva_inactiva} ->
        conn |> put_status(422) |> json(%{error: "La reserva no está activa"})
      {:error, reason} ->
        conn |> put_status(422) |> json(%{error: to_string(reason)})
    end
  end

  def actualizar_estado(conn, %{"id" => id, "estado" => estado}) do
    case ReservaServicioRepo.actualizar_estado(id, estado) do
      {:ok, rs} ->
        actualizar_total_reserva(rs.reserva_id)
        conn |> json(%{ok: true, servicio: serialize(rs)})
      {:error, reason} ->
        conn |> put_status(422) |> json(%{error: to_string(reason)})
    end
  end

  defp validar_reserva_activa(reserva) do
    if reserva.estado in ~w(confirmada checked_in) do
      {:ok, reserva}
    else
      {:error, :reserva_inactiva}
    end
  end

  defp actualizar_total_reserva(reserva_id) do
    with {:ok, reserva} <- ReservaRepo.obtener(reserva_id) do
      servicios_total = ReservaServicioRepo.total_por_reserva(reserva_id)
      nuevo_total = Decimal.add(reserva.total || Decimal.new(0), servicios_total)
      ReservaRepo.actualizar_total(reserva_id, nuevo_total)
    end
  end

  defp serialize(rs) do
    %{
      id: rs.id,
      reserva_id: rs.reserva_id,
      producto_id: rs.producto_id,
      producto_nombre: rs.producto && rs.producto.nombre,
      categoria: rs.producto && rs.producto.categoria,
      dia_numero: rs.dia_numero,
      cantidad: rs.cantidad,
      precio_unitario: rs.precio_unitario && to_string(rs.precio_unitario),
      total: rs.total && to_string(rs.total),
      es_adicional: rs.es_adicional,
      estado: rs.estado,
      fecha_servicio: rs.fecha_servicio,
      inserted_at: rs.inserted_at
    }
  end
end
