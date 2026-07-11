defmodule HotelFlux.UseCases.AsignarLimpiezaUseCase do
  @moduledoc """
  Actualizar estado de tarea de limpieza.

  FRP:
  - Sin if/else/switch: pattern matching en cláusulas de función
  - Map dispatch polimórfico para diferentes acciones por estado
  - Pipeline funcional con Result
  - Efectos secundarios al final del pipeline
  """

  alias HotelFlux.Repo
  alias HotelFlux.Domain.{Evento, TareaLimpieza}
  alias HotelFlux.Events.LimpiezaCompletada
  alias HotelFlux.Adapters.Repos.{TareaRepo, HabitacionRepo}

  require Logger

  def actualizar_estado(tarea_id, nuevo_estado, usuario \\ nil, ip \\ nil) do
    with {:ok, tarea} <- TareaRepo.obtener(tarea_id),
         {:ok, tarea_actualizada} <- aplicar_estado(tarea, nuevo_estado) do
      tarea_con_habitacion = Repo.preload(tarea_actualizada, :habitacion)
      ejecutar_accion_por_estado(nuevo_estado, tarea_con_habitacion, usuario, ip)
      broadcast_limpieza(tarea_con_habitacion, nuevo_estado)
      {:ok, tarea_con_habitacion}
    end
  end

  defp aplicar_estado(tarea, "en_proceso"), do: Repo.update(TareaLimpieza.iniciar(tarea))
  defp aplicar_estado(tarea, "completada"), do: Repo.update(TareaLimpieza.completar(tarea))
  defp aplicar_estado(_tarea, _), do: {:error, :estado_invalido}

  defp ejecutar_accion_por_estado("completada", tarea, usuario, ip) do
    HabitacionRepo.cambiar_estado(tarea.habitacion_id, "disponible")
    evento = LimpiezaCompletada.nuevo(tarea, usuario, ip)
    Repo.insert(Evento.changeset(%Evento{}, Map.from_struct(evento)))
    Logger.info("[Limpieza] Tarea #{tarea.id} completada — habitación disponible")
  end
  defp ejecutar_accion_por_estado(_otro_estado, _tarea, _usuario, _ip), do: :ok

  defp serializar_habitacion(%{habitacion: %{id: id, numero: num, piso: piso, tipo: tipo}}) do
    %{id: id, numero: num, piso: piso, tipo: tipo}
  end
  defp serializar_habitacion(_sin_habitacion), do: nil

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

  defp broadcast_limpieza(tarea, _estado) do
    datos = serializar_tarea(tarea)

    Phoenix.PubSub.broadcast(HotelFlux.PubSub, "limpieza", {:tarea_actualizada, datos})

    Phoenix.PubSub.broadcast(HotelFlux.PubSub, "dashboard", {
      :limpieza_actualizada,
      %{tarea_id: tarea.id, estado: tarea.estado, duracion: tarea.duracion_minutos}
    })
  end
end
