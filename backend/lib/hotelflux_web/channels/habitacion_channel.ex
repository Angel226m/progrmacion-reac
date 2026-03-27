defmodule HotelFluxWeb.HabitacionChannel do
  @moduledoc """
  🔥 Canal WebSocket reactivo — Stream del mapa de habitaciones.

  Este canal es el corazón reactivo del mapa SVG de recepción:
  - Cada recepcionista se suscribe al unirse
  - Cuando CUALQUIER habitación cambia de estado (reserva, check-in, checkout, limpieza)
    el cambio se propaga AUTOMÁTICAMENTE a TODOS los clientes conectados
  - El frontend recibe el evento y actualiza el SVG sin recargar la página

  Demuestra: Streams reactivos en tiempo real, PubSub, fan-out.
  """
  use Phoenix.Channel

  alias HotelFlux.Adapters.Repos.HabitacionRepo

  @impl true
  def join("habitaciones:lobby", _params, socket) do
    # Al unirse, enviar estado actual de todas las habitaciones
    habitaciones = HabitacionRepo.listar()

    # Suscribirse al topic PubSub para recibir actualizaciones reactivas
    Phoenix.PubSub.subscribe(HotelFlux.PubSub, "habitaciones")

    {:ok, %{habitaciones: serialize_habitaciones(habitaciones)}, socket}
  end

  def join("habitaciones:piso:" <> piso, _params, socket) do
    piso_num = String.to_integer(piso)
    habitaciones = HabitacionRepo.por_piso(piso_num)
    Phoenix.PubSub.subscribe(HotelFlux.PubSub, "habitaciones")

    socket = assign(socket, :piso_filtro, piso_num)
    {:ok, %{habitaciones: serialize_habitaciones(habitaciones)}, socket}
  end

  # Recibe broadcast del PubSub y reenvía al frontend por WebSocket
  @impl true
  def handle_info({:habitacion_actualizada, habitacion_data}, socket) do
    # Si el socket tiene filtro por piso, solo enviar si coincide
    if should_send?(socket, habitacion_data) do
      push(socket, "habitacion_actualizada", habitacion_data)
    end

    {:noreply, socket}
  end

  # El frontend puede solicitar cambio de estado
  @impl true
  def handle_in("cambiar_estado", %{"habitacion_id" => id, "estado" => estado}, socket) do
    case HabitacionRepo.cambiar_estado(id, estado) do
      {:ok, habitacion} ->
        # Broadcast reactivo a TODOS los clientes
        Phoenix.PubSub.broadcast(HotelFlux.PubSub, "habitaciones", {
          :habitacion_actualizada,
          %{id: habitacion.id, numero: habitacion.numero, estado: habitacion.estado, piso: habitacion.piso}
        })

        {:reply, {:ok, %{habitacion: serialize_habitacion(habitacion)}}, socket}

      {:error, reason} ->
        {:reply, {:error, %{error: to_string(reason)}}, socket}
    end
  end

  defp should_send?(socket, data) do
    case socket.assigns do
      %{piso_filtro: piso} -> data[:piso] == piso
      _ -> true
    end
  end

  defp serialize_habitaciones(habitaciones) do
    Enum.map(habitaciones, &serialize_habitacion/1)
  end

  defp serialize_habitacion(h) do
    %{
      id: h.id,
      numero: h.numero,
      tipo: h.tipo,
      piso: h.piso,
      capacidad: h.capacidad,
      precio_noche: to_string(h.precio_noche),
      estado: h.estado,
      caracteristicas: h.caracteristicas
    }
  end
end
