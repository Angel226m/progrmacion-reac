defmodule HotelFlux.UseCases.AsignarLimpiezaUseCase do
  @moduledoc """
  Caso de uso: Actualizar estado de tarea de limpieza.
  Cuando se completa, la habitación vuelve a "disponible" — broadcast reactivo al mapa.
  """

  alias HotelFlux.Repo
  alias HotelFlux.Domain.{Evento, TareaLimpieza}
  alias HotelFlux.Events.LimpiezaCompletada
  alias HotelFlux.Adapters.Repos.{TareaRepo, HabitacionRepo}

  require Logger

  def actualizar_estado(tarea_id, nuevo_estado) do
    with {:ok, tarea} <- TareaRepo.obtener(tarea_id),
         {:ok, tarea_actualizada} <- aplicar_estado(tarea, nuevo_estado) do

      if nuevo_estado == "completada" do
        completar_limpieza(tarea_actualizada)
      end

      broadcast_limpieza(tarea_actualizada, nuevo_estado)
      {:ok, tarea_actualizada}
    end
  end

  defp aplicar_estado(tarea, "en_proceso") do
    changeset = TareaLimpieza.iniciar(tarea)
    Repo.update(changeset)
  end

  defp aplicar_estado(tarea, "completada") do
    changeset = TareaLimpieza.completar(tarea)
    Repo.update(changeset)
  end

  defp aplicar_estado(_tarea, _), do: {:error, :estado_invalido}

  # Cuando limpieza se completa → habitación vuelve a "disponible"
  defp completar_limpieza(tarea) do
    HabitacionRepo.cambiar_estado(tarea.habitacion_id, "disponible")

    # Event Sourcing
    evento = LimpiezaCompletada.nuevo(tarea)
    Repo.insert(Evento.changeset(%Evento{}, Map.from_struct(evento)))

    # Broadcast: habitación disponible de nuevo
    Phoenix.PubSub.broadcast(HotelFlux.PubSub, "habitaciones", {
      :habitacion_actualizada,
      %{id: tarea.habitacion_id, estado: "disponible"}
    })

    Logger.info("[Limpieza] Tarea #{tarea.id} completada — habitación disponible")
  end

  defp broadcast_limpieza(tarea, estado) do
    Phoenix.PubSub.broadcast(HotelFlux.PubSub, "limpieza", {
      :tarea_actualizada,
      %{id: tarea.id, estado: estado, empleado_id: tarea.empleado_id,
        duracion_minutos: tarea.duracion_minutos}
    })

    Phoenix.PubSub.broadcast(HotelFlux.PubSub, "dashboard", {
      :limpieza_actualizada,
      %{tarea_id: tarea.id, estado: estado, duracion: tarea.duracion_minutos}
    })
  end
end
