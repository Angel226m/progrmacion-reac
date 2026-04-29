# Script de seeds — Datos completos para HotelFlux
# Ejecutar con: mix run priv/repo/seeds.exs
#
# Credenciales:
#   admin@hotelflux.com     / Admin123!
#   recepcion@hotelflux.com / Recep123!
#   ana@hotelflux.com       / Gerente123!
#   limpieza1@hotelflux.com / Limpieza123!

alias HotelFlux.Repo
alias HotelFlux.Domain.{Usuario, Habitacion, Producto, Huesped, Piso, Turno,
                         HorarioPersonal, Reserva, Consumo, Pago, TareaLimpieza}
import Ecto.Query

IO.puts("Sembrando datos completos de HotelFlux...")

# ============================================= PISOS
pisos_attrs = [
  %{numero: 1, nombre: "Planta Baja",  descripcion: "Habitaciones estándar e interiores",        activo: true},
  %{numero: 2, nombre: "Primer Piso",  descripcion: "Dobles con vista a piscina y jardín",        activo: true},
  %{numero: 3, nombre: "Segundo Piso", descripcion: "Premium con vista al mar y montaña",         activo: true},
  %{numero: 4, nombre: "Ático",        descripcion: "Suites y presidencial — lujo panorámico",    activo: true}
]
Enum.each(pisos_attrs, fn attrs ->
  %Piso{} |> Piso.changeset(attrs) |> Repo.insert!(on_conflict: :nothing, conflict_target: :numero)
end)
IO.puts("  #{length(pisos_attrs)} pisos")

# ============================================= TURNOS
turnos_attrs = [
  %{nombre: "Mañana", hora_inicio: ~T[08:00:00], hora_fin: ~T[16:00:00], activo: true},
  %{nombre: "Tarde",  hora_inicio: ~T[16:00:00], hora_fin: ~T[00:00:00], activo: true},
  %{nombre: "Noche",  hora_inicio: ~T[00:00:00], hora_fin: ~T[08:00:00], activo: true}
]
turnos_creados = Enum.map(turnos_attrs, fn attrs ->
  %Turno{} |> Turno.changeset(attrs) |> Repo.insert!(on_conflict: :nothing)
end)
IO.puts("  #{length(turnos_attrs)} turnos")

# ============================================= USUARIOS
usuarios_attrs = [
  %{nombre: "Carlos Mendoza",   email: "admin@hotelflux.com",       password: "Admin123!",    rol: "admin"},
  %{nombre: "María García",     email: "recepcion@hotelflux.com",   password: "Recep123!",    rol: "recepcionista"},
  %{nombre: "Carlos López",     email: "carlos@hotelflux.com",      password: "Recep123!",    rol: "recepcionista"},
  %{nombre: "Ana Martínez",     email: "ana@hotelflux.com",         password: "Gerente123!",  rol: "gerente"},
  %{nombre: "Juan Pérez",       email: "limpieza1@hotelflux.com",   password: "Limpieza123!", rol: "limpieza"},
  %{nombre: "Rosa Díaz",        email: "rosa@hotelflux.com",        password: "Limpieza123!", rol: "limpieza"},
  %{nombre: "Pedro Sánchez",    email: "pedro@hotelflux.com",       password: "Limpieza123!", rol: "limpieza"},
  %{nombre: "Luis Fernández",   email: "luis@hotelflux.com",        password: "Manten123!",   rol: "mantenimiento"},
  %{nombre: "Sofía Ruiz",       email: "sofia@hotelflux.com",       password: "Recep123!",    rol: "recepcionista"},
  %{nombre: "Miguel Torres",    email: "miguel@hotelflux.com",      password: "Limpieza123!", rol: "limpieza"}
]
usuarios_creados = Enum.map(usuarios_attrs, fn attrs ->
  %Usuario{} |> Usuario.changeset(attrs) |> Repo.insert!(on_conflict: :nothing, conflict_target: :email)
end)
IO.puts("  #{length(usuarios_attrs)} usuarios")

# ============================================= HABITACIONES
habitaciones_attrs = [
  %{numero: "101", tipo: "simple",       piso: 1, capacidad: 1, precio_noche: Decimal.new("80.00"),  caracteristicas: %{"vista" => "interior",      "cama" => "individual"}},
  %{numero: "102", tipo: "simple",       piso: 1, capacidad: 1, precio_noche: Decimal.new("80.00"),  caracteristicas: %{"vista" => "interior",      "cama" => "individual"}},
  %{numero: "103", tipo: "doble",        piso: 1, capacidad: 2, precio_noche: Decimal.new("120.00"), caracteristicas: %{"vista" => "calle",         "cama" => "matrimonial"}},
  %{numero: "104", tipo: "doble",        piso: 1, capacidad: 2, precio_noche: Decimal.new("120.00"), caracteristicas: %{"vista" => "calle",         "cama" => "matrimonial"}},
  %{numero: "105", tipo: "doble",        piso: 1, capacidad: 3, precio_noche: Decimal.new("140.00"), caracteristicas: %{"vista" => "jardín",        "cama" => "matrimonial", "extra" => "sofá cama"}},
  %{numero: "201", tipo: "doble",        piso: 2, capacidad: 2, precio_noche: Decimal.new("130.00"), caracteristicas: %{"vista" => "piscina",       "cama" => "matrimonial"}},
  %{numero: "202", tipo: "doble",        piso: 2, capacidad: 2, precio_noche: Decimal.new("130.00"), caracteristicas: %{"vista" => "piscina",       "cama" => "matrimonial"}},
  %{numero: "203", tipo: "suite",        piso: 2, capacidad: 3, precio_noche: Decimal.new("250.00"), caracteristicas: %{"vista" => "mar",           "cama" => "king",        "jacuzzi" => true, "balcón" => true}},
  %{numero: "204", tipo: "doble",        piso: 2, capacidad: 2, precio_noche: Decimal.new("130.00"), caracteristicas: %{"vista" => "jardín",        "cama" => "matrimonial"}},
  %{numero: "205", tipo: "simple",       piso: 2, capacidad: 1, precio_noche: Decimal.new("90.00"),  caracteristicas: %{"vista" => "calle",         "cama" => "individual"}},
  %{numero: "301", tipo: "doble",        piso: 3, capacidad: 2, precio_noche: Decimal.new("150.00"), caracteristicas: %{"vista" => "mar",           "cama" => "matrimonial", "balcón" => true}},
  %{numero: "302", tipo: "doble",        piso: 3, capacidad: 2, precio_noche: Decimal.new("150.00"), caracteristicas: %{"vista" => "mar",           "cama" => "matrimonial", "balcón" => true}},
  %{numero: "303", tipo: "suite",        piso: 3, capacidad: 4, precio_noche: Decimal.new("300.00"), caracteristicas: %{"vista" => "mar",           "cama" => "king",        "jacuzzi" => true, "sala" => true}},
  %{numero: "304", tipo: "simple",       piso: 3, capacidad: 1, precio_noche: Decimal.new("95.00"),  caracteristicas: %{"vista" => "montaña",       "cama" => "individual"}},
  %{numero: "305", tipo: "doble",        piso: 3, capacidad: 2, precio_noche: Decimal.new("140.00"), caracteristicas: %{"vista" => "montaña",       "cama" => "matrimonial"}},
  %{numero: "401", tipo: "suite",        piso: 4, capacidad: 4, precio_noche: Decimal.new("350.00"), caracteristicas: %{"vista" => "panorámica",    "cama" => "king",        "jacuzzi" => true, "terraza" => true}},
  %{numero: "402", tipo: "presidencial", piso: 4, capacidad: 6, precio_noche: Decimal.new("500.00"), caracteristicas: %{"vista" => "panorámica 360","cama" => "king",        "jacuzzi" => true, "sala" => true, "comedor" => true, "terraza" => true, "cocina" => true}},
  %{numero: "403", tipo: "suite",        piso: 4, capacidad: 3, precio_noche: Decimal.new("320.00"), caracteristicas: %{"vista" => "mar",           "cama" => "king",        "balcón" => true}},
  %{numero: "404", tipo: "doble",        piso: 4, capacidad: 2, precio_noche: Decimal.new("180.00"), caracteristicas: %{"vista" => "mar",           "cama" => "matrimonial", "balcón" => true}},
  %{numero: "405", tipo: "doble",        piso: 4, capacidad: 2, precio_noche: Decimal.new("180.00"), caracteristicas: %{"vista" => "montaña",       "cama" => "matrimonial", "balcón" => true}}
]
Enum.each(habitaciones_attrs, fn attrs ->
  %Habitacion{} |> Habitacion.changeset(attrs) |> Repo.insert!(on_conflict: :nothing, conflict_target: :numero)
end)
IO.puts("  #{length(habitaciones_attrs)} habitaciones")

# ============================================= PRODUCTOS
productos_attrs = [
  %{nombre: "Agua Mineral 500ml",        categoria: "minibar",         precio: Decimal.new("3.00"),  stock: 120},
  %{nombre: "Coca-Cola 355ml",           categoria: "minibar",         precio: Decimal.new("4.00"),  stock: 90},
  %{nombre: "Cerveza Artesanal 330ml",   categoria: "minibar",         precio: Decimal.new("8.00"),  stock: 60},
  %{nombre: "Snack Mix Gourmet",         categoria: "minibar",         precio: Decimal.new("5.00"),  stock: 75},
  %{nombre: "Chocolate Belga Premium",   categoria: "minibar",         precio: Decimal.new("7.00"),  stock: 50},
  %{nombre: "Desayuno Continental",      categoria: "room_service",    precio: Decimal.new("25.00")},
  %{nombre: "Club Sandwich",             categoria: "room_service",    precio: Decimal.new("18.00")},
  %{nombre: "Ensalada César",            categoria: "room_service",    precio: Decimal.new("15.00")},
  %{nombre: "Pasta Alfredo",             categoria: "room_service",    precio: Decimal.new("22.00")},
  %{nombre: "Filete Mignon",             categoria: "room_service",    precio: Decimal.new("45.00")},
  %{nombre: "Masaje Relajante 60min",    categoria: "spa",             precio: Decimal.new("80.00")},
  %{nombre: "Facial Hidratante Premium", categoria: "spa",             precio: Decimal.new("65.00")},
  %{nombre: "Circuito Termal Completo",  categoria: "spa",             precio: Decimal.new("45.00")},
  %{nombre: "Lavado Express 5 prendas",  categoria: "lavanderia",      precio: Decimal.new("20.00")},
  %{nombre: "Planchado Premium",         categoria: "lavanderia",      precio: Decimal.new("15.00")},
  %{nombre: "Tour Islas Ballestas",      categoria: "tour",            precio: Decimal.new("65.00"), descripcion: "Lancha Islas Ballestas. Guía bilingüe."},
  %{nombre: "City Tour Completo",        categoria: "tour",            precio: Decimal.new("40.00"), descripcion: "Atractivos principales de la ciudad."},
  %{nombre: "Tour Gastronómico",         categoria: "tour",            precio: Decimal.new("55.00"), descripcion: "Degustación en restaurantes premium."},
  %{nombre: "Estacionamiento por día",   categoria: "estacionamiento", precio: Decimal.new("15.00")},
  %{nombre: "Valet Parking 24h",         categoria: "estacionamiento", precio: Decimal.new("28.00")}
]
Enum.each(productos_attrs, fn attrs ->
  %Producto{} |> Producto.changeset(attrs) |> Repo.insert!(on_conflict: :nothing)
end)
IO.puts("  #{length(productos_attrs)} productos")

# ============================================= HUÉSPEDES (20 — diversas nacionalidades)
huespedes_attrs = [
  %{nombre: "Roberto",   apellido: "Hernández",  email: "roberto.hernandez@email.com",  telefono: "+51 999 111 222", documento: "12345678", tipo_documento: "DNI",       nacionalidad: "Perú"},
  %{nombre: "Elena",     apellido: "Torres",     email: "elena.torres@email.com",       telefono: "+51 999 333 444", documento: "87654321", tipo_documento: "DNI",       nacionalidad: "Perú"},
  %{nombre: "James",     apellido: "Smith",      email: "james.smith@email.com",        telefono: "+1 555-0123",     documento: "AB123456", tipo_documento: "Pasaporte", nacionalidad: "USA"},
  %{nombre: "Sophie",    apellido: "Müller",     email: "sophie.muller@email.com",      telefono: "+49 151 12345",   documento: "C01234567",tipo_documento: "Pasaporte", nacionalidad: "Alemania"},
  %{nombre: "Lucía",     apellido: "Ramírez",    email: "lucia.ramirez@email.com",      telefono: "+51 999 555 666", documento: "45678912", tipo_documento: "DNI",       nacionalidad: "Perú"},
  %{nombre: "Hiroshi",   apellido: "Tanaka",     email: "hiroshi.tanaka@email.com",     telefono: "+81 90-1234-5678",documento: "JP9876543",tipo_documento: "Pasaporte", nacionalidad: "Japón"},
  %{nombre: "Isabella",  apellido: "Rossi",      email: "isabella.rossi@email.com",     telefono: "+39 333 456 789", documento: "IT7654321",tipo_documento: "Pasaporte", nacionalidad: "Italia"},
  %{nombre: "Alejandro", apellido: "Vega",       email: "alejandro.vega@email.com",     telefono: "+56 9 8765 4321", documento: "CL1234567",tipo_documento: "Pasaporte", nacionalidad: "Chile"},
  %{nombre: "Camille",   apellido: "Dupont",     email: "camille.dupont@email.com",     telefono: "+33 6 12 34 56",  documento: "FR8901234",tipo_documento: "Pasaporte", nacionalidad: "Francia"},
  %{nombre: "Carlos",    apellido: "Gutierrez",  email: "carlos.gutierrez@email.com",   telefono: "+52 55 1234 5678",documento: "MX5678901",tipo_documento: "Pasaporte", nacionalidad: "México"},
  %{nombre: "Valentina", apellido: "Ortiz",      email: "valentina.ortiz@email.com",    telefono: "+57 310 555 0001",documento: "CO2345678",tipo_documento: "Cédula",    nacionalidad: "Colombia"},
  %{nombre: "Fatima",    apellido: "Al-Rashid",  email: "fatima.alrashid@email.com",    telefono: "+971 50 123 4567",documento: "AE3456789",tipo_documento: "Pasaporte", nacionalidad: "Emiratos"},
  %{nombre: "Lucas",     apellido: "Oliveira",   email: "lucas.oliveira@email.com",     telefono: "+55 11 9 8765-4321",documento: "BR4567890",tipo_documento: "Pasaporte",nacionalidad: "Brasil"},
  %{nombre: "Priya",     apellido: "Sharma",     email: "priya.sharma@email.com",       telefono: "+91 98765 43210", documento: "IN5678901",tipo_documento: "Pasaporte", nacionalidad: "India"},
  %{nombre: "Emma",      apellido: "Johnson",    email: "emma.johnson@email.com",       telefono: "+44 7700 900123", documento: "UK6789012",tipo_documento: "Pasaporte", nacionalidad: "Reino Unido"},
  %{nombre: "Diego",     apellido: "Morales",    email: "diego.morales@email.com",      telefono: "+54 9 11 2345-6789",documento: "AR7890123",tipo_documento: "Pasaporte",nacionalidad: "Argentina"},
  %{nombre: "Yuki",      apellido: "Watanabe",   email: "yuki.watanabe@email.com",      telefono: "+81 80-5678-9012",documento: "JP8901234",tipo_documento: "Pasaporte", nacionalidad: "Japón"},
  %{nombre: "Ana",       apellido: "Flores",     email: "ana.flores@email.com",         telefono: "+51 998 765 432", documento: "98765432", tipo_documento: "DNI",       nacionalidad: "Perú"},
  %{nombre: "Mateo",     apellido: "Vargas",     email: "mateo.vargas@email.com",       telefono: "+593 99 123 4567",documento: "EC9012345",tipo_documento: "Pasaporte", nacionalidad: "Ecuador"},
  %{nombre: "Sarah",     apellido: "Williams",   email: "sarah.williams@email.com",     telefono: "+1 212-555-0199", documento: "US0123456",tipo_documento: "Pasaporte", nacionalidad: "USA"}
]
huespedes_creados = Enum.map(huespedes_attrs, fn attrs ->
  %Huesped{} |> Huesped.changeset(attrs) |> Repo.insert!(on_conflict: :nothing, conflict_target: :email)
end)
IO.puts("  #{length(huespedes_attrs)} huéspedes")

# ============================================= RESERVAS (~60 — últimos 6 meses)
habitaciones_db = Repo.all(Habitacion)
hab_map = Map.new(habitaciones_db, fn h -> {h.numero, h.id} end)
hoy = Date.utc_today()

# {hab_num, precio_noche}
habitaciones_precios = [
  {"101", "80.00"},  {"102", "80.00"},  {"103", "120.00"}, {"104", "120.00"},
  {"105", "140.00"}, {"201", "130.00"}, {"202", "130.00"}, {"203", "250.00"},
  {"204", "130.00"}, {"205", "90.00"},  {"301", "150.00"}, {"302", "150.00"},
  {"303", "300.00"}, {"304", "95.00"},  {"305", "140.00"}, {"401", "350.00"},
  {"402", "500.00"}, {"403", "320.00"}, {"404", "180.00"}, {"405", "180.00"}
]

metodos_pago_list = ["tarjeta", "efectivo", "tarjeta", "transferencia", "tarjeta"]

notas_pool = [
  "Cliente VIP — atención preferente", "Turista internacional, primera visita",
  "Luna de miel — decoración especial", "Viaje de negocios corporativo",
  "Familia con niños", "Cliente frecuente — tarifa preferencial",
  "Reserva de último momento", "Grupo — celebración especial",
  "Aniversario de bodas", "Congreso internacional", nil, nil
]

# {base_offset, dia_rel, noches, hab_idx, hue_idx}
reservas_spec = [
  # Oct (-180)
  {-180,  0, 3,  0,  0}, {-180,  4, 2,  3,  1}, {-180,  8, 4, 11,  2},
  {-180, 12, 2,  5,  3}, {-180, 16, 3,  7,  4}, {-180, 20, 2, 13,  5},
  {-180, 24, 3,  1,  6},
  # Nov (-150)
  {-150,  1, 3, 15,  7}, {-150,  4, 2,  2,  8}, {-150,  7, 4,  9,  9},
  {-150, 10, 2, 17, 10}, {-150, 13, 3,  4, 11}, {-150, 16, 5, 16, 12},
  {-150, 19, 2,  6, 13}, {-150, 22, 3, 18, 14}, {-150, 25, 2,  8, 15},
  # Dic (-120) — alta temporada
  {-120,  0, 4, 16,  0}, {-120,  3, 3, 19,  1}, {-120,  6, 5,  3,  2},
  {-120,  9, 4, 14,  3}, {-120, 12, 3,  0,  4}, {-120, 15, 5,  7,  5},
  {-120, 18, 4, 10,  6}, {-120, 21, 3, 15,  7}, {-120, 24, 4, 12,  8},
  {-120, 27, 6,  1,  9}, {-120, 28, 3,  5, 10}, {-120, 29, 5, 17, 11},
  # Ene (-90) — alta temporada
  {-90,  0, 4, 13,  0}, {-90,  3, 3,  2,  1}, {-90,  6, 5,  8,  2},
  {-90,  9, 2, 18,  3}, {-90, 12, 4,  4,  4}, {-90, 15, 3, 11,  5},
  {-90, 18, 4,  6,  6}, {-90, 21, 5,  9,  7}, {-90, 24, 3, 16,  8},
  {-90, 27, 4,  0, 19}, {-90, 28, 2, 14, 18},
  # Feb (-60)
  {-60,  1, 3, 19,  0}, {-60,  4, 4,  3,  1}, {-60,  7, 3, 10,  2},
  {-60, 10, 2,  7,  3}, {-60, 13, 5, 15,  4}, {-60, 16, 3,  2,  5},
  {-60, 19, 4, 12,  6}, {-60, 22, 2,  5,  7}, {-60, 25, 3,  8, 17},
  {-60, 28, 4, 17, 16},
  # Mar (-30)
  {-30,  0, 3,  1,  0}, {-30,  3, 4,  9,  1}, {-30,  6, 2, 13,  2},
  {-30,  9, 5, 16,  3}, {-30, 12, 3,  4,  4}, {-30, 15, 4,  6,  5},
  {-30, 18, 3, 18,  6}, {-30, 22, 2, 11,  7}, {-30, 26, 4,  0, 15},
  # Abr (mes actual)
  {-8,   0, 3, 14, 18}, {-5,   0, 2,  3, 19}, {-3,   0, 4,  7,  0},
  {-1,   0, 3,  5,  1}, { 2,   0, 4, 15,  2}
]

reservas_creadas =
  Enum.with_index(reservas_spec, fn {base, dia, noches, hab_idx, hue_idx}, i ->
    offset = if dia == 0 and base < -8, do: base, else: base + dia
    fecha_entrada = Date.add(hoy, offset)
    fecha_salida  = Date.add(fecha_entrada, noches)
    {hab_num, precio_str} = Enum.at(habitaciones_precios, rem(hab_idx, 20))
    precio_noche  = Decimal.new(precio_str)
    total         = Decimal.mult(precio_noche, noches)
    hue_id        = Enum.at(huespedes_creados, rem(hue_idx, 20)).id
    hab_id        = hab_map[hab_num]
    nota          = Enum.at(notas_pool, rem(i, length(notas_pool)))

    estado =
      cond do
        Date.compare(fecha_salida,  hoy) == :lt -> "checked_out"
        Date.compare(fecha_entrada, hoy) == :lt -> "checked_in"
        Date.compare(fecha_entrada, hoy) == :eq -> "checked_in"
        true                                    -> "confirmada"
      end

    %Reserva{}
    |> Reserva.changeset(%{
      huesped_id:    hue_id,
      habitacion_id: hab_id,
      fecha_entrada: fecha_entrada,
      fecha_salida:  fecha_salida,
      estado:        estado,
      total:         total,
      notas:         nota
    })
    |> Repo.insert!()
  end)

IO.puts("  #{length(reservas_creadas)} reservas")

# ============================================= CONSUMOS
productos_db = Repo.all(Producto)

prod_precios =
  Enum.map(productos_db, fn p ->
    {p.id, p.precio, p.categoria}
  end)

consumos_creados =
  reservas_creadas
  |> Enum.filter(fn r -> r.estado in ["checked_out", "checked_in"] end)
  |> Enum.flat_map(fn reserva ->
    # 2-3 consumos por reserva — índice determinista
    idx_base = :erlang.phash2(reserva.id, 20)
    n = if rem(idx_base, 3) == 0, do: 3, else: 2
    Enum.map(0..(n - 1), fn offset ->
      {prod_id, precio, _cat} = Enum.at(prod_precios, rem(idx_base + offset * 7, length(prod_precios)))
      cantidad = rem(idx_base + offset, 3) + 1
      total    = Decimal.mult(precio, cantidad)
      %Consumo{}
      |> Consumo.changeset(%{
        reserva_id:      reserva.id,
        producto_id:     prod_id,
        cantidad:        cantidad,
        precio_unitario: precio,
        total:           total
      })
      |> Repo.insert!()
    end)
  end)

IO.puts("  #{length(consumos_creados)} consumos")

# ============================================= PAGOS (reservas completadas)
reservas_pagadas = Enum.filter(reservas_creadas, fn r -> r.estado == "checked_out" end)

pagos_creados =
  Enum.with_index(reservas_pagadas, fn reserva, i ->
    metodo  = Enum.at(metodos_pago_list, rem(i, length(metodos_pago_list)))
    ref     = "PAY-#{String.pad_leading(to_string(1000 + i), 4, "0")}-HF"
    %Pago{}
    |> Pago.changeset(%{
      reserva_id: reserva.id,
      monto:      reserva.total,
      metodo:     metodo,
      estado:     "completado",
      referencia: ref
    })
    |> Repo.insert!()
  end)

IO.puts("  #{length(pagos_creados)} pagos")

# ============================================= TAREAS DE LIMPIEZA (30)
empleados_limpieza = Repo.all(from u in Usuario, where: u.rol in ["limpieza"], select: u.id)

tareas_spec = [
  {"101", 0, "completada", 22, -7200}, {"102", 1, "completada", 28, -5400},
  {"103", 2, "completada", 30, -3600}, {"104", 0, "completada", 25, -9000},
  {"105", 1, "completada", 35, -7200}, {"201", 2, "completada", 32, -4500},
  {"202", 0, "completada", 28, -3600}, {"203", 1, "completada", 55, -1800},
  {"204", 2, "completada", 30, -2700}, {"205", 0, "completada", 20, -5400},
  {"301", 1, "completada", 40, -7200}, {"302", 2, "completada", 38, -6300},
  {"303", 0, "completada", 65, -9000}, {"304", 1, "completada", 25, -4500},
  {"305", 2, "completada", 35, -3600}, {"401", 0, "completada", 70, -3600},
  {"402", 1, "completada", 90, -1800}, {"403", 2, "completada", 68, -2700},
  {"404", 0, "completada", 40, -5400}, {"405", 1, "completada", 38, -7200},
  {"101", 2, "en_proceso", nil, nil},  {"103", 0, "en_proceso", nil, nil},
  {"201", 1, "en_proceso", nil, nil},  {"302", 2, "en_proceso", nil, nil},
  {"401", 0, "pendiente",  nil, nil},  {"103", 1, "pendiente",  nil, nil},
  {"204", 2, "pendiente",  nil, nil},  {"303", 0, "pendiente",  nil, nil},
  {"404", 1, "pendiente",  nil, nil},  {"405", 2, "pendiente",  nil, nil}
]

tareas_creadas = Enum.map(tareas_spec, fn {num, emp_idx, estado, dur, offset} ->
  completada_en = if offset, do: DateTime.add(DateTime.utc_now(), offset, :second), else: nil
  emp_id        = Enum.at(empleados_limpieza, rem(emp_idx, max(1, length(empleados_limpieza))))
  %TareaLimpieza{}
  |> TareaLimpieza.changeset(%{
    habitacion_id:    hab_map[num],
    empleado_id:      emp_id,
    estado:           estado,
    duracion_minutos: dur,
    completada_en:    completada_en
  })
  |> Repo.insert!()
end)
IO.puts("  #{length(tareas_creadas)} tareas de limpieza")

# ============================================= HORARIOS (4 semanas × empleados)
[turno_manana, turno_tarde, turno_noche] = Enum.take(turnos_creados, 3)
inicio_semana = Date.add(hoy, -(Date.day_of_week(hoy) - 1))

horarios_creados =
  for semana <- 0..3,
      dia    <- 0..6,
      {emp_id, turno} <- [
        {Enum.at(empleados_limpieza, 0), turno_manana},
        {Enum.at(empleados_limpieza, 1), turno_tarde},
        {Enum.at(empleados_limpieza, 2), turno_noche}
      ] do
    fecha  = Date.add(inicio_semana, -(semana * 7) + dia)
    estado = if semana > 0 or Date.compare(fecha, hoy) == :lt, do: "asistio", else: "programado"
    %HorarioPersonal{}
    |> HorarioPersonal.changeset(%{
      empleado_id: emp_id,
      turno_id:    turno.id,
      fecha:       fecha,
      estado:      estado
    })
    |> Repo.insert!(on_conflict: :nothing)
  end

IO.puts("  #{length(horarios_creados)} horarios")

# ============================================= RESUMEN
total_r = Repo.aggregate(Reserva, :count, :id)
total_p = Repo.aggregate(Pago, :count, :id)
total_c = Repo.aggregate(Consumo, :count, :id)

IO.puts("")
IO.puts(String.duplicate("=", 56))
IO.puts("  HotelFlux — Seeds completados exitosamente")
IO.puts(String.duplicate("=", 56))
IO.puts("  admin@hotelflux.com       / Admin123!")
IO.puts("  recepcion@hotelflux.com   / Recep123!")
IO.puts("  ana@hotelflux.com         / Gerente123!")
IO.puts("  limpieza1@hotelflux.com   / Limpieza123!")
IO.puts(String.duplicate("-", 56))
IO.puts("  Habitaciones: #{length(habitaciones_attrs)} | Productos: #{length(productos_attrs)} | Huéspedes: #{length(huespedes_attrs)}")
IO.puts("  Reservas BD: #{total_r} | Pagos: #{total_p} | Consumos: #{total_c}")
IO.puts("  Tareas: #{length(tareas_creadas)} | Horarios: #{length(horarios_creados)}")
IO.puts(String.duplicate("=", 56))
