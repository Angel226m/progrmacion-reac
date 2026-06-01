defmodule HotelFluxWeb.ClienteController do
  @moduledoc """
  Controlador de cliente/huésped autenticado.
  Endpoints protegidos para que los huéspedes registrados
  puedan consultar sus reservas, ver detalles y cancelar.
  """
  use Phoenix.Controller

  alias HotelFlux.Adapters.Repos.{HuespedRepo, ReservaRepo, ConsumoRepo}
  alias HotelFlux.Guardian

  require Logger

  # ═══════════════════════════════════════════════════════════
  # GET /api/v1/cliente/reservas
  # Retorna las reservas del huésped autenticado
  # ═══════════════════════════════════════════════════════════
  def mis_reservas(conn, _params) do
    usuario = Guardian.Plug.current_resource(conn)

    if is_nil(usuario) do
      conn
      |> put_status(:unauthorized)
      |> json(%{error: "unauthenticated", message: "No autorizado"})
    else
      case HuespedRepo.buscar_por_email(usuario.email) do
        {:ok, huesped} ->
          reservas = ReservaRepo.listar(%{"huesped_id" => huesped.id})
          data = Enum.map(reservas, &serializar_reserva/1)
          conn |> json(%{data: data, huesped: serializar_huesped(huesped)})

        {:error, _} ->
          conn |> json(%{data: [], huesped: nil})
      end
    end
  end

  # ═══════════════════════════════════════════════════════════
  # GET /api/v1/cliente/reservas/:id
  # Detalle completo de una reserva del huésped autenticado
  # ═══════════════════════════════════════════════════════════
  def detalle_reserva(conn, %{"id" => id}) do
    usuario = Guardian.Plug.current_resource(conn)

    if is_nil(usuario) do
      conn |> put_status(:unauthorized) |> json(%{error: "No autorizado"})
    else
      case HuespedRepo.buscar_por_email(usuario.email) do
        {:ok, huesped} ->
          case ReservaRepo.obtener(id) do
            {:ok, reserva} ->
              # Verificar que la reserva pertenece al huésped
              if to_string(reserva.huesped_id) == to_string(huesped.id) do
                consumos = ConsumoRepo.por_reserva(id)
                conn |> json(%{data: serializar_detalle(reserva, consumos)})
              else
                conn |> put_status(:forbidden) |> json(%{error: "Acceso denegado"})
              end

            {:error, _} ->
              conn |> put_status(:not_found) |> json(%{error: "Reserva no encontrada"})
          end

        {:error, _} ->
          conn |> put_status(:not_found) |> json(%{error: "Huésped no encontrado"})
      end
    end
  end

  # ═══════════════════════════════════════════════════════════
  # PUT /api/v1/cliente/reservas/:id/cancelar
  # Cancelar una reserva futura del huésped autenticado
  # ═══════════════════════════════════════════════════════════
  def cancelar_reserva(conn, %{"id" => id}) do
    usuario = Guardian.Plug.current_resource(conn)

    if is_nil(usuario) do
      conn |> put_status(:unauthorized) |> json(%{error: "No autorizado"})
    else
      case HuespedRepo.buscar_por_email(usuario.email) do
        {:ok, huesped} ->
          case ReservaRepo.obtener(id) do
            {:ok, reserva} ->
              if to_string(reserva.huesped_id) != to_string(huesped.id) do
                conn |> put_status(:forbidden) |> json(%{error: "Acceso denegado"})
              else if reserva.estado not in ["confirmada", "pendiente"] do
                conn |> put_status(422) |> json(%{error: "Solo se pueden cancelar reservas confirmadas o pendientes"})
              else
                case ReservaRepo.actualizar(id, %{estado: "cancelada"}) do
                  {:ok, reserva_cancelada} ->
                    Logger.info("[Cliente] Reserva #{id} cancelada por #{usuario.email}")
                    conn |> json(%{ok: true, reserva: serializar_reserva(reserva_cancelada)})

                  {:error, _} ->
                    conn |> put_status(500) |> json(%{error: "No se pudo cancelar la reserva"})
                end
              end
              end

            {:error, _} ->
              conn |> put_status(:not_found) |> json(%{error: "Reserva no encontrada"})
          end

        {:error, _} ->
          conn |> put_status(:not_found) |> json(%{error: "Huésped no encontrado"})
      end
    end
  end

  # ═══════════════════════════════════════════════════════════
  # FUNCIONES PRIVADAS
  # ═══════════════════════════════════════════════════════════

  defp serializar_reserva(reserva) do
    %{
      id: reserva.id,
      codigo: generar_codigo_reserva(reserva.id),
      habitacion: to_string(get_in_safe(reserva, [:habitacion, :numero]) || ""),
      tipo: get_in_safe(reserva, [:habitacion, :tipo]) || "desconocido",
      piso: get_in_safe(reserva, [:habitacion, :piso]),
      fecha_entrada: to_string(reserva.fecha_entrada),
      fecha_salida: to_string(reserva.fecha_salida),
      estado: normalizar_estado(reserva.estado),
      total: to_string(reserva.total || "0"),
      notas: reserva.notas,
      inserted_at: reserva.inserted_at
    }
  end

  defp serializar_huesped(huesped) do
    %{
      id: huesped.id,
      nombre: huesped.nombre,
      apellido: huesped.apellido,
      email: huesped.email,
      telefono: huesped.telefono,
      documento: huesped.documento,
      tipo_documento: huesped.tipo_documento,
      nacionalidad: huesped.nacionalidad,
      inserted_at: huesped.inserted_at
    }
  end

  defp serializar_detalle(reserva, consumos) do
    noches = Date.diff(reserva.fecha_salida, reserva.fecha_entrada)
    habitacion = reserva.habitacion

    %{
      id: reserva.id,
      codigo: generar_codigo_reserva(reserva.id),
      habitacion: to_string(habitacion.numero),
      habitacion_id: habitacion.id,
      tipo: habitacion.tipo,
      piso: habitacion.piso,
      clasificacion: Map.get(habitacion, :clasificacion),
      amenidades: Map.get(habitacion, :amenidades) || [],
      caracteristicas: Map.get(habitacion, :caracteristicas),
      fecha_entrada: to_string(reserva.fecha_entrada),
      fecha_salida: to_string(reserva.fecha_salida),
      noches: max(noches, 1),
      estado: normalizar_estado(reserva.estado),
      total: to_string(reserva.total || "0"),
      precio_noche: to_string(habitacion.precio_noche || "0"),
      notas: reserva.notas,
      metodo_pago: nil,
      inserted_at: reserva.inserted_at,
      updated_at: reserva.updated_at,
      huesped: serializar_huesped(reserva.huesped),
      consumos: Enum.map(consumos, fn c ->
        %{
          id: c.id,
          producto: if(c.producto, do: c.producto.nombre, else: nil),
          cantidad: c.cantidad,
          precio_unitario: to_string(c.precio_unitario || "0"),
          total: to_string(c.total || "0"),
          estado: c.estado,
          inserted_at: c.inserted_at
        }
      end)
    }
  end

  defp generar_codigo_reserva(id) do
    short = id |> String.replace("-", "") |> String.slice(0, 8) |> String.upcase()
    "HF-#{short}"
  end

  defp normalizar_estado(estado) when estado in ["confirmada", "checked_in", "checked_out", "cancelada"],
    do: estado
  defp normalizar_estado(_), do: "pendiente"

  defp get_in_safe(map, [key | rest]) when is_map(map) do
    case Map.get(map, key) do
      nil -> nil
      value when rest == [] -> value
      value -> get_in_safe(value, rest)
    end
  end
  defp get_in_safe(_, _), do: nil
end
