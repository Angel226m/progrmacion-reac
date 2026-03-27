defmodule HotelFluxWeb.QueryController do
  @moduledoc """
  Controller de QUERIES (CQRS — solo lectura).
  Separación explícita de Commands y Queries.
  """
  use Phoenix.Controller

  alias HotelFlux.Adapters.Repos.{
    HabitacionRepo, ReservaRepo, HuespedRepo,
    ProductoRepo, TareaRepo, ConsumoRepo
  }
  alias HotelFlux.Repo
  alias HotelFlux.Domain.Evento

  import Ecto.Query

  # --- Habitaciones ---
  def listar_habitaciones(conn, params) do
    habitaciones = HabitacionRepo.listar(params)
    conn |> json(%{data: Enum.map(habitaciones, &serialize_habitacion/1)})
  end

  def obtener_habitacion(conn, %{"id" => id}) do
    case HabitacionRepo.obtener(id) do
      {:ok, h} -> conn |> json(%{data: serialize_habitacion(h)})
      {:error, _} -> conn |> put_status(404) |> json(%{error: "No encontrada"})
    end
  end

  # --- Reservas ---
  def listar_reservas(conn, params) do
    reservas = ReservaRepo.listar(params)
    conn |> json(%{data: Enum.map(reservas, &serialize_reserva/1)})
  end

  def obtener_reserva(conn, %{"id" => id}) do
    case ReservaRepo.obtener(id) do
      {:ok, r} -> conn |> json(%{data: serialize_reserva(r)})
      {:error, _} -> conn |> put_status(404) |> json(%{error: "No encontrada"})
    end
  end

  # --- Huéspedes ---
  def listar_huespedes(conn, _params) do
    huespedes = HuespedRepo.listar()
    conn |> json(%{data: Enum.map(huespedes, &serialize_huesped/1)})
  end

  def obtener_huesped(conn, %{"id" => id}) do
    case HuespedRepo.obtener(id) do
      {:ok, h} -> conn |> json(%{data: serialize_huesped(h)})
      {:error, _} -> conn |> put_status(404) |> json(%{error: "No encontrado"})
    end
  end

  # --- Productos ---
  def listar_productos(conn, params) do
    productos = ProductoRepo.listar(params)
    conn |> json(%{data: Enum.map(productos, &serialize_producto/1)})
  end

  # --- Tareas ---
  def listar_tareas(conn, _params) do
    tareas = TareaRepo.listar()
    conn |> json(%{data: Enum.map(tareas, &serialize_tarea/1)})
  end

  def tareas_por_empleado(conn, %{"empleado_id" => eid}) do
    tareas = TareaRepo.por_empleado(eid)
    conn |> json(%{data: Enum.map(tareas, &serialize_tarea/1)})
  end

  # --- Consumos ---
  def consumos_por_reserva(conn, %{"reserva_id" => rid}) do
    consumos = ConsumoRepo.por_reserva(rid)
    conn |> json(%{data: Enum.map(consumos, &serialize_consumo/1)})
  end

  # --- Eventos (Event Sourcing) ---
  def listar_eventos(conn, params) do
    limit = Map.get(params, "limit", "50") |> String.to_integer()
    eventos = from(e in Evento, order_by: [desc: e.ocurrido_en], limit: ^limit) |> Repo.all()
    conn |> json(%{data: Enum.map(eventos, &serialize_evento/1)})
  end

  # --- Dashboard Métricas ---
  def metricas_dashboard(conn, _params) do
    habitaciones = HabitacionRepo.contar_por_estado()
    total = habitaciones |> Map.values() |> Enum.sum()
    ocupadas = Map.get(habitaciones, "ocupada", 0)

    conn |> json(%{data: %{
      ocupacion_porcentaje: if(total > 0, do: Float.round(ocupadas / total * 100, 1), else: 0),
      habitaciones_por_estado: habitaciones,
      ingresos_hoy: to_string(ConsumoRepo.ingresos_hoy()),
      promedio_limpieza_min: TareaRepo.promedio_limpieza_24h(),
      top_productos: ProductoRepo.top_vendidos(5)
    }})
  end

  def ocupacion_por_hora(conn, _params) do
    # Simplificado: retorna estado actual
    habitaciones = HabitacionRepo.contar_por_estado()
    conn |> json(%{data: habitaciones})
  end

  def ingresos_del_dia(conn, _params) do
    conn |> json(%{data: %{total: to_string(ConsumoRepo.ingresos_hoy())}})
  end

  def top_productos(conn, _params) do
    conn |> json(%{data: ProductoRepo.top_vendidos(10)})
  end

  # --- Serializers ---
  defp serialize_habitacion(h) do
    %{id: h.id, numero: h.numero, tipo: h.tipo, piso: h.piso,
      capacidad: h.capacidad, precio_noche: to_string(h.precio_noche),
      estado: h.estado, caracteristicas: h.caracteristicas}
  end

  defp serialize_reserva(r) do
    %{id: r.id, huesped_id: r.huesped_id, habitacion_id: r.habitacion_id,
      fecha_entrada: r.fecha_entrada, fecha_salida: r.fecha_salida,
      estado: r.estado, total: r.total && to_string(r.total)}
  end

  defp serialize_huesped(h) do
    %{id: h.id, nombre: h.nombre, apellido: h.apellido, email: h.email,
      telefono: h.telefono, documento: h.documento, nacionalidad: h.nacionalidad}
  end

  defp serialize_producto(p) do
    %{id: p.id, nombre: p.nombre, descripcion: p.descripcion,
      categoria: p.categoria, precio: to_string(p.precio),
      disponible: p.disponible, stock: p.stock}
  end

  defp serialize_tarea(t) do
    %{id: t.id, habitacion_id: t.habitacion_id, empleado_id: t.empleado_id,
      estado: t.estado, duracion_minutos: t.duracion_minutos}
  end

  defp serialize_consumo(c) do
    %{id: c.id, reserva_id: c.reserva_id, producto_id: c.producto_id,
      cantidad: c.cantidad, precio_unitario: to_string(c.precio_unitario),
      total: to_string(c.total), estado: c.estado}
  end

  defp serialize_evento(e) do
    %{id: e.id, tipo: e.tipo, agregado_id: e.agregado_id,
      agregado_tipo: e.agregado_tipo, payload: e.payload,
      ocurrido_en: e.ocurrido_en}
  end
end
