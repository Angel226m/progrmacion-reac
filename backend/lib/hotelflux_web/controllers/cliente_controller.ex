defmodule HotelFluxWeb.ClienteController do
  @moduledoc """
  Controlador de cliente/huésped autenticado.
  Endpoints protegidos para que los huéspedes registrados
  puedan consultar sus reservas y datos de perfil.
  """
  use Phoenix.Controller

  alias HotelFlux.Adapters.Repos.{HuespedRepo, ReservaRepo}
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
          # Usuario sin registro de huésped (no ha hecho reservas)
          conn |> json(%{data: [], huesped: nil})
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
