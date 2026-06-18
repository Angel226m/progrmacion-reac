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

      tarea_con_habitacion = Repo.preload(tarea_actualizada, :habitacion)

      if nuevo_estado == "completada" do
        completar_limpieza(tarea_con_habitacion)
      end

      broadcast_limpieza(tarea_con_habitacion, nuevo_estado)
      {:ok, tarea_con_habitacion}
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

  defp serializar_habitacion(t) do
    case Ecto.assoc_loaded?(t.habitacion) do
      true -> %{id: t.habitacion.id, numero: t.habitacion.numero, piso: t.habitacion.piso, tipo: t.habitacion.tipo}
      false -> nil
    end
  end

  defp serializar_tarea(t) do
    %{
      id: t.id,
      habitacion_id: t.habitacion_id,
      empleado_id: t.empleado_id,
      estado: t.estado,
      prioridad: t.prioridad,
      notas: t.notas,
      inserted_at: t.inserted_at,
      iniciada_at: t.iniciada_en,
      completada_at: t.completada_en,
      habitacion: serializar_habitacion(t)
    }
  end

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

  defp broadcast_limpieza(tarea, _estado) do
    datos = serializar_tarea(tarea)

    Phoenix.PubSub.broadcast(HotelFlux.PubSub, "limpieza", {
      :tarea_actualizada,
      datos
    })

    Phoenix.PubSub.broadcast(HotelFlux.PubSub, "dashboard", {
      :limpieza_actualizada,
      %{tarea_id: tarea.id, estado: tarea.estado, duracion: tarea.duracion_minutos}
    })
  end
end
