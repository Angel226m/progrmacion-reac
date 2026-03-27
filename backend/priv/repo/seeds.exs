# Script de seeds — Datos iniciales para HotelFlux
# Ejecutar con: mix run priv/repo/seeds.exs
#
# Credenciales de demo:
#   admin@hotelflux.com / Admin123!
#   recepcion@hotelflux.com / Recep123!
#   ana@hotelflux.com / Gerente123!
#   limpieza1@hotelflux.com / Limpieza123!
#
# Todas las contraseñas cumplen OWASP: 8+ chars, mayúscula, número, caracter especial.

alias HotelFlux.Repo
alias HotelFlux.Domain.{Usuario, Habitacion, Producto, Huesped, Piso, Turno, HorarioPersonal}

IO.puts("🏨 Sembrando datos iniciales de HotelFlux...")

# =============================================
# PISOS
# =============================================
pisos = [
  %{numero: 1, nombre: "Planta Baja", descripcion: "Habitaciones estándar e interiores", activo: true},
  %{numero: 2, nombre: "Primer Piso", descripcion: "Dobles con vista a piscina y jardín", activo: true},
  %{numero: 3, nombre: "Segundo Piso", descripcion: "Premium con vista al mar y montaña", activo: true},
  %{numero: 4, nombre: "Ático", descripcion: "Suites y presidencial — lujo panorámico", activo: true}
]

Enum.each(pisos, fn attrs ->
  %Piso{}
  |> Piso.changeset(attrs)
  |> Repo.insert!(on_conflict: :nothing, conflict_target: :numero)
end)
IO.puts("✅ #{length(pisos)} pisos creados")

# =============================================
# TURNOS DE TRABAJO
# =============================================
turnos = [
  %{nombre: "Mañana", hora_inicio: ~T[08:00:00], hora_fin: ~T[16:00:00], activo: true},
  %{nombre: "Tarde", hora_inicio: ~T[16:00:00], hora_fin: ~T[00:00:00], activo: true},
  %{nombre: "Noche", hora_inicio: ~T[00:00:00], hora_fin: ~T[08:00:00], activo: true}
]

turnos_creados = Enum.map(turnos, fn attrs ->
  %Turno{}
  |> Turno.changeset(attrs)
  |> Repo.insert!(on_conflict: :nothing)
end)
IO.puts("✅ #{length(turnos)} turnos creados")

# =============================================
# USUARIOS (contraseñas seguras OWASP)
# =============================================
usuarios = [
  %{nombre: "Admin Principal", email: "admin@hotelflux.com", password: "Admin123!", rol: "admin"},
  %{nombre: "María García", email: "recepcion@hotelflux.com", password: "Recep123!", rol: "recepcionista"},
  %{nombre: "Carlos López", email: "carlos@hotelflux.com", password: "Recep123!", rol: "recepcionista"},
  %{nombre: "Ana Martínez", email: "ana@hotelflux.com", password: "Gerente123!", rol: "gerente"},
  %{nombre: "Juan Pérez", email: "limpieza1@hotelflux.com", password: "Limpieza123!", rol: "limpieza"},
  %{nombre: "Rosa Díaz", email: "rosa@hotelflux.com", password: "Limpieza123!", rol: "limpieza"},
  %{nombre: "Pedro Sánchez", email: "pedro@hotelflux.com", password: "Limpieza123!", rol: "limpieza"},
  %{nombre: "Luis Fernández", email: "luis@hotelflux.com", password: "Manten123!", rol: "mantenimiento"},
  %{nombre: "Sofia Ruiz", email: "sofia@hotelflux.com", password: "Recep123!", rol: "recepcionista"},
  %{nombre: "Miguel Torres", email: "miguel@hotelflux.com", password: "Limpieza123!", rol: "limpieza"}
]

usuarios_creados = Enum.map(usuarios, fn attrs ->
  %Usuario{}
  |> Usuario.changeset(attrs)
  |> Repo.insert!(on_conflict: :nothing, conflict_target: :email)
end)
IO.puts("✅ #{length(usuarios)} usuarios creados")

# =============================================
# HABITACIONES (4 pisos, 5 por piso = 20 habitaciones)
# =============================================
habitaciones = [
  # Piso 1 — Simples
  %{numero: "101", tipo: "simple", piso: 1, capacidad: 1, precio_noche: Decimal.new("80.00"),
    caracteristicas: %{"vista" => "interior", "cama" => "individual"}},
  %{numero: "102", tipo: "simple", piso: 1, capacidad: 1, precio_noche: Decimal.new("80.00"),
    caracteristicas: %{"vista" => "interior", "cama" => "individual"}},
  %{numero: "103", tipo: "doble", piso: 1, capacidad: 2, precio_noche: Decimal.new("120.00"),
    caracteristicas: %{"vista" => "calle", "cama" => "matrimonial"}},
  %{numero: "104", tipo: "doble", piso: 1, capacidad: 2, precio_noche: Decimal.new("120.00"),
    caracteristicas: %{"vista" => "calle", "cama" => "matrimonial"}},
  %{numero: "105", tipo: "doble", piso: 1, capacidad: 3, precio_noche: Decimal.new("140.00"),
    caracteristicas: %{"vista" => "jardín", "cama" => "matrimonial", "extra" => "sofá cama"}},
  # Piso 2 — Dobles y Suite
  %{numero: "201", tipo: "doble", piso: 2, capacidad: 2, precio_noche: Decimal.new("130.00"),
    caracteristicas: %{"vista" => "piscina", "cama" => "matrimonial"}},
  %{numero: "202", tipo: "doble", piso: 2, capacidad: 2, precio_noche: Decimal.new("130.00"),
    caracteristicas: %{"vista" => "piscina", "cama" => "matrimonial"}},
  %{numero: "203", tipo: "suite", piso: 2, capacidad: 3, precio_noche: Decimal.new("250.00"),
    caracteristicas: %{"vista" => "mar", "cama" => "king", "jacuzzi" => true, "balcón" => true}},
  %{numero: "204", tipo: "doble", piso: 2, capacidad: 2, precio_noche: Decimal.new("130.00"),
    caracteristicas: %{"vista" => "jardín", "cama" => "matrimonial"}},
  %{numero: "205", tipo: "simple", piso: 2, capacidad: 1, precio_noche: Decimal.new("90.00"),
    caracteristicas: %{"vista" => "calle", "cama" => "individual"}},
  # Piso 3 — Mixto
  %{numero: "301", tipo: "doble", piso: 3, capacidad: 2, precio_noche: Decimal.new("150.00"),
    caracteristicas: %{"vista" => "mar", "cama" => "matrimonial", "balcón" => true}},
  %{numero: "302", tipo: "doble", piso: 3, capacidad: 2, precio_noche: Decimal.new("150.00"),
    caracteristicas: %{"vista" => "mar", "cama" => "matrimonial", "balcón" => true}},
  %{numero: "303", tipo: "suite", piso: 3, capacidad: 4, precio_noche: Decimal.new("300.00"),
    caracteristicas: %{"vista" => "mar", "cama" => "king", "jacuzzi" => true, "sala" => true}},
  %{numero: "304", tipo: "simple", piso: 3, capacidad: 1, precio_noche: Decimal.new("95.00"),
    caracteristicas: %{"vista" => "montaña", "cama" => "individual"}},
  %{numero: "305", tipo: "doble", piso: 3, capacidad: 2, precio_noche: Decimal.new("140.00"),
    caracteristicas: %{"vista" => "montaña", "cama" => "matrimonial"}},
  # Piso 4 — Premium
  %{numero: "401", tipo: "suite", piso: 4, capacidad: 4, precio_noche: Decimal.new("350.00"),
    caracteristicas: %{"vista" => "panorámica", "cama" => "king", "jacuzzi" => true, "terraza" => true}},
  %{numero: "402", tipo: "presidencial", piso: 4, capacidad: 6, precio_noche: Decimal.new("500.00"),
    caracteristicas: %{"vista" => "panorámica 360", "cama" => "king", "jacuzzi" => true,
      "sala" => true, "comedor" => true, "terraza" => true, "cocina" => true}},
  %{numero: "403", tipo: "suite", piso: 4, capacidad: 3, precio_noche: Decimal.new("320.00"),
    caracteristicas: %{"vista" => "mar", "cama" => "king", "balcón" => true}},
  %{numero: "404", tipo: "doble", piso: 4, capacidad: 2, precio_noche: Decimal.new("180.00"),
    caracteristicas: %{"vista" => "mar", "cama" => "matrimonial", "balcón" => true}},
  %{numero: "405", tipo: "doble", piso: 4, capacidad: 2, precio_noche: Decimal.new("180.00"),
    caracteristicas: %{"vista" => "montaña", "cama" => "matrimonial", "balcón" => true}}
]

Enum.each(habitaciones, fn attrs ->
  %Habitacion{}
  |> Habitacion.changeset(attrs)
  |> Repo.insert!(on_conflict: :nothing, conflict_target: :numero)
end)
IO.puts("✅ #{length(habitaciones)} habitaciones creadas")

# =============================================
# PRODUCTOS
# =============================================
productos = [
  # Minibar
  %{nombre: "Agua Mineral", categoria: "minibar", precio: Decimal.new("3.00"), stock: 100},
  %{nombre: "Coca-Cola", categoria: "minibar", precio: Decimal.new("4.00"), stock: 80},
  %{nombre: "Cerveza Artesanal", categoria: "minibar", precio: Decimal.new("8.00"), stock: 50},
  %{nombre: "Snack Mix", categoria: "minibar", precio: Decimal.new("5.00"), stock: 60},
  %{nombre: "Chocolate Premium", categoria: "minibar", precio: Decimal.new("6.00"), stock: 40},
  # Room Service
  %{nombre: "Desayuno Continental", categoria: "room_service", precio: Decimal.new("25.00")},
  %{nombre: "Club Sandwich", categoria: "room_service", precio: Decimal.new("18.00")},
  %{nombre: "Ensalada César", categoria: "room_service", precio: Decimal.new("15.00")},
  %{nombre: "Pasta Alfredo", categoria: "room_service", precio: Decimal.new("22.00")},
  %{nombre: "Filete Mignon", categoria: "room_service", precio: Decimal.new("45.00")},
  # Spa
  %{nombre: "Masaje Relajante 60min", categoria: "spa", precio: Decimal.new("80.00")},
  %{nombre: "Facial Hidratante", categoria: "spa", precio: Decimal.new("60.00")},
  %{nombre: "Circuito de Aguas", categoria: "spa", precio: Decimal.new("40.00")},
  # Lavandería
  %{nombre: "Lavado Express (5 prendas)", categoria: "lavanderia", precio: Decimal.new("20.00")},
  %{nombre: "Planchado Premium", categoria: "lavanderia", precio: Decimal.new("15.00")},
  # Tours
  %{nombre: "Tour Islas Ballestas", categoria: "tour", precio: Decimal.new("65.00"),
    descripcion: "Paseo en lancha por las Islas Ballestas. Incluye guía bilingüe."},
  %{nombre: "City Tour Completo", categoria: "tour", precio: Decimal.new("40.00"),
    descripcion: "Recorrido por los principales atractivos de la ciudad."},
  %{nombre: "Tour Gastronómico", categoria: "tour", precio: Decimal.new("55.00"),
    descripcion: "Degustación de platos típicos en restaurantes locales."},
  # Estacionamiento
  %{nombre: "Estacionamiento por día", categoria: "estacionamiento", precio: Decimal.new("15.00")},
  %{nombre: "Valet Parking", categoria: "estacionamiento", precio: Decimal.new("25.00")}
]

Enum.each(productos, fn attrs ->
  %Producto{}
  |> Producto.changeset(attrs)
  |> Repo.insert!(on_conflict: :nothing)
end)
IO.puts("✅ #{length(productos)} productos creados")

# =============================================
# HUÉSPEDES DE EJEMPLO
# =============================================
huespedes = [
  %{nombre: "Roberto", apellido: "Hernández", email: "roberto@email.com",
    telefono: "+51 999111222", documento: "12345678", tipo_documento: "DNI", nacionalidad: "Perú"},
  %{nombre: "Elena", apellido: "Torres", email: "elena@email.com",
    telefono: "+51 999333444", documento: "87654321", tipo_documento: "DNI", nacionalidad: "Perú"},
  %{nombre: "James", apellido: "Smith", email: "james@email.com",
    telefono: "+1 555-0123", documento: "AB123456", tipo_documento: "Pasaporte", nacionalidad: "USA"},
  %{nombre: "Sophie", apellido: "Müller", email: "sophie@email.com",
    telefono: "+49 151 12345", documento: "C01234567", tipo_documento: "Pasaporte", nacionalidad: "Alemania"},
  %{nombre: "Lucía", apellido: "Ramírez", email: "lucia@email.com",
    telefono: "+51 999555666", documento: "45678912", tipo_documento: "DNI", nacionalidad: "Perú"}
]

huespedes_creados = Enum.map(huespedes, fn attrs ->
  %Huesped{}
  |> Huesped.changeset(attrs)
  |> Repo.insert!(on_conflict: :nothing, conflict_target: :email)
end)
IO.puts("✅ #{length(huespedes)} huéspedes creados")

# =============================================
# RESERVAS DE DEMO (para dashboard analítico)
# =============================================
alias HotelFlux.Domain.{Reserva, Consumo, Pago, TareaLimpieza}

# Obtener IDs reales
habitaciones_db = Repo.all(Habitacion)
hab_map = Map.new(habitaciones_db, fn h -> {h.numero, h.id} end)
huesped_ids = Enum.map(huespedes_creados, & &1.id)
empleados_limpieza = Repo.all(from u in Usuario, where: u.rol == "limpieza", select: u.id)

hoy = Date.utc_today()

reservas_demo = [
  %{huesped_id: Enum.at(huesped_ids, 0), habitacion_id: hab_map["101"],
    fecha_entrada: Date.add(hoy, -5), fecha_salida: Date.add(hoy, -2),
    estado: "checked_out", total: Decimal.new("240.00"), notas: "Estancia sin incidentes"},
  %{huesped_id: Enum.at(huesped_ids, 1), habitacion_id: hab_map["203"],
    fecha_entrada: Date.add(hoy, -3), fecha_salida: Date.add(hoy, 1),
    estado: "checked_in", total: Decimal.new("1000.00"), notas: "Suite premium — cliente VIP"},
  %{huesped_id: Enum.at(huesped_ids, 2), habitacion_id: hab_map["301"],
    fecha_entrada: hoy, fecha_salida: Date.add(hoy, 3),
    estado: "confirmada", total: Decimal.new("450.00"), notas: "Turista internacional"},
  %{huesped_id: Enum.at(huesped_ids, 3), habitacion_id: hab_map["402"],
    fecha_entrada: Date.add(hoy, 1), fecha_salida: Date.add(hoy, 5),
    estado: "confirmada", total: Decimal.new("2000.00"), notas: "Suite presidencial reservada"},
  %{huesped_id: Enum.at(huesped_ids, 4), habitacion_id: hab_map["102"],
    fecha_entrada: Date.add(hoy, -1), fecha_salida: Date.add(hoy, 2),
    estado: "checked_in", total: Decimal.new("240.00"), notas: "Cliente frecuente"},
  # Reservas pasadas para datos de analítica
  %{huesped_id: Enum.at(huesped_ids, 0), habitacion_id: hab_map["201"],
    fecha_entrada: Date.add(hoy, -15), fecha_salida: Date.add(hoy, -12),
    estado: "checked_out", total: Decimal.new("390.00"), notas: "Completada"},
  %{huesped_id: Enum.at(huesped_ids, 1), habitacion_id: hab_map["303"],
    fecha_entrada: Date.add(hoy, -20), fecha_salida: Date.add(hoy, -17),
    estado: "checked_out", total: Decimal.new("900.00"), notas: "Suite completada"},
  %{huesped_id: Enum.at(huesped_ids, 2), habitacion_id: hab_map["104"],
    fecha_entrada: Date.add(hoy, -10), fecha_salida: Date.add(hoy, -8),
    estado: "cancelada", total: Decimal.new("0.00"), notas: "Cancelada por el huésped"}
]

reservas_creadas = Enum.map(reservas_demo, fn attrs ->
  %Reserva{}
  |> Reserva.changeset(attrs)
  |> Repo.insert!()
end)
IO.puts("✅ #{length(reservas_creadas)} reservas de demo creadas")

# =============================================
# CONSUMOS DE DEMO (para analíticas de productos)
# =============================================
productos_db = Repo.all(Producto)
prod_map = Map.new(productos_db, fn p -> {p.nombre, p} end)

reserva_activa_1 = Enum.at(reservas_creadas, 1) # checked_in
reserva_activa_2 = Enum.at(reservas_creadas, 4) # checked_in

consumos_demo = [
  %{reserva_id: reserva_activa_1.id, producto_id: prod_map["Desayuno Continental"].id,
    cantidad: 2, precio_unitario: Decimal.new("25.00"), total: Decimal.new("50.00")},
  %{reserva_id: reserva_activa_1.id, producto_id: prod_map["Cerveza Artesanal"].id,
    cantidad: 3, precio_unitario: Decimal.new("8.00"), total: Decimal.new("24.00")},
  %{reserva_id: reserva_activa_1.id, producto_id: prod_map["Masaje Relajante 60min"].id,
    cantidad: 1, precio_unitario: Decimal.new("80.00"), total: Decimal.new("80.00")},
  %{reserva_id: reserva_activa_2.id, producto_id: prod_map["Club Sandwich"].id,
    cantidad: 1, precio_unitario: Decimal.new("18.00"), total: Decimal.new("18.00")},
  %{reserva_id: reserva_activa_2.id, producto_id: prod_map["Agua Mineral"].id,
    cantidad: 4, precio_unitario: Decimal.new("3.00"), total: Decimal.new("12.00")},
  %{reserva_id: reserva_activa_2.id, producto_id: prod_map["Coca-Cola"].id,
    cantidad: 2, precio_unitario: Decimal.new("4.00"), total: Decimal.new("8.00")}
]

Enum.each(consumos_demo, fn attrs ->
  %Consumo{}
  |> Consumo.changeset(attrs)
  |> Repo.insert!()
end)
IO.puts("✅ #{length(consumos_demo)} consumos de demo creados")

# =============================================
# PAGOS DE DEMO
# =============================================
reserva_completada = Enum.at(reservas_creadas, 0) # checked_out

pagos_demo = [
  %{reserva_id: reserva_completada.id, monto: Decimal.new("240.00"),
    metodo: "tarjeta", estado: "completado", referencia: "PAY-001-DEMO"},
  %{reserva_id: Enum.at(reservas_creadas, 5).id, monto: Decimal.new("390.00"),
    metodo: "efectivo", estado: "completado", referencia: "PAY-002-DEMO"},
  %{reserva_id: Enum.at(reservas_creadas, 6).id, monto: Decimal.new("900.00"),
    metodo: "tarjeta", estado: "completado", referencia: "PAY-003-DEMO"}
]

Enum.each(pagos_demo, fn attrs ->
  %Pago{}
  |> Pago.changeset(attrs)
  |> Repo.insert!()
end)
IO.puts("✅ #{length(pagos_demo)} pagos de demo creados")

# =============================================
# TAREAS DE LIMPIEZA DE DEMO
# =============================================
tareas_demo = [
  %{habitacion_id: hab_map["101"], empleado_id: Enum.at(empleados_limpieza, 0),
    estado: "completada", duracion_minutos: 25,
    completada_en: DateTime.add(DateTime.utc_now(), -3600, :second)},
  %{habitacion_id: hab_map["201"], empleado_id: Enum.at(empleados_limpieza, 1),
    estado: "completada", duracion_minutos: 35,
    completada_en: DateTime.add(DateTime.utc_now(), -7200, :second)},
  %{habitacion_id: hab_map["301"], empleado_id: Enum.at(empleados_limpieza, 0),
    estado: "pendiente", duracion_minutos: nil, completada_en: nil},
  %{habitacion_id: hab_map["401"], empleado_id: Enum.at(empleados_limpieza, 2),
    estado: "en_proceso", duracion_minutos: nil, completada_en: nil}
]

Enum.each(tareas_demo, fn attrs ->
  %TareaLimpieza{}
  |> TareaLimpieza.changeset(attrs)
  |> Repo.insert!()
end)
IO.puts("✅ #{length(tareas_demo)} tareas de limpieza de demo creadas")

# =============================================
# HORARIOS DE DEMO (semana actual)
# =============================================
turno_manana = Enum.at(turnos_creados, 0)
turno_tarde = Enum.at(turnos_creados, 1)
turno_noche = Enum.at(turnos_creados, 2)

# Lunes de esta semana
inicio_semana = Date.add(hoy, -(Date.day_of_week(hoy) - 1))

horarios_demo =
  for dia <- 0..6, {emp_id, turno} <- [
    {Enum.at(empleados_limpieza, 0), turno_manana},
    {Enum.at(empleados_limpieza, 1), turno_tarde},
    {Enum.at(empleados_limpieza, 2), turno_noche}
  ] do
    fecha = Date.add(inicio_semana, dia)
    %{
      empleado_id: emp_id,
      turno_id: turno.id,
      fecha: fecha,
      estado: if(Date.compare(fecha, hoy) == :lt, do: "asistio", else: "programado")
    }
  end

Enum.each(horarios_demo, fn attrs ->
  %HorarioPersonal{}
  |> HorarioPersonal.changeset(attrs)
  |> Repo.insert!(on_conflict: :nothing)
end)
IO.puts("✅ #{length(horarios_demo)} horarios de demo creados")

# =============================================
# RESUMEN FINAL
# =============================================
IO.puts("\n🎉 Seeds completados exitosamente!")
IO.puts("=" |> String.duplicate(50))
IO.puts("📧 Login admin:      admin@hotelflux.com / Admin123!")
IO.puts("📧 Login recepción:   recepcion@hotelflux.com / Recep123!")
IO.puts("📧 Login gerente:     ana@hotelflux.com / Gerente123!")
IO.puts("📧 Login limpieza:    limpieza1@hotelflux.com / Limpieza123!")
IO.puts("=" |> String.duplicate(50))
IO.puts("🏠 #{length(pisos)} pisos | 🛏️ #{length(habitaciones)} habitaciones")
IO.puts("👥 #{length(usuarios)} usuarios | ⏰ #{length(turnos)} turnos")
IO.puts("📦 #{length(productos)} productos | 🧳 #{length(huespedes)} huéspedes")
IO.puts("📋 #{length(reservas_demo)} reservas | 🧹 #{length(tareas_demo)} tareas")
IO.puts("💰 #{length(pagos_demo)} pagos | 🛒 #{length(consumos_demo)} consumos")
