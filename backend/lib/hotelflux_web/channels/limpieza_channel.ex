defmodule HotelFluxWeb.LimpiezaChannel do
  @moduledoc """
  Canal WebSocket reactivo — Stream de tareas para tablets de limpieza.

  El personal de limpieza recibe en tiempo real:
  - Nuevas tareas cuando hay check-out
  - Actualizaciones de estado de tareas
  Solo ve sus propias tareas (filtrado por empleado_id).
  """
  use Phoenix.Channel

  alias HotelFlux.Adapters.Repos.TareaRepo

  @impl true
  def join("limpieza:" <> empleado_id, _params, socket) do
    # Verificar que el usuario es personal de limpieza
    if socket.assigns.rol in ["limpieza", "mantenimiento", "admin"] do
      tareas = case Ecto.UUID.cast(empleado_id) do
        {:ok, _} -> TareaRepo.por_empleado(empleado_id)
        :error -> []
      end
      Phoenix.PubSub.subscribe(HotelFlux.PubSub, "limpieza")

      socket = assign(socket, :empleado_id, empleado_id)
      {:ok, %{tareas: serialize_tareas(tareas)}, socket}
    else
      {:error, %{reason: "No autorizado"}}
    end
  end

  # Recibe nueva tarea del PubSub
  @impl true
  def handle_info({:nueva_tarea, tarea_data}, socket) do
    # Solo enviar si es para este empleado
    if tarea_data.empleado_id == socket.assigns.empleado_id do
      push(socket, "nueva_tarea", tarea_data)
    end

    {:noreply, socket}
  end

  def handle_info({:tarea_actualizada, tarea_data}, socket) do
    if tarea_data.empleado_id == socket.assigns.empleado_id do
      push(socket, "tarea_actualizada", tarea_data)
    end

    {:noreply, socket}
  end

  # El empleado actualiza estado de su tarea
  @impl true
  def handle_in("actualizar_estado", %{"tarea_id" => tarea_id, "estado" => estado}, socket) do
    case HotelFlux.UseCases.AsignarLimpiezaUseCase.actualizar_estado(tarea_id, estado) do
      {:ok, tarea} ->
        {:reply, {:ok, %{tarea: serialize_tarea(tarea)}}, socket}

      {:error, reason} ->
        {:reply, {:error, %{error: to_string(reason)}}, socket}
    end
  end

  defp serialize_tareas(tareas), do: Enum.map(tareas, &serialize_tarea/1)

  defp serialize_tarea(t) do
    %{
      id: t.id,
      habitacion_id: t.habitacion_id,
      empleado_id: t.empleado_id,
      estado: t.estado,
      habitacion_numero: if(Ecto.assoc_loaded?(t.habitacion), do: t.habitacion.numero, else: nil),
      piso: if(Ecto.assoc_loaded?(t.habitacion), do: t.habitacion.piso, else: nil),
      iniciada_en: t.iniciada_en,
      completada_en: t.completada_en,
      duracion_minutos: t.duracion_minutos
    }
  end
end
