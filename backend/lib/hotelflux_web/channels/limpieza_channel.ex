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
  def join("limpieza:lobby", _params, socket) when socket.assigns.rol in ["admin", "gerente", "mantenimiento"] do
    Phoenix.PubSub.subscribe(HotelFlux.PubSub, "limpieza")
    socket = assign(socket, :empleado_id, "lobby")
    send(self(), :after_join_lobby)
    {:ok, %{}, socket}
  end

  def join("limpieza:lobby", _params, _socket) do
    {:error, %{reason: "No autorizado"}}
  end

  @impl true
  def join("limpieza:" <> empleado_id, _params, socket) when socket.assigns.rol in ["limpieza", "mantenimiento", "admin"] do
    Phoenix.PubSub.subscribe(HotelFlux.PubSub, "limpieza")
    socket = assign(socket, :empleado_id, empleado_id)
    send(self(), :after_join)
    {:ok, %{}, socket}
  end

  def join("limpieza:" <> _empleado_id, _params, _socket) do
    {:error, %{reason: "No autorizado"}}
  end

  @impl true
  def handle_info(:after_join_lobby, socket) do
    tareas = TareaRepo.listar()
    push(socket, "tareas_lista", %{tareas: serialize_tareas(tareas)})
    {:noreply, socket}
  end

  def handle_info(:after_join, socket) do
    empleado_id = socket.assigns.empleado_id

    tareas = case Ecto.UUID.cast(empleado_id) do
      {:ok, _} -> TareaRepo.por_empleado(empleado_id)
      :error   -> []
    end

    push(socket, "tareas_lista", %{tareas: serialize_tareas(tareas)})
    {:noreply, socket}
  end

  @impl true
  def handle_info({:nueva_tarea, tarea_data}, socket) do
    maybe_push_tarea(socket, tarea_data, "nueva_tarea")
    {:noreply, socket}
  end

  def handle_info({:tarea_asignada, tarea_data}, socket) do
    maybe_push_tarea(socket, tarea_data, "nueva_tarea")
    {:noreply, socket}
  end

  def handle_info({:tarea_actualizada, tarea_data}, socket) do
    maybe_push_tarea(socket, tarea_data, "tarea_actualizada")
    {:noreply, socket}
  end

  @impl true
  def handle_in("actualizar_estado", %{"tarea_id" => tarea_id, "estado" => estado}, socket) do
    case HotelFlux.UseCases.AsignarLimpiezaUseCase.actualizar_estado(tarea_id, estado) do
      {:ok, tarea} ->
        {:reply, {:ok, %{tarea: serialize_tarea(tarea)}}, socket}

      {:error, reason} ->
        {:reply, {:error, %{error: to_string(reason)}}, socket}
    end
  end

  defp maybe_push_tarea(%{assigns: %{empleado_id: "lobby"}} = socket, data, event) do
    push(socket, event, data)
  end

  defp maybe_push_tarea(%{assigns: %{empleado_id: id}} = socket, %{empleado_id: id} = data, event) do
    push(socket, event, data)
  end

  defp maybe_push_tarea(_socket, _data, _event), do: :ok

  defp serialize_tareas(tareas), do: Enum.map(tareas, &serialize_tarea/1)

  defp serializar_habitacion(t) do
    case Ecto.assoc_loaded?(t.habitacion) do
      true -> %{id: t.habitacion.id, numero: t.habitacion.numero, piso: t.habitacion.piso, tipo: t.habitacion.tipo}
      false -> nil
    end
  end

  defp serialize_tarea(t) do
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
end
