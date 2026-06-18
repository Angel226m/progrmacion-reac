defmodule HotelFlux.UseCases.CheckinUseCase do
  @moduledoc """
  Caso de uso: Check-in del huésped.

  Pipeline funcional:
    obtener_reserva → validar_fecha → cambiar_habitacion_a_ocupada → registrar_evento → broadcast

  Demuestra: composición funcional con pipe |>, pattern matching, broadcast reactivo.
  """

  alias HotelFlux.Repo
  alias HotelFlux.Domain.Evento
  alias HotelFlux.Events.CheckinRealizado
  alias HotelFlux.Adapters.Repos.{ReservaRepo, HabitacionRepo}

  require Logger

  def ejecutar(reserva_id, usuario \\ nil, ip \\ nil) do
    with {:ok, reserva} <- ReservaRepo.obtener(reserva_id),
         :ok <- validar_checkin(reserva),
         {:ok, reserva} <- ReservaRepo.actualizar_estado(reserva_id, "checked_in"),
         {:ok, habitacion} <- HabitacionRepo.cambiar_estado(reserva.habitacion_id, "ocupada") do

      # Registrar evento inmutable (Event Sourcing)
      evento = CheckinRealizado.nuevo(reserva, usuario, ip)
      Repo.insert(Evento.changeset(%Evento{}, Map.from_struct(evento)))

      # Broadcast reactivo a múltiples destinos
      broadcast_checkin(reserva, habitacion)

      Logger.info("[CheckIn] Reserva #{reserva_id} — Habitación #{habitacion.numero} ocupada")
      {:ok, %{reserva: reserva, habitacion: habitacion}}
    else
      {:error, reason} ->
        Logger.warning("[CheckIn] Error: #{inspect(reason)}")
        {:error, reason}
    end
  end

  # Función PURA — valida si el check-in es posible
  defp validar_checkin(reserva) do
    cond do
      reserva.estado != "confirmada" ->
        {:error, :estado_invalido}

      Date.compare(reserva.fecha_entrada, Date.utc_today()) == :gt ->
        {:error, :checkin_anticipado}

      true ->
        :ok
    end
  end

  # Broadcast reactivo — un evento → múltiples destinos
  defp broadcast_checkin(reserva, habitacion) do
    # Al mapa de habitaciones (recepción)
    Phoenix.PubSub.broadcast(HotelFlux.PubSub, "habitaciones", {
      :habitacion_actualizada,
      %{id: habitacion.id, numero: habitacion.numero, estado: "ocupada", piso: habitacion.piso}
    })

    # Al dashboard gerencial
    Phoenix.PubSub.broadcast(HotelFlux.PubSub, "dashboard", {
      :checkin_realizado,
      %{reserva_id: reserva.id, habitacion_numero: habitacion.numero}
    })
  end
end
