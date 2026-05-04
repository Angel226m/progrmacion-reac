# Script de seeds — Datos completos para HotelFlux
# Ejecutar con: mix run priv/repo/seeds.exs
#
# Credenciales:
#   admin@hotelflux.com       / Admin123!
#   recepcion@hotelflux.com   / Recepcion123!
#   ana@hotelflux.com         / Gerente123!
#   limpieza1@hotelflux.com   / Limpieza123!

alias HotelFlux.Repo
alias HotelFlux.Domain.{Usuario, Habitacion, Producto, Huesped, Piso, Turno,
                         HorarioPersonal, Reserva, Consumo, Pago, TareaLimpieza}
import Ecto.Query

# Guard: no sembrar si ya hay datos para evitar duplicados
if Repo.aggregate(Reserva, :count, :id) > 0 do
  IO.puts("Seeds ya ejecutados — omitiendo.")
  System.halt(0)
end

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

# ============================================= USUARIOS (15)
usuarios_attrs = [
  %{nombre: "Carlos Mendoza",      email: "admin@hotelflux.com",         password: "Admin123!",      rol: "admin"},
  %{nombre: "María García",        email: "recepcion@hotelflux.com",     password: "Recepcion123!",  rol: "recepcionista"},
  %{nombre: "Carlos López",        email: "carlos@hotelflux.com",        password: "Recepcion123!",  rol: "recepcionista"},
  %{nombre: "Ana Martínez",        email: "ana@hotelflux.com",           password: "Gerente123!",    rol: "gerente"},
  %{nombre: "Juan Pérez",          email: "limpieza1@hotelflux.com",     password: "Limpieza123!",   rol: "limpieza"},
  %{nombre: "Rosa Díaz",           email: "rosa@hotelflux.com",          password: "Limpieza123!",   rol: "limpieza"},
  %{nombre: "Pedro Sánchez",       email: "pedro@hotelflux.com",         password: "Limpieza123!",   rol: "limpieza"},
  %{nombre: "Luis Fernández",      email: "luis@hotelflux.com",          password: "Manten123!",     rol: "mantenimiento"},
  %{nombre: "Sofía Ruiz",          email: "sofia@hotelflux.com",         password: "Recepcion123!",  rol: "recepcionista"},
  %{nombre: "Miguel Torres",       email: "miguel@hotelflux.com",        password: "Limpieza123!",   rol: "limpieza"},
  %{nombre: "Patricia Vargas",     email: "patricia@hotelflux.com",      password: "Recepcion123!",  rol: "recepcionista"},
  %{nombre: "José Ramírez",        email: "jose@hotelflux.com",          password: "Limpieza123!",   rol: "limpieza"},
  %{nombre: "Carmen Castillo",     email: "carmen@hotelflux.com",        password: "Limpieza123!",   rol: "limpieza"},
  %{nombre: "Roberto Silva",       email: "roberto.staff@hotelflux.com", password: "Manten123!",     rol: "mantenimiento"},
  %{nombre: "Diana Morales",       email: "diana@hotelflux.com",         password: "Gerente123!",    rol: "gerente"}
]
usuarios_creados = Enum.map(usuarios_attrs, fn attrs ->
  %Usuario{} |> Usuario.changeset(attrs) |> Repo.insert!(on_conflict: :nothing, conflict_target: :email)
end)
IO.puts("  #{length(usuarios_attrs)} usuarios")

# ============================================= HABITACIONES
habitaciones_attrs = [
  # Piso 1 — Estándar
  %{numero: "101", tipo: "simple",       piso: 1, capacidad: 1, precio_noche: Decimal.new("80.00"),  clasificacion: "estandar",  caracteristicas: %{"vista" => "interior",      "cama" => "individual",   "piso" => "1", "m2" => "18"}},
  %{numero: "102", tipo: "simple",       piso: 1, capacidad: 1, precio_noche: Decimal.new("80.00"),  clasificacion: "estandar",  caracteristicas: %{"vista" => "interior",      "cama" => "individual",   "piso" => "1", "m2" => "18"}},
  %{numero: "103", tipo: "doble",        piso: 1, capacidad: 2, precio_noche: Decimal.new("120.00"), clasificacion: "superior",  caracteristicas: %{"vista" => "calle",         "cama" => "matrimonial",  "piso" => "1", "m2" => "26", "aire_acond" => true}},
  %{numero: "104", tipo: "doble",        piso: 1, capacidad: 2, precio_noche: Decimal.new("120.00"), clasificacion: "superior",  caracteristicas: %{"vista" => "calle",         "cama" => "matrimonial",  "piso" => "1", "m2" => "26", "aire_acond" => true}},
  %{numero: "105", tipo: "doble",        piso: 1, capacidad: 3, precio_noche: Decimal.new("140.00"), clasificacion: "superior",  caracteristicas: %{"vista" => "jardín",        "cama" => "matrimonial",  "piso" => "1", "m2" => "30", "extra" => "sofá cama", "minibar" => true}},
  # Piso 2 — Superior
  %{numero: "201", tipo: "doble",        piso: 2, capacidad: 2, precio_noche: Decimal.new("130.00"), clasificacion: "superior",  caracteristicas: %{"vista" => "piscina",       "cama" => "matrimonial",  "piso" => "2", "m2" => "28", "balcon" => true}},
  %{numero: "202", tipo: "doble",        piso: 2, capacidad: 2, precio_noche: Decimal.new("130.00"), clasificacion: "superior",  caracteristicas: %{"vista" => "piscina",       "cama" => "matrimonial",  "piso" => "2", "m2" => "28", "balcon" => true}},
  %{numero: "203", tipo: "suite",        piso: 2, capacidad: 3, precio_noche: Decimal.new("250.00"), clasificacion: "premium",   caracteristicas: %{"vista" => "mar",           "cama" => "king",         "piso" => "2", "m2" => "55", "jacuzzi" => true, "balcon" => true, "sala" => true}},
  %{numero: "204", tipo: "doble",        piso: 2, capacidad: 2, precio_noche: Decimal.new("130.00"), clasificacion: "superior",  caracteristicas: %{"vista" => "jardín",        "cama" => "matrimonial",  "piso" => "2", "m2" => "28"}},
  %{numero: "205", tipo: "simple",       piso: 2, capacidad: 1, precio_noche: Decimal.new("90.00"),  clasificacion: "estandar",  caracteristicas: %{"vista" => "calle",         "cama" => "individual",   "piso" => "2", "m2" => "20"}},
  # Piso 3 — Premium
  %{numero: "301", tipo: "doble",        piso: 3, capacidad: 2, precio_noche: Decimal.new("150.00"), clasificacion: "premium",   caracteristicas: %{"vista" => "mar",           "cama" => "matrimonial",  "piso" => "3", "m2" => "32", "balcon" => true, "minibar" => true}},
  %{numero: "302", tipo: "doble",        piso: 3, capacidad: 2, precio_noche: Decimal.new("150.00"), clasificacion: "premium",   caracteristicas: %{"vista" => "mar",           "cama" => "matrimonial",  "piso" => "3", "m2" => "32", "balcon" => true, "minibar" => true}},
  %{numero: "303", tipo: "suite",        piso: 3, capacidad: 4, precio_noche: Decimal.new("300.00"), clasificacion: "premium",   caracteristicas: %{"vista" => "mar",           "cama" => "king",         "piso" => "3", "m2" => "70", "jacuzzi" => true, "sala" => true, "terraza" => true}},
  %{numero: "304", tipo: "simple",       piso: 3, capacidad: 1, precio_noche: Decimal.new("95.00"),  clasificacion: "superior",  caracteristicas: %{"vista" => "montaña",       "cama" => "individual",   "piso" => "3", "m2" => "22"}},
  %{numero: "305", tipo: "doble",        piso: 3, capacidad: 2, precio_noche: Decimal.new("140.00"), clasificacion: "superior",  caracteristicas: %{"vista" => "montaña",       "cama" => "matrimonial",  "piso" => "3", "m2" => "28", "minibar" => true}},
  # Piso 4 — Exclusivo / Ático
  %{numero: "401", tipo: "suite",        piso: 4, capacidad: 4, precio_noche: Decimal.new("350.00"), clasificacion: "exclusivo", caracteristicas: %{"vista" => "panorámica",    "cama" => "king",         "piso" => "4", "m2" => "85", "jacuzzi" => true, "terraza" => true, "sala" => true, "butler" => true}},
  %{numero: "402", tipo: "presidencial", piso: 4, capacidad: 6, precio_noche: Decimal.new("500.00"), clasificacion: "exclusivo", caracteristicas: %{"vista" => "panorámica 360","cama" => "king",         "piso" => "4", "m2" => "150","jacuzzi" => true, "sala" => true, "comedor" => true, "terraza" => true, "cocina" => true, "butler" => true, "bano_marmol" => true}},
  %{numero: "403", tipo: "suite",        piso: 4, capacidad: 3, precio_noche: Decimal.new("320.00"), clasificacion: "exclusivo", caracteristicas: %{"vista" => "mar",           "cama" => "king",         "piso" => "4", "m2" => "75", "balcon" => true, "jacuzzi" => true, "sala" => true}},
  %{numero: "404", tipo: "doble",        piso: 4, capacidad: 2, precio_noche: Decimal.new("180.00"), clasificacion: "premium",   caracteristicas: %{"vista" => "mar",           "cama" => "matrimonial",  "piso" => "4", "m2" => "38", "balcon" => true, "minibar" => true}},
  %{numero: "405", tipo: "doble",        piso: 4, capacidad: 2, precio_noche: Decimal.new("180.00"), clasificacion: "premium",   caracteristicas: %{"vista" => "montaña",       "cama" => "matrimonial",  "piso" => "4", "m2" => "38", "balcon" => true, "minibar" => true}}
]
Enum.each(habitaciones_attrs, fn attrs ->
  %Habitacion{} |> Habitacion.changeset(attrs) |> Repo.insert!(on_conflict: :nothing, conflict_target: :numero)
end)
IO.puts("  #{length(habitaciones_attrs)} habitaciones")

# ============================================= PRODUCTOS (55)
productos_attrs = [
  # Minibar
  %{nombre: "Agua Mineral 500ml",            categoria: "minibar",         precio: Decimal.new("3.00"),   stock: 300},
  %{nombre: "Agua con Gas 500ml",             categoria: "minibar",         precio: Decimal.new("3.50"),   stock: 200},
  %{nombre: "Coca-Cola 355ml",                categoria: "minibar",         precio: Decimal.new("4.00"),   stock: 180},
  %{nombre: "Gaseosa Inca Kola 355ml",        categoria: "minibar",         precio: Decimal.new("4.00"),   stock: 150},
  %{nombre: "Jugo de Naranja Natural",        categoria: "minibar",         precio: Decimal.new("6.00"),   stock: 100},
  %{nombre: "Jugo de Maracuyá Natural",       categoria: "minibar",         precio: Decimal.new("6.00"),   stock: 80},
  %{nombre: "Cerveza Artesanal 330ml",        categoria: "minibar",         precio: Decimal.new("8.00"),   stock: 120},
  %{nombre: "Vino Blanco Chardonnay",         categoria: "minibar",         precio: Decimal.new("28.00"),  stock: 50},
  %{nombre: "Vino Tinto Malbec Premium",      categoria: "minibar",         precio: Decimal.new("32.00"),  stock: 45},
  %{nombre: "Champagne Brut 200ml",           categoria: "minibar",         precio: Decimal.new("45.00"),  stock: 30},
  %{nombre: "Snack Mix Gourmet",              categoria: "minibar",         precio: Decimal.new("5.00"),   stock: 150},
  %{nombre: "Chocolate Belga Premium",        categoria: "minibar",         precio: Decimal.new("7.00"),   stock: 100},
  %{nombre: "Maní Tostado Premium",           categoria: "minibar",         precio: Decimal.new("4.50"),   stock: 120},
  %{nombre: "Almendras con Sal",              categoria: "minibar",         precio: Decimal.new("5.50"),   stock: 90},
  %{nombre: "Pisco Sour Listo 200ml",         categoria: "minibar",         precio: Decimal.new("18.00"),  stock: 40},
  # Room Service
  %{nombre: "Desayuno Continental",           categoria: "room_service",    precio: Decimal.new("25.00")},
  %{nombre: "Desayuno Americano Completo",    categoria: "room_service",    precio: Decimal.new("35.00")},
  %{nombre: "Desayuno Buffet Premium",        categoria: "room_service",    precio: Decimal.new("45.00")},
  %{nombre: "Club Sandwich Clásico",          categoria: "room_service",    precio: Decimal.new("18.00")},
  %{nombre: "Hamburguesa Gourmet",            categoria: "room_service",    precio: Decimal.new("22.00")},
  %{nombre: "Ensalada César con Pollo",       categoria: "room_service",    precio: Decimal.new("16.00")},
  %{nombre: "Ensalada Caprese Premium",       categoria: "room_service",    precio: Decimal.new("14.00")},
  %{nombre: "Pasta Alfredo Trufada",          categoria: "room_service",    precio: Decimal.new("24.00")},
  %{nombre: "Pasta al Pesto con Mariscos",    categoria: "room_service",    precio: Decimal.new("28.00")},
  %{nombre: "Filete Mignon 200g",             categoria: "room_service",    precio: Decimal.new("45.00")},
  %{nombre: "Salmón a la Plancha",            categoria: "room_service",    precio: Decimal.new("38.00")},
  %{nombre: "Ceviche Premium",                categoria: "room_service",    precio: Decimal.new("28.00"), descripcion: "Ceviche limeño con leche de tigre y cancha."},
  %{nombre: "Lomo Saltado Clásico",           categoria: "room_service",    precio: Decimal.new("32.00"), descripcion: "Plato bandera peruano con arroz y papas."},
  %{nombre: "Tabla de Quesos y Embutidos",    categoria: "room_service",    precio: Decimal.new("30.00")},
  %{nombre: "Postre del Chef",                categoria: "room_service",    precio: Decimal.new("12.00")},
  %{nombre: "Tiramisú Artesanal",             categoria: "room_service",    precio: Decimal.new("14.00")},
  # Spa
  %{nombre: "Masaje Relajante 60min",         categoria: "spa",             precio: Decimal.new("80.00")},
  %{nombre: "Masaje Deportivo 45min",         categoria: "spa",             precio: Decimal.new("70.00")},
  %{nombre: "Masaje de Piedras Calientes",    categoria: "spa",             precio: Decimal.new("95.00")},
  %{nombre: "Masaje de Pareja 60min",         categoria: "spa",             precio: Decimal.new("150.00")},
  %{nombre: "Facial Hidratante Premium",      categoria: "spa",             precio: Decimal.new("65.00")},
  %{nombre: "Facial Antiedad Caviar",         categoria: "spa",             precio: Decimal.new("85.00")},
  %{nombre: "Circuito Termal Completo",       categoria: "spa",             precio: Decimal.new("45.00")},
  %{nombre: "Manicure & Pedicure Premium",    categoria: "spa",             precio: Decimal.new("55.00")},
  %{nombre: "Aromaterapia 30min",             categoria: "spa",             precio: Decimal.new("40.00")},
  # Lavandería
  %{nombre: "Lavado Express 5 prendas",       categoria: "lavanderia",      precio: Decimal.new("20.00")},
  %{nombre: "Planchado Premium — paquete",    categoria: "lavanderia",      precio: Decimal.new("15.00")},
  %{nombre: "Lavado Completo Maleta",         categoria: "lavanderia",      precio: Decimal.new("40.00"), descripcion: "Lavado completo de hasta 8 prendas en 6h."},
  %{nombre: "Limpieza en Seco Traje",         categoria: "lavanderia",      precio: Decimal.new("35.00")},
  # Tours & Actividades
  %{nombre: "Tour Islas Ballestas",           categoria: "tour",            precio: Decimal.new("65.00"), descripcion: "Lancha Islas Ballestas. Guía bilingüe incluido."},
  %{nombre: "City Tour Completo",             categoria: "tour",            precio: Decimal.new("40.00"), descripcion: "Atractivos principales + almuerzo típico."},
  %{nombre: "Tour Gastronómico Premium",      categoria: "tour",            precio: Decimal.new("75.00"), descripcion: "Degustación en 5 restaurantes top de la ciudad."},
  %{nombre: "Tour Aventura Sandboard",        categoria: "tour",            precio: Decimal.new("55.00"), descripcion: "Sandboard y dunas — incluye traslado y equipo."},
  %{nombre: "Tour Privado Personalizado",     categoria: "tour",            precio: Decimal.new("120.00"),descripcion: "Guía privado bilingüe — destino a elección."},
  %{nombre: "Tour Canotaje en Río",           categoria: "tour",            precio: Decimal.new("60.00"), descripcion: "Canotaje nivel 3 con instructores certificados."},
  %{nombre: "Tour Vuelo en Parapente",        categoria: "tour",            precio: Decimal.new("90.00"), descripcion: "Vuelo en tándem sobre la bahía — fotos incluidas."},
  # Estacionamiento & Otros
  %{nombre: "Estacionamiento por día",        categoria: "estacionamiento", precio: Decimal.new("15.00")},
  %{nombre: "Valet Parking 24h",              categoria: "estacionamiento", precio: Decimal.new("28.00")},
  %{nombre: "Alquiler de Bicicleta",          categoria: "otro",            precio: Decimal.new("20.00"), descripcion: "Bicicleta eléctrica por día."},
  %{nombre: "Transfer Aeropuerto (ida)",      categoria: "otro",            precio: Decimal.new("35.00"), descripcion: "Traslado privado al aeropuerto."},
  %{nombre: "Decoración Especial Habitación", categoria: "otro",            precio: Decimal.new("80.00"), descripcion: "Flores, globos, pétalos y velas para ocasiones especiales."}
]
Enum.each(productos_attrs, fn attrs ->
  %Producto{} |> Producto.changeset(attrs) |> Repo.insert!(on_conflict: :nothing)
end)
IO.puts("  #{length(productos_attrs)} productos")

# ============================================= HUÉSPEDES (120 — diversas nacionalidades)
huespedes_attrs = [
  # Perú (25)
  %{nombre: "Roberto",    apellido: "Hernández",    email: "roberto.hernandez@email.com",   telefono: "+51 999 111 222",    documento: "12345678", tipo_documento: "DNI",       nacionalidad: "Perú"},
  %{nombre: "Elena",      apellido: "Torres",       email: "elena.torres@email.com",        telefono: "+51 999 333 444",    documento: "87654321", tipo_documento: "DNI",       nacionalidad: "Perú"},
  %{nombre: "Lucía",      apellido: "Ramírez",      email: "lucia.ramirez@email.com",       telefono: "+51 999 555 666",    documento: "45678912", tipo_documento: "DNI",       nacionalidad: "Perú"},
  %{nombre: "Ana",        apellido: "Flores",       email: "ana.flores@email.com",          telefono: "+51 998 765 432",    documento: "98765432", tipo_documento: "DNI",       nacionalidad: "Perú"},
  %{nombre: "Jorge",      apellido: "Quispe",       email: "jorge.quispe@email.com",        telefono: "+51 997 123 456",    documento: "23456789", tipo_documento: "DNI",       nacionalidad: "Perú"},
  %{nombre: "Carmen",     apellido: "Chávez",       email: "carmen.chavez@email.com",       telefono: "+51 996 234 567",    documento: "34567890", tipo_documento: "DNI",       nacionalidad: "Perú"},
  %{nombre: "Pablo",      apellido: "Mendoza",      email: "pablo.mendoza@email.com",       telefono: "+51 995 345 678",    documento: "56789012", tipo_documento: "DNI",       nacionalidad: "Perú"},
  %{nombre: "Verónica",   apellido: "Salinas",      email: "veronica.salinas@email.com",    telefono: "+51 994 456 789",    documento: "67890123", tipo_documento: "DNI",       nacionalidad: "Perú"},
  %{nombre: "Ricardo",    apellido: "Huanca",       email: "ricardo.huanca@email.com",      telefono: "+51 993 567 890",    documento: "78901234", tipo_documento: "DNI",       nacionalidad: "Perú"},
  %{nombre: "Sandra",     apellido: "Puma",         email: "sandra.puma@email.com",         telefono: "+51 992 678 901",    documento: "89012345", tipo_documento: "DNI",       nacionalidad: "Perú"},
  %{nombre: "César",      apellido: "Apaza",        email: "cesar.apaza@email.com",         telefono: "+51 991 789 012",    documento: "90123456", tipo_documento: "DNI",       nacionalidad: "Perú"},
  %{nombre: "Patricia",   apellido: "Vilca",        email: "patricia.vilca@email.com",      telefono: "+51 990 890 123",    documento: "01234567", tipo_documento: "DNI",       nacionalidad: "Perú"},
  %{nombre: "Eduardo",    apellido: "Mamani",       email: "eduardo.mamani@email.com",      telefono: "+51 989 901 234",    documento: "11234567", tipo_documento: "DNI",       nacionalidad: "Perú"},
  %{nombre: "Milagros",   apellido: "Ticona",       email: "milagros.ticona@email.com",     telefono: "+51 988 012 345",    documento: "22345678", tipo_documento: "DNI",       nacionalidad: "Perú"},
  %{nombre: "Gustavo",    apellido: "Ccoa",         email: "gustavo.ccoa@email.com",        telefono: "+51 987 123 456",    documento: "33456789", tipo_documento: "DNI",       nacionalidad: "Perú"},
  %{nombre: "Roxana",     apellido: "Zuñiga",       email: "roxana.zuniga@email.com",       telefono: "+51 986 234 567",    documento: "44567890", tipo_documento: "DNI",       nacionalidad: "Perú"},
  %{nombre: "Fernando",   apellido: "Condori",      email: "fernando.condori@email.com",    telefono: "+51 985 345 678",    documento: "55678901", tipo_documento: "DNI",       nacionalidad: "Perú"},
  %{nombre: "Ingrid",     apellido: "Hancco",       email: "ingrid.hancco@email.com",       telefono: "+51 984 456 789",    documento: "66789012", tipo_documento: "DNI",       nacionalidad: "Perú"},
  %{nombre: "Álvaro",     apellido: "Pari",         email: "alvaro.pari@email.com",         telefono: "+51 983 567 890",    documento: "77890123", tipo_documento: "DNI",       nacionalidad: "Perú"},
  %{nombre: "Nadia",      apellido: "Cusi",         email: "nadia.cusi@email.com",          telefono: "+51 982 678 901",    documento: "88901234", tipo_documento: "DNI",       nacionalidad: "Perú"},
  %{nombre: "Marisol",    apellido: "Quispe",       email: "marisol.quispe2@email.com",     telefono: "+51 981 789 012",    documento: "99012345", tipo_documento: "DNI",       nacionalidad: "Perú"},
  %{nombre: "Héctor",     apellido: "Mamani",       email: "hector.mamani@email.com",       telefono: "+51 980 890 123",    documento: "10123456", tipo_documento: "DNI",       nacionalidad: "Perú"},
  %{nombre: "Yesenia",    apellido: "Llerena",      email: "yesenia.llerena@email.com",     telefono: "+51 979 901 234",    documento: "20234567", tipo_documento: "DNI",       nacionalidad: "Perú"},
  %{nombre: "Andrea",     apellido: "Paredes",      email: "andrea.paredes@email.com",      telefono: "+51 976 543 210",    documento: "50567890", tipo_documento: "DNI",       nacionalidad: "Perú"},
  %{nombre: "Luz",        apellido: "Coaquira",     email: "luz.coaquira@email.com",        telefono: "+51 977 123 456",    documento: "40456789", tipo_documento: "DNI",       nacionalidad: "Perú"},
  # USA (10)
  %{nombre: "James",      apellido: "Smith",        email: "james.smith@email.com",         telefono: "+1 555-0123",        documento: "AB123456", tipo_documento: "Pasaporte", nacionalidad: "USA"},
  %{nombre: "Sarah",      apellido: "Williams",     email: "sarah.williams@email.com",      telefono: "+1 212-555-0199",    documento: "US012345", tipo_documento: "Pasaporte", nacionalidad: "USA"},
  %{nombre: "Michael",    apellido: "Johnson",      email: "michael.johnson@email.com",     telefono: "+1 312-555-0101",    documento: "US123456", tipo_documento: "Pasaporte", nacionalidad: "USA"},
  %{nombre: "Ashley",     apellido: "Brown",        email: "ashley.brown@email.com",        telefono: "+1 404-555-0102",    documento: "US234567", tipo_documento: "Pasaporte", nacionalidad: "USA"},
  %{nombre: "Robert",     apellido: "Davis",        email: "robert.davis@email.com",        telefono: "+1 617-555-0103",    documento: "US345678", tipo_documento: "Pasaporte", nacionalidad: "USA"},
  %{nombre: "Jennifer",   apellido: "Wilson",       email: "jennifer.wilson@email.com",     telefono: "+1 713-555-0104",    documento: "US456789", tipo_documento: "Pasaporte", nacionalidad: "USA"},
  %{nombre: "David",      apellido: "Moore",        email: "david.moore@email.com",         telefono: "+1 206-555-0105",    documento: "US567890", tipo_documento: "Pasaporte", nacionalidad: "USA"},
  %{nombre: "Lisa",       apellido: "Taylor",       email: "lisa.taylor@email.com",         telefono: "+1 305-555-0106",    documento: "US678901", tipo_documento: "Pasaporte", nacionalidad: "USA"},
  %{nombre: "Christopher",apellido: "Anderson",     email: "chris.anderson@email.com",      telefono: "+1 503-555-0107",    documento: "US789012", tipo_documento: "Pasaporte", nacionalidad: "USA"},
  %{nombre: "Emma",       apellido: "Jackson",      email: "emma.jackson.us@email.com",     telefono: "+1 702-555-0108",    documento: "US890123", tipo_documento: "Pasaporte", nacionalidad: "USA"},
  # Europa (20)
  %{nombre: "Sophie",     apellido: "Müller",       email: "sophie.muller@email.com",       telefono: "+49 151 12345",      documento: "DE012345", tipo_documento: "Pasaporte", nacionalidad: "Alemania"},
  %{nombre: "Hans",       apellido: "Becker",       email: "hans.becker@email.com",         telefono: "+49 171 23456",      documento: "DE123456", tipo_documento: "Pasaporte", nacionalidad: "Alemania"},
  %{nombre: "Isabella",   apellido: "Rossi",        email: "isabella.rossi@email.com",      telefono: "+39 333 456 789",    documento: "IT123456", tipo_documento: "Pasaporte", nacionalidad: "Italia"},
  %{nombre: "Giulia",     apellido: "Bianchi",      email: "giulia.bianchi@email.com",      telefono: "+39 348 901 2345",   documento: "IT234567", tipo_documento: "Pasaporte", nacionalidad: "Italia"},
  %{nombre: "Camille",    apellido: "Dupont",       email: "camille.dupont@email.com",      telefono: "+33 6 12 34 56",     documento: "FR012345", tipo_documento: "Pasaporte", nacionalidad: "Francia"},
  %{nombre: "Pierre",     apellido: "Martin",       email: "pierre.martin@email.com",       telefono: "+33 6 23 45 67",     documento: "FR123456", tipo_documento: "Pasaporte", nacionalidad: "Francia"},
  %{nombre: "María",      apellido: "González",     email: "maria.gonzalez2@email.com",     telefono: "+34 612 345 678",    documento: "ES012345", tipo_documento: "Pasaporte", nacionalidad: "España"},
  %{nombre: "Carlos",     apellido: "García",       email: "carlos.garcia.es@email.com",    telefono: "+34 623 456 789",    documento: "ES123456", tipo_documento: "Pasaporte", nacionalidad: "España"},
  %{nombre: "Emma",       apellido: "Johnson",      email: "emma.johnson.uk@email.com",     telefono: "+44 7700 900123",    documento: "UK012345", tipo_documento: "Pasaporte", nacionalidad: "Reino Unido"},
  %{nombre: "Oliver",     apellido: "Smith",        email: "oliver.smith.uk@email.com",     telefono: "+44 7800 123456",    documento: "UK123456", tipo_documento: "Pasaporte", nacionalidad: "Reino Unido"},
  %{nombre: "Kevin",      apellido: "O'Brien",      email: "kevin.obrien@email.com",        telefono: "+353 87 345 6789",   documento: "IE012345", tipo_documento: "Pasaporte", nacionalidad: "Irlanda"},
  %{nombre: "Bruno",      apellido: "Ferreira",     email: "bruno.ferreira@email.com",      telefono: "+351 912 345 678",   documento: "PT012345", tipo_documento: "Pasaporte", nacionalidad: "Portugal"},
  %{nombre: "Natalia",    apellido: "Petrov",       email: "natalia.petrov@email.com",      telefono: "+7 916 567 8901",    documento: "RU012345", tipo_documento: "Pasaporte", nacionalidad: "Rusia"},
  %{nombre: "Erik",       apellido: "Svensson",     email: "erik.svensson@email.com",       telefono: "+46 70 234 5678",    documento: "SE012345", tipo_documento: "Pasaporte", nacionalidad: "Suecia"},
  %{nombre: "Lena",       apellido: "Jansen",       email: "lena.jansen@email.com",         telefono: "+31 6 12345678",     documento: "NL012345", tipo_documento: "Pasaporte", nacionalidad: "Países Bajos"},
  %{nombre: "Marek",      apellido: "Nowak",        email: "marek.nowak@email.com",         telefono: "+48 501 234 567",    documento: "PL012345", tipo_documento: "Pasaporte", nacionalidad: "Polonia"},
  %{nombre: "Dimitra",    apellido: "Papadopoulou", email: "dimitra.papa@email.com",         telefono: "+30 694 123 4567",   documento: "GR012345", tipo_documento: "Pasaporte", nacionalidad: "Grecia"},
  %{nombre: "Ingrid",     apellido: "Hansen",       email: "ingrid.hansen@email.com",       telefono: "+47 912 34 567",     documento: "NO012345", tipo_documento: "Pasaporte", nacionalidad: "Noruega"},
  %{nombre: "Mattias",    apellido: "Korhonen",     email: "mattias.korhonen@email.com",    telefono: "+358 40 123 4567",   documento: "FI012345", tipo_documento: "Pasaporte", nacionalidad: "Finlandia"},
  %{nombre: "Miroslav",   apellido: "Novák",        email: "miroslav.novak@email.com",      telefono: "+420 601 234 567",   documento: "CZ012345", tipo_documento: "Pasaporte", nacionalidad: "República Checa"},
  # Latinoamérica (20)
  %{nombre: "Alejandro",  apellido: "Vega",         email: "alejandro.vega@email.com",      telefono: "+56 9 8765 4321",    documento: "CL012345", tipo_documento: "Pasaporte", nacionalidad: "Chile"},
  %{nombre: "Valentina",  apellido: "Ortiz",        email: "valentina.ortiz@email.com",     telefono: "+57 310 555 0001",   documento: "CO012345", tipo_documento: "Cédula",    nacionalidad: "Colombia"},
  %{nombre: "Lucas",      apellido: "Oliveira",     email: "lucas.oliveira@email.com",      telefono: "+55 11 9 8765-4321", documento: "BR012345", tipo_documento: "Pasaporte", nacionalidad: "Brasil"},
  %{nombre: "Fernanda",   apellido: "Santos",       email: "fernanda.santos@email.com",     telefono: "+55 21 9 1234-5678", documento: "BR123456", tipo_documento: "Pasaporte", nacionalidad: "Brasil"},
  %{nombre: "Diego",      apellido: "Morales",      email: "diego.morales@email.com",       telefono: "+54 9 11 2345-6789", documento: "AR012345", tipo_documento: "Pasaporte", nacionalidad: "Argentina"},
  %{nombre: "Martina",    apellido: "López",        email: "martina.lopez.ar@email.com",    telefono: "+54 9 11 3456-7890", documento: "AR123456", tipo_documento: "Pasaporte", nacionalidad: "Argentina"},
  %{nombre: "Carlos",     apellido: "Gutierrez",    email: "carlos.gutierrez@email.com",    telefono: "+52 55 1234 5678",   documento: "MX012345", tipo_documento: "Pasaporte", nacionalidad: "México"},
  %{nombre: "Sofía",      apellido: "Reyes",        email: "sofia.reyes.mx@email.com",      telefono: "+52 55 2345 6789",   documento: "MX123456", tipo_documento: "Pasaporte", nacionalidad: "México"},
  %{nombre: "Andrés",     apellido: "Castillo",     email: "andres.castillo@email.com",     telefono: "+58 414 123 4567",   documento: "VE012345", tipo_documento: "Cédula",    nacionalidad: "Venezuela"},
  %{nombre: "Mateo",      apellido: "Vargas",       email: "mateo.vargas@email.com",        telefono: "+593 99 123 4567",   documento: "EC012345", tipo_documento: "Pasaporte", nacionalidad: "Ecuador"},
  %{nombre: "Daniela",    apellido: "Cruz",         email: "daniela.cruz.co@email.com",     telefono: "+57 311 234 5678",   documento: "CO123456", tipo_documento: "Cédula",    nacionalidad: "Colombia"},
  %{nombre: "Sebastián",  apellido: "Rojas",        email: "sebastian.rojas@email.com",     telefono: "+56 9 7654 3210",    documento: "CL123456", tipo_documento: "Pasaporte", nacionalidad: "Chile"},
  %{nombre: "Camila",     apellido: "Rodríguez",    email: "camila.rodriguez@email.com",    telefono: "+52 55 3456 7890",   documento: "MX234567", tipo_documento: "Pasaporte", nacionalidad: "México"},
  %{nombre: "Marco",      apellido: "Espinoza",     email: "marco.espinoza@email.com",      telefono: "+593 98 234 5678",   documento: "EC123456", tipo_documento: "Pasaporte", nacionalidad: "Ecuador"},
  %{nombre: "Valeria",    apellido: "Fuentes",      email: "valeria.fuentes@email.com",     telefono: "+56 9 6543 2109",    documento: "CL234567", tipo_documento: "Pasaporte", nacionalidad: "Chile"},
  %{nombre: "Juan",       apellido: "Alvarado",     email: "juan.alvarado.bo@email.com",    telefono: "+591 71 234 567",    documento: "BO012345", tipo_documento: "Pasaporte", nacionalidad: "Bolivia"},
  %{nombre: "Estrella",   apellido: "Medina",       email: "estrella.medina@email.com",     telefono: "+595 981 234 567",   documento: "PY012345", tipo_documento: "Pasaporte", nacionalidad: "Paraguay"},
  %{nombre: "Graciela",   apellido: "Benítez",      email: "graciela.benitez@email.com",    telefono: "+598 99 123 4567",   documento: "UY012345", tipo_documento: "Pasaporte", nacionalidad: "Uruguay"},
  %{nombre: "Tomás",      apellido: "Acevedo",      email: "tomas.acevedo@email.com",       telefono: "+56 9 5432 1098",    documento: "CL345678", tipo_documento: "Pasaporte", nacionalidad: "Chile"},
  %{nombre: "Graciela",   apellido: "Flores",       email: "graciela.flores.pe@email.com",  telefono: "+51 975 432 109",    documento: "60456789", tipo_documento: "DNI",       nacionalidad: "Perú"},
  # Asia & Medio Oriente (15)
  %{nombre: "Hiroshi",    apellido: "Tanaka",       email: "hiroshi.tanaka@email.com",      telefono: "+81 90-1234-5678",   documento: "JP012345", tipo_documento: "Pasaporte", nacionalidad: "Japón"},
  %{nombre: "Yuki",       apellido: "Watanabe",     email: "yuki.watanabe@email.com",       telefono: "+81 80-5678-9012",   documento: "JP123456", tipo_documento: "Pasaporte", nacionalidad: "Japón"},
  %{nombre: "Akira",      apellido: "Yamamoto",     email: "akira.yamamoto@email.com",      telefono: "+81 70-9876-5432",   documento: "JP234567", tipo_documento: "Pasaporte", nacionalidad: "Japón"},
  %{nombre: "Zhang",      apellido: "Wei",          email: "zhang.wei@email.com",           telefono: "+86 138 9012 3456",  documento: "CN012345", tipo_documento: "Pasaporte", nacionalidad: "China"},
  %{nombre: "Li",         apellido: "Mei",          email: "li.mei@email.com",              telefono: "+86 139 0123 4567",  documento: "CN123456", tipo_documento: "Pasaporte", nacionalidad: "China"},
  %{nombre: "Priya",      apellido: "Sharma",       email: "priya.sharma@email.com",        telefono: "+91 98765 43210",    documento: "IN012345", tipo_documento: "Pasaporte", nacionalidad: "India"},
  %{nombre: "Raj",        apellido: "Patel",        email: "raj.patel@email.com",           telefono: "+91 87654 32109",    documento: "IN123456", tipo_documento: "Pasaporte", nacionalidad: "India"},
  %{nombre: "Fatima",     apellido: "Al-Rashid",    email: "fatima.alrashid@email.com",     telefono: "+971 50 123 4567",   documento: "AE012345", tipo_documento: "Pasaporte", nacionalidad: "Emiratos"},
  %{nombre: "Omar",       apellido: "Hassan",       email: "omar.hassan@email.com",         telefono: "+966 50 234 5678",   documento: "SA012345", tipo_documento: "Pasaporte", nacionalidad: "Arabia Saudí"},
  %{nombre: "Yasmine",    apellido: "Khalil",       email: "yasmine.khalil@email.com",      telefono: "+20 100 123 4567",   documento: "EG012345", tipo_documento: "Pasaporte", nacionalidad: "Egipto"},
  %{nombre: "Kim",        apellido: "Ji-hyun",      email: "kim.jihyun@email.com",          telefono: "+82 10-1234-5678",   documento: "KR012345", tipo_documento: "Pasaporte", nacionalidad: "Corea del Sur"},
  %{nombre: "Aiko",       apellido: "Suzuki",       email: "aiko.suzuki@email.com",         telefono: "+81 80-3456-7890",   documento: "JP345678", tipo_documento: "Pasaporte", nacionalidad: "Japón"},
  %{nombre: "Nguyen",     apellido: "Van Thanh",    email: "nguyen.vanthanh@email.com",     telefono: "+84 90 123 4567",    documento: "VN012345", tipo_documento: "Pasaporte", nacionalidad: "Vietnam"},
  %{nombre: "Siti",       apellido: "Rahayu",       email: "siti.rahayu@email.com",         telefono: "+62 812 3456 7890",  documento: "ID012345", tipo_documento: "Pasaporte", nacionalidad: "Indonesia"},
  %{nombre: "Kenji",      apellido: "Nakamura",     email: "kenji.nakamura@email.com",      telefono: "+81 90-5678-1234",   documento: "JP456789", tipo_documento: "Pasaporte", nacionalidad: "Japón"},
  # África & Oceanía (10)
  %{nombre: "Amara",      apellido: "Diallo",       email: "amara.diallo@email.com",        telefono: "+221 77 890 1234",   documento: "SN012345", tipo_documento: "Pasaporte", nacionalidad: "Senegal"},
  %{nombre: "Kwame",      apellido: "Asante",       email: "kwame.asante@email.com",        telefono: "+233 54 123 4567",   documento: "GH012345", tipo_documento: "Pasaporte", nacionalidad: "Ghana"},
  %{nombre: "Amina",      apellido: "Osei",         email: "amina.osei@email.com",          telefono: "+234 801 234 5678",  documento: "NG012345", tipo_documento: "Pasaporte", nacionalidad: "Nigeria"},
  %{nombre: "Sipho",      apellido: "Ndlovu",       email: "sipho.ndlovu@email.com",        telefono: "+27 71 234 5678",    documento: "ZA012345", tipo_documento: "Pasaporte", nacionalidad: "Sudáfrica"},
  %{nombre: "Imane",      apellido: "Benali",       email: "imane.benali@email.com",        telefono: "+212 661 234 567",   documento: "MA012345", tipo_documento: "Pasaporte", nacionalidad: "Marruecos"},
  %{nombre: "Leilani",    apellido: "Kahananui",    email: "leilani.kahananui@email.com",   telefono: "+64 21 123 4567",    documento: "NZ012345", tipo_documento: "Pasaporte", nacionalidad: "Nueva Zelanda"},
  %{nombre: "James",      apellido: "Morrison",     email: "james.morrison.au@email.com",   telefono: "+61 412 345 678",    documento: "AU012345", tipo_documento: "Pasaporte", nacionalidad: "Australia"},
  %{nombre: "Charlotte",  apellido: "Taylor",       email: "charlotte.taylor.au@email.com", telefono: "+61 423 456 789",    documento: "AU123456", tipo_documento: "Pasaporte", nacionalidad: "Australia"},
  %{nombre: "Aziz",       apellido: "Karimov",      email: "aziz.karimov@email.com",        telefono: "+998 90 123 4567",   documento: "UZ012345", tipo_documento: "Pasaporte", nacionalidad: "Uzbekistán"},
  %{nombre: "Khalid",     apellido: "El-Amin",      email: "khalid.elamin@email.com",       telefono: "+249 91 234 5678",   documento: "SD012345", tipo_documento: "Pasaporte", nacionalidad: "Sudán"}
]
huespedes_creados = Enum.map(huespedes_attrs, fn attrs ->
  %Huesped{} |> Huesped.changeset(attrs) |> Repo.insert!(on_conflict: :nothing)
end)
n_huespedes = length(huespedes_creados)
IO.puts("  #{n_huespedes} huéspedes")

# ============================================= RESERVAS (450+ — programáticas)
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
n_habs = length(habitaciones_precios)

metodos_pago_list = ["tarjeta", "efectivo", "tarjeta", "transferencia", "tarjeta"]

notas_pool = [
  "Cliente VIP — atención preferente", "Turista internacional, primera visita",
  "Luna de miel — decoración especial", "Viaje de negocios corporativo",
  "Familia con niños", "Cliente frecuente — tarifa preferencial",
  "Reserva de último momento", "Grupo — celebración especial",
  "Aniversario de bodas", "Congreso internacional", nil, nil
]

# Genera ~14-22 reservas por mes para los últimos 24 meses + próximos 3 meses
reservas_spec =
  Enum.flat_map(-24..3, fn mes ->
    dia_base = mes * 30
    fecha_ref = Date.add(hoy, dia_base)
    hoy_mes = fecha_ref.month
    n = cond do
      hoy_mes in [12, 1, 2] -> 22
      hoy_mes in [7, 8, 9]  -> 18
      hoy_mes in [10, 11, 3]-> 14
      true                  -> 11
    end
    Enum.map(0..(n - 1), fn i ->
      dia_rel = rem(i * 27 + abs(mes) * 3, 28)
      noches  = rem(i * 3 + abs(mes), 6) + 1
      hab_idx = rem(i * 7 + abs(mes) * 13, n_habs)
      hue_idx = rem(i * 11 + abs(mes) * 7, n_huespedes)
      {dia_base + dia_rel, noches, hab_idx, hue_idx}
    end)
  end)
  # Reservas de HOY y recientes para tener datos de métricas actuales
  ++ [
    {-2, 2,  0,  0}, {-1, 1,  2,  1}, {-3, 3,  5,  2}, {-1, 1,  9,  3},
    {-2, 2, 11,  4}, {-1, 1, 14,  5}, {-4, 4,  7,  6}, {-2, 2, 16,  7},
    { 0, 3,  1,  8}, { 0, 2,  4,  9}, { 0, 4,  8, 10}, { 0, 1, 12, 11},
    { 0, 5, 17, 12}, { 0, 2,  6, 13}, { 0, 3, 13, 14}, { 0, 4, 19, 15},
    {-1, 3,  3, 20}, {-1, 2,  6, 21}, {-2, 4, 10, 22}, {-1, 5, 15, 23},
    {-2, 3, 18, 24}, {-1, 2,  0, 25}, {-3, 5,  7, 26}, {-1, 3, 12, 27}
  ]

reservas_creadas =
  Enum.with_index(reservas_spec, fn {offset, noches, hab_idx, hue_idx}, i ->
    fecha_entrada = Date.add(hoy, offset)
    fecha_salida  = Date.add(fecha_entrada, noches)
    {hab_num, precio_str} = Enum.at(habitaciones_precios, rem(hab_idx, n_habs))
    precio_noche  = Decimal.new(precio_str)
    total         = Decimal.mult(precio_noche, noches)
    hue_id        = Enum.at(huespedes_creados, rem(hue_idx, n_huespedes)).id
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
    # 2-5 consumos por reserva — índice determinista
    idx_base = :erlang.phash2(reserva.id, 20)
    n = rem(idx_base, 4) + 2
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
      referencia_externa: ref
    })
    |> Repo.insert!()
  end)

IO.puts("  #{length(pagos_creados)} pagos")

# ============================================= TAREAS DE LIMPIEZA (150+)
empleados_limpieza = Repo.all(from u in Usuario, where: u.rol in ["limpieza"], select: u.id)
n_emp = max(1, length(empleados_limpieza))
prioridades_pool = ["baja", "normal", "normal", "normal", "alta", "urgente"]
numeros_hab = Map.keys(hab_map)
n_nums = length(numeros_hab)

# Tareas históricas completadas (90 días atrás)
tareas_completadas_hist = Enum.flat_map(-90..-1, fn dia_offset ->
  if rem(abs(dia_offset) * 7, 3) == 0 do
    hab_num = Enum.at(numeros_hab, rem(abs(dia_offset) * 13, n_nums))
    emp_id  = Enum.at(empleados_limpieza, rem(abs(dia_offset), n_emp))
    prio    = Enum.at(prioridades_pool, rem(abs(dia_offset) * 3, length(prioridades_pool)))
    dur     = rem(abs(dia_offset) * 7, 50) + 20
    completada_en = DateTime.add(DateTime.utc_now(), dia_offset * 86_400 + 10 * 3600, :second)
    iniciada_en   = DateTime.add(completada_en, -dur * 60, :second)
    [%TareaLimpieza{}
     |> TareaLimpieza.changeset(%{
       habitacion_id:    hab_map[hab_num],
       empleado_id:      emp_id,
       estado:           "completada",
       prioridad:        prio,
       duracion_minutos: dur,
       iniciada_en:      iniciada_en,
       completada_en:    completada_en
     })
     |> Repo.insert!()]
  else [] end
end)

# Tareas completadas hoy
tareas_hoy = Enum.with_index(["101","102","201","202","301","302","401","403"], fn num, i ->
  dur = 25 + i * 5
  completada_en = DateTime.add(DateTime.utc_now(), -(i + 1) * 1800, :second)
  iniciada_en   = DateTime.add(completada_en, -dur * 60, :second)
  prio = Enum.at(prioridades_pool, rem(i, length(prioridades_pool)))
  %TareaLimpieza{}
  |> TareaLimpieza.changeset(%{
    habitacion_id:    hab_map[num],
    empleado_id:      Enum.at(empleados_limpieza, rem(i, n_emp)),
    estado:           "completada",
    prioridad:        prio,
    duracion_minutos: dur,
    iniciada_en:      iniciada_en,
    completada_en:    completada_en
  })
  |> Repo.insert!()
end)

# Tareas en proceso ahora
tareas_en_proceso = Enum.with_index(["103","203","303","404"], fn num, i ->
  iniciada_en = DateTime.add(DateTime.utc_now(), -(i + 1) * 900, :second)
  prio = if i < 2, do: "alta", else: "normal"
  %TareaLimpieza{}
  |> TareaLimpieza.changeset(%{
    habitacion_id: hab_map[num],
    empleado_id:   Enum.at(empleados_limpieza, rem(i + 2, n_emp)),
    estado:        "en_proceso",
    prioridad:     prio,
    iniciada_en:   iniciada_en
  })
  |> Repo.insert!()
end)

# Tareas pendientes
tareas_pendientes = Enum.with_index(["104","105","204","205","304","305","402","405"], fn num, i ->
  prio = Enum.at(prioridades_pool, rem(i * 2, length(prioridades_pool)))
  %TareaLimpieza{}
  |> TareaLimpieza.changeset(%{
    habitacion_id: hab_map[num],
    empleado_id:   Enum.at(empleados_limpieza, rem(i, n_emp)),
    estado:        "pendiente",
    prioridad:     prio
  })
  |> Repo.insert!()
end)

tareas_creadas = tareas_completadas_hist ++ tareas_hoy ++ tareas_en_proceso ++ tareas_pendientes
IO.puts("  #{length(tareas_creadas)} tareas de limpieza")

# ============================================= HORARIOS (26 semanas × 5 empleados)
[turno_manana, turno_tarde, turno_noche] = Enum.take(turnos_creados, 3)
inicio_semana = Date.add(hoy, -(Date.day_of_week(hoy) - 1))

empleados_mant = Repo.all(from u in Usuario, where: u.rol in ["mantenimiento"], select: u.id)

turno_asignaciones =
  [
    {Enum.at(empleados_limpieza, 0), turno_manana},
    {Enum.at(empleados_limpieza, 1), turno_tarde},
    {Enum.at(empleados_limpieza, 2), turno_noche},
    {Enum.at(empleados_limpieza, rem(3, n_emp)), turno_manana},
    {Enum.at(empleados_mant, 0), turno_tarde}
  ]
  |> Enum.filter(fn {emp_id, _} -> not is_nil(emp_id) end)

horarios_creados =
  for semana <- 0..25,
      dia    <- 0..6,
      {emp_id, turno} <- turno_asignaciones do
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
total_t = Repo.aggregate(TareaLimpieza, :count, :id)

IO.puts("")
IO.puts(String.duplicate("=", 60))
IO.puts("  HotelFlux — Seeds completados exitosamente")
IO.puts(String.duplicate("=", 60))
IO.puts("  admin@hotelflux.com       / Admin123!")
IO.puts("  recepcion@hotelflux.com   / Recepcion123!")
IO.puts("  ana@hotelflux.com         / Gerente123!")
IO.puts("  limpieza1@hotelflux.com   / Limpieza123!")
IO.puts(String.duplicate("-", 60))
IO.puts("  Habitaciones : #{length(habitaciones_attrs)} | Productos: #{length(productos_attrs)}")
IO.puts("  Huéspedes    : #{n_huespedes}")
IO.puts("  Reservas BD  : #{total_r} | Pagos: #{total_p} | Consumos: #{total_c}")
IO.puts("  Tareas       : #{total_t} | Horarios: #{length(horarios_creados)}")
IO.puts(String.duplicate("=", 60))
