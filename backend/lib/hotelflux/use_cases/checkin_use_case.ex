defmodule HotelFlux.UseCases.CheckinUseCase do
  @moduledoc """
  Check-in del huésped con Ecto.Multi transaccional.

  FRP:
  - Sin if/else/switch: pattern matching en cláusulas de función
  - Pipeline funcional con Result combinators
  - Ecto.Multi para atomicidad transaccional
  - Broadcast reactivo como efecto separado al final
  """

  alias HotelFlux.Repo
  alias HotelFlux.Infra.Persistence.Schema.Evento, as: EventoEsquema
  alias HotelFlux.Events.CheckinRealizado
  alias HotelFlux.Adapters.Repos.{ReservaRepo, HabitacionRepo}

  require Logger

  def ejecutar(reserva_id, usuario \\ nil, ip \\ nil) do
    try do
      with {:ok, reserva} <- ReservaRepo.obtener(reserva_id),
           :ok <- validar_checkin(reserva) do
        evento = CheckinRealizado.nuevo(reserva, usuario, ip)

        multi =
          Ecto.Multi.new()
          |> Ecto.Multi.run(:reserva, fn _repo, _ -> ReservaRepo.actualizar_estado(reserva_id, "checked_in") end)
          |> Ecto.Multi.run(:habitacion, fn _repo, _ -> HabitacionRepo.cambiar_estado(reserva.habitacion_id, "ocupada") end)
          |> Ecto.Multi.run(:evento, fn _repo, _ ->
            Repo.insert(EventoEsquema.changeset(%EventoEsquema{}, Map.from_struct(evento)))
          end)

        case Repo.transaction(multi) do
          {:ok, %{reserva: reserva_act, habitacion: habitacion}} ->
            broadcast_checkin(reserva_act, habitacion)
            Logger.info("[CheckIn] Reserva #{reserva_id} — Habitación #{habitacion.numero} ocupada")
            {:ok, %{reserva: reserva_act, habitacion: habitacion}}

          {:error, _failed_op, failed_value, _changes} ->
            Logger.error("[CheckIn] Error transacción: #{inspect(failed_value)}")
            {:error, failed_value}
        end
      end
    rescue
      e ->
        Logger.error("[CheckIn] Excepción en checkin: #{inspect(e)}")
        {:error, "Error interno: #{Exception.message(e)}"}
    end
  end

  defp validar_checkin(%{estado: "confirmada", fecha_entrada: %Date{} = fecha}) do
    case Date.compare(fecha, Date.utc_today()) do
      :gt -> {:error, :checkin_anticipado}
      _ -> :ok
    end
  end
  defp validar_checkin(%{estado: "confirmada", fecha_entrada: fecha_str}) when is_binary(fecha_str) do
    with {:ok, fecha} <- Date.from_iso8601(fecha_str),
         do: validar_checkin(%{estado: "confirmada", fecha_entrada: fecha})
  end
  defp validar_checkin(%{estado: "confirmada", fecha_entrada: _}), do: {:error, :fecha_invalida}
  defp validar_checkin(_reserva), do: {:error, :estado_invalido}

  defp broadcast_checkin(reserva, habitacion) do
    Phoenix.PubSub.broadcast(HotelFlux.PubSub, "habitaciones", {
      :habitacion_actualizada,
      %{id: habitacion.id, numero: habitacion.numero, estado: "ocupada", piso: habitacion.piso}
    })

    Phoenix.PubSub.broadcast(HotelFlux.PubSub, "dashboard", {
      :checkin_realizado,
      %{reserva_id: reserva.id, habitacion_numero: habitacion.numero}
    })
  end
end
