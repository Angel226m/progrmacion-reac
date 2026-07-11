defmodule HotelFluxWeb.HabitacionChannel do
  @moduledoc """
  🔥 Canal WebSocket reactivo — Stream del mapa de habitaciones.

  Este canal es el corazón reactivo del mapa SVG de recepción:
  - Cada recepcionista se suscribe al unirse
  - Cuando CUALQUIER habitación cambia de estado (reserva, check-in, checkout, limpieza)
    el cambio se propaga AUTOMÁTICAMENTE a TODOS los clientes conectados
  - El frontend recibe el evento y actualiza el SVG sin recargar la página

  Demuestra: Streams reactivos en tiempo real, PubSub, fan-out,
  HOF para serialización, recursión para agrupación por pisos.
  """
  use Phoenix.Channel

  alias HotelFlux.Adapters.Repos.HabitacionRepo
  alias HotelFlux.Domain.{Habitacion, Pipeline}

  @impl true
  def join("habitaciones:lobby", _params, socket) do
    habitaciones = HabitacionRepo.listar()
    Phoenix.PubSub.subscribe(HotelFlux.PubSub, "habitaciones")

    serializadas = Pipeline.mapear(habitaciones, &serialize_habitacion/1)

    {:ok, %{habitaciones: serializadas}, socket}
  end

  def join("habitaciones:piso:" <> piso, _params, socket) do
    piso_num =
      case Integer.parse(piso) do
        {num, _} -> num
        _ -> 0
      end

    habitaciones = HabitacionRepo.por_piso(piso_num)
    Phoenix.PubSub.subscribe(HotelFlux.PubSub, "habitaciones")

    socket = assign(socket, :piso_filtro, piso_num)

    {:ok, %{habitaciones: Pipeline.mapear(habitaciones, &serialize_habitacion/1)}, socket}
  end

  def join("habitaciones:mapa", _params, socket) do
    habitaciones = HabitacionRepo.listar()
    Phoenix.PubSub.subscribe(HotelFlux.PubSub, "habitaciones")

    mapa_por_piso =
      habitaciones
      |> Habitacion.agrupar_por_piso()
      |> Map.new(fn {piso, habs} ->
        {piso, Pipeline.mapear(habs, &serialize_habitacion/1)}
      end)

    {:ok, %{mapa_por_piso: mapa_por_piso}, socket}
  end

  @impl true
  def handle_info({:habitacion_actualizada, habitacion_data}, socket) do
    maybe_push(socket, habitacion_data)
    {:noreply, socket}
  end

  @impl true
  def handle_in("cambiar_estado", %{"habitacion_id" => id, "estado" => estado}, socket) do
    case HabitacionRepo.cambiar_estado(id, estado) do
      {:ok, habitacion} ->
        Phoenix.PubSub.broadcast(HotelFlux.PubSub, "habitaciones", {
          :habitacion_actualizada,
          %{id: habitacion.id, numero: habitacion.numero, estado: habitacion.estado, piso: habitacion.piso}
        })

        {:reply, {:ok, %{habitacion: serialize_habitacion(habitacion)}}, socket}

      {:error, reason} ->
        {:reply, {:error, %{error: to_string(reason)}}, socket}
    end
  end

  @impl true
  def handle_in("estadisticas", _params, socket) do
    habitaciones = HabitacionRepo.listar()

    estadisticas = Habitacion.calcular_estadisticas(habitaciones)

    disponibles =
      Pipeline.filtrar(habitaciones, Habitacion.filtrar_por_estado("disponible"))

    {:reply, {:ok, %{
      estadisticas: estadisticas,
      total_disponibles: length(disponibles)
    }}, socket}
  end

  defp maybe_push(%{assigns: %{piso_filtro: filtro}} = socket, %{piso: filtro} = data) do
    push(socket, "habitacion_actualizada", data)
  end

  defp maybe_push(%{assigns: %{piso_filtro: _filtro}}, _data), do: :ok

  defp maybe_push(socket, data), do: push(socket, "habitacion_actualizada", data)

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
