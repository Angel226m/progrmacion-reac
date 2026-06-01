# Script de seeds EXTRA — Datos adicionales para HotelFlux
# Agrega datos incrementalmente sobre los seeds base ya ejecutados.
# Ejecutar con: ./bin/hotelflux eval 'HotelFlux.Release.seed_extra()'
#
# Idempotente: usa on_conflict: :nothing en todo lo que tiene clave única.

alias HotelFlux.Repo
alias HotelFlux.Domain.{Usuario, Habitacion, Producto, Huesped, Piso, Turno,
                         HorarioPersonal, Reserva, Consumo, Pago, TareaLimpieza}
import Ecto.Query

IO.puts("Agregando datos extras a HotelFlux...")
hoy = Date.utc_today()

# ============================================= PISO 5
%Piso{}
|> Piso.changeset(%{numero: 5, nombre: "Nivel Ejecutivo",
                    descripcion: "Habitaciones business y salas de reuniones", activo: true})
|> Repo.insert!(on_conflict: :nothing, conflict_target: :numero)
IO.puts("  Piso 5 asegurado")

# ============================================= HABITACIONES NUEVAS (11)
nuevas_habs = [
  %{numero: "106", tipo: "doble",        piso: 1, capacidad: 2, precio_noche: Decimal.new("115.00"), clasificacion: "superior",  caracteristicas: %{"vista" => "jardín",        "cama" => "matrimonial", "piso" => "1", "m2" => "24", "aire_acond" => true}},
  %{numero: "107", tipo: "simple",       piso: 1, capacidad: 1, precio_noche: Decimal.new("75.00"),  clasificacion: "estandar",  caracteristicas: %{"vista" => "interior",      "cama" => "individual",  "piso" => "1", "m2" => "16"}},
  %{numero: "206", tipo: "suite",        piso: 2, capacidad: 2, precio_noche: Decimal.new("220.00"), clasificacion: "premium",   caracteristicas: %{"vista" => "piscina",       "cama" => "king",        "piso" => "2", "m2" => "48", "balcon" => true, "jacuzzi" => true}},
  %{numero: "207", tipo: "simple",       piso: 2, capacidad: 1, precio_noche: Decimal.new("88.00"),  clasificacion: "estandar",  caracteristicas: %{"vista" => "calle",         "cama" => "individual",  "piso" => "2", "m2" => "19"}},
  %{numero: "306", tipo: "doble",        piso: 3, capacidad: 2, precio_noche: Decimal.new("155.00"), clasificacion: "premium",   caracteristicas: %{"vista" => "mar",           "cama" => "matrimonial", "piso" => "3", "m2" => "34", "balcon" => true, "minibar" => true}},
  %{numero: "307", tipo: "simple",       piso: 3, capacidad: 1, precio_noche: Decimal.new("92.00"),  clasificacion: "superior",  caracteristicas: %{"vista" => "jardín",        "cama" => "individual",  "piso" => "3", "m2" => "21"}},
  %{numero: "406", tipo: "suite",        piso: 4, capacidad: 3, precio_noche: Decimal.new("310.00"), clasificacion: "exclusivo", caracteristicas: %{"vista" => "mar",           "cama" => "king",        "piso" => "4", "m2" => "72", "terraza" => true, "jacuzzi" => true, "sala" => true}},
  %{numero: "501", tipo: "doble",        piso: 5, capacidad: 2, precio_noche: Decimal.new("200.00"), clasificacion: "exclusivo", caracteristicas: %{"vista" => "panorámica",    "cama" => "king",        "piso" => "5", "m2" => "42", "balcon" => true, "escritorio" => true, "minibar" => true}},
  %{numero: "502", tipo: "doble",        piso: 5, capacidad: 2, precio_noche: Decimal.new("200.00"), clasificacion: "exclusivo", caracteristicas: %{"vista" => "panorámica",    "cama" => "king",        "piso" => "5", "m2" => "42", "balcon" => true, "escritorio" => true, "minibar" => true}},
  %{numero: "503", tipo: "suite",        piso: 5, capacidad: 4, precio_noche: Decimal.new("380.00"), clasificacion: "exclusivo", caracteristicas: %{"vista" => "panorámica 360","cama" => "king",        "piso" => "5", "m2" => "95", "sala" => true, "terraza" => true, "jacuzzi" => true, "escritorio" => true, "butler" => true}},
  %{numero: "504", tipo: "doble",        piso: 5, capacidad: 2, precio_noche: Decimal.new("210.00"), clasificacion: "exclusivo", caracteristicas: %{"vista" => "mar",           "cama" => "king",        "piso" => "5", "m2" => "44", "balcon" => true, "escritorio" => true, "minibar" => true}}
]
Enum.each(nuevas_habs, fn attrs ->
  %Habitacion{} |> Habitacion.changeset(attrs) |> Repo.insert!(on_conflict: :nothing, conflict_target: :numero)
end)
IO.puts("  #{length(nuevas_habs)} habitaciones nuevas insertadas")

# ============================================= USUARIOS NUEVOS (6)
nuevos_usuarios = [
  %{nombre: "Víctor Campos",        email: "victor@hotelflux.com",        password: "Limpieza123!",   rol: "limpieza"},
  %{nombre: "Lourdes Quispe",       email: "lourdes@hotelflux.com",       password: "Limpieza123!",   rol: "limpieza"},
  %{nombre: "Felipe Herrera",       email: "felipe@hotelflux.com",        password: "Recepcion123!",  rol: "recepcionista"},
  %{nombre: "Natalia Cano",         email: "natalia.staff@hotelflux.com", password: "Manten123!",     rol: "mantenimiento"},
  %{nombre: "Hugo Quispe",          email: "hugo@hotelflux.com",          password: "Limpieza123!",   rol: "limpieza"},
  %{nombre: "Gabriela Rivas",       email: "gabriela.staff@hotelflux.com",password: "Recepcion123!",  rol: "recepcionista"}
]
nuevos_usuarios_creados = Enum.map(nuevos_usuarios, fn attrs ->
  %Usuario{} |> Usuario.changeset(attrs) |> Repo.insert!(on_conflict: :nothing, conflict_target: :email)
end)
IO.puts("  #{length(nuevos_usuarios)} usuarios nuevos")

# ============================================= PRODUCTOS NUEVOS (~25)
nuevos_productos = [
  # Gimnasio & Fitness
  %{nombre: "Acceso Gimnasio por día",        categoria: "gimnasio",        precio: Decimal.new("12.00"), descripcion: "Acceso completo al gym equipado con cardio y pesas."},
  %{nombre: "Clase de Yoga 60min",            categoria: "gimnasio",        precio: Decimal.new("20.00"), descripcion: "Sesión guiada de yoga con instructor certificado."},
  %{nombre: "Clase de Spinning 45min",        categoria: "gimnasio",        precio: Decimal.new("18.00"), descripcion: "Spinning indoor de alta intensidad."},
  %{nombre: "Entrenamiento Personal 60min",   categoria: "gimnasio",        precio: Decimal.new("55.00"), descripcion: "Sesión con entrenador personal certificado."},
  %{nombre: "Clase de Pilates 50min",         categoria: "gimnasio",        precio: Decimal.new("22.00"), descripcion: "Pilates mat con instructor especializado."},
  # Piscina & Aqua
  %{nombre: "Uso Piscina Privada 2h",         categoria: "piscina",         precio: Decimal.new("35.00"), descripcion: "Reserva exclusiva de la piscina privada."},
  %{nombre: "Cóctel a la Orilla",             categoria: "piscina",         precio: Decimal.new("15.00"), descripcion: "Cóctel tropical servido en la piscina."},
  %{nombre: "Snack Pool Bar",                 categoria: "piscina",         precio: Decimal.new("10.00"), descripcion: "Tabla de frutas tropicales y snacks refrescantes."},
  %{nombre: "Clase de Aqua Aeróbics",         categoria: "piscina",         precio: Decimal.new("16.00"), descripcion: "Clase grupal de aeróbicos acuáticos."},
  # Sala de Conferencias
  %{nombre: "Sala Conferencias 4h",           categoria: "conferencias",    precio: Decimal.new("120.00"),descripcion: "Sala equipada para hasta 20 personas — proyector y WiFi."},
  %{nombre: "Sala Conferencias día completo", categoria: "conferencias",    precio: Decimal.new("200.00"),descripcion: "Uso completo 8h — catering disponible."},
  %{nombre: "Equipamiento Audio-Visual",      categoria: "conferencias",    precio: Decimal.new("50.00"), descripcion: "Pantalla 4K, micrófonos y sistema de sonido."},
  %{nombre: "Coffee Break Ejecutivo",         categoria: "conferencias",    precio: Decimal.new("18.00"), descripcion: "Café, té, jugos y pastelería por persona."},
  %{nombre: "Almuerzo Corporativo",           categoria: "conferencias",    precio: Decimal.new("30.00"), descripcion: "Menú ejecutivo 3 tiempos por persona."},
  # Minibar adicional
  %{nombre: "Ron Havana Club 200ml",          categoria: "minibar",         precio: Decimal.new("22.00"),  stock: 35},
  %{nombre: "Whisky Jack Daniel's 200ml",     categoria: "minibar",         precio: Decimal.new("25.00"),  stock: 30},
  %{nombre: "Vodka Absolut 200ml",            categoria: "minibar",         precio: Decimal.new("20.00"),  stock: 30},
  %{nombre: "Energizante Red Bull",           categoria: "minibar",         precio: Decimal.new("5.50"),   stock: 200},
  %{nombre: "Té Premium Surtido",             categoria: "minibar",         precio: Decimal.new("4.00"),   stock: 250},
  %{nombre: "Café Molido Premium 100g",       categoria: "minibar",         precio: Decimal.new("8.00"),   stock: 80},
  # Room Service adicional
  %{nombre: "Tabla de Sushi Premium",         categoria: "room_service",    precio: Decimal.new("42.00"), descripcion: "Surtido de nigiris y makis del chef."},
  %{nombre: "Anticuchos Gourmet",             categoria: "room_service",    precio: Decimal.new("22.00"), descripcion: "Anticuchos de corazón con papa dorada y ají."},
  %{nombre: "Causa Limeña Clásica",           categoria: "room_service",    precio: Decimal.new("18.00"), descripcion: "Causa de pollo o atún con decoración artística."},
  %{nombre: "Paella Valenciana (2 personas)", categoria: "room_service",    precio: Decimal.new("55.00"), descripcion: "Paella auténtica con mariscos y pollo."},
  %{nombre: "Chilcano de Pisco",              categoria: "room_service",    precio: Decimal.new("12.00"), descripcion: "Cóctel peruano con pisco, ginger ale y limón."}
]
Enum.each(nuevos_productos, fn attrs ->
  %Producto{} |> Producto.changeset(attrs) |> Repo.insert!(on_conflict: :nothing)
end)
IO.puts("  #{length(nuevos_productos)} productos nuevos")

# ============================================= HUÉSPEDES NUEVOS (~80)
nuevos_huespedes = [
  # Canadá (8)
  %{nombre: "Ethan",      apellido: "Thompson",      email: "ethan.thompson.ca@email.com",   telefono: "+1 416-555-0201",    documento: "CA012345", tipo_documento: "Pasaporte", nacionalidad: "Canadá"},
  %{nombre: "Sophie",     apellido: "Tremblay",      email: "sophie.tremblay@email.com",     telefono: "+1 514-555-0202",    documento: "CA123456", tipo_documento: "Pasaporte", nacionalidad: "Canadá"},
  %{nombre: "Liam",       apellido: "Martin",        email: "liam.martin.ca@email.com",      telefono: "+1 604-555-0203",    documento: "CA234567", tipo_documento: "Pasaporte", nacionalidad: "Canadá"},
  %{nombre: "Olivia",     apellido: "White",         email: "olivia.white.ca@email.com",     telefono: "+1 780-555-0204",    documento: "CA345678", tipo_documento: "Pasaporte", nacionalidad: "Canadá"},
  %{nombre: "Noah",       apellido: "Gagnon",        email: "noah.gagnon@email.com",         telefono: "+1 418-555-0205",    documento: "CA456789", tipo_documento: "Pasaporte", nacionalidad: "Canadá"},
  %{nombre: "Emma",       apellido: "Bouchard",      email: "emma.bouchard@email.com",       telefono: "+1 450-555-0206",    documento: "CA567890", tipo_documento: "Pasaporte", nacionalidad: "Canadá"},
  %{nombre: "William",    apellido: "Campbell",      email: "william.campbell.ca@email.com", telefono: "+1 613-555-0207",    documento: "CA678901", tipo_documento: "Pasaporte", nacionalidad: "Canadá"},
  %{nombre: "Ava",        apellido: "Côté",          email: "ava.cote@email.com",            telefono: "+1 343-555-0208",    documento: "CA789012", tipo_documento: "Pasaporte", nacionalidad: "Canadá"},
  # Europa adicional (18)
  %{nombre: "Klaus",      apellido: "Huber",         email: "klaus.huber@email.com",         telefono: "+43 699 12345678",   documento: "AT012345", tipo_documento: "Pasaporte", nacionalidad: "Austria"},
  %{nombre: "Lukas",      apellido: "Fischer",       email: "lukas.fischer.ch@email.com",    telefono: "+41 79 123 45 67",   documento: "CH012345", tipo_documento: "Pasaporte", nacionalidad: "Suiza"},
  %{nombre: "Amélie",     apellido: "Leroy",         email: "amelie.leroy@email.com",        telefono: "+32 470 12 34 56",   documento: "BE012345", tipo_documento: "Pasaporte", nacionalidad: "Bélgica"},
  %{nombre: "Lars",       apellido: "Nielsen",       email: "lars.nielsen@email.com",        telefono: "+45 20 12 34 56",    documento: "DK012345", tipo_documento: "Pasaporte", nacionalidad: "Dinamarca"},
  %{nombre: "Zsolt",      apellido: "Kovács",        email: "zsolt.kovacs@email.com",        telefono: "+36 30 123 4567",    documento: "HU012345", tipo_documento: "Pasaporte", nacionalidad: "Hungría"},
  %{nombre: "Andrei",     apellido: "Popescu",       email: "andrei.popescu@email.com",      telefono: "+40 721 234 567",    documento: "RO012345", tipo_documento: "Pasaporte", nacionalidad: "Rumanía"},
  %{nombre: "Mehmet",     apellido: "Yilmaz",        email: "mehmet.yilmaz@email.com",       telefono: "+90 532 123 4567",   documento: "TR012345", tipo_documento: "Pasaporte", nacionalidad: "Turquía"},
  %{nombre: "Ivan",       apellido: "Horvat",        email: "ivan.horvat@email.com",         telefono: "+385 91 234 5678",   documento: "HR012345", tipo_documento: "Pasaporte", nacionalidad: "Croacia"},
  %{nombre: "Jana",       apellido: "Kováčová",      email: "jana.kovacova@email.com",       telefono: "+421 901 234 567",   documento: "SK012345", tipo_documento: "Pasaporte", nacionalidad: "Eslovaquia"},
  %{nombre: "Marko",      apellido: "Petrović",      email: "marko.petrovic@email.com",      telefono: "+381 60 123 4567",   documento: "RS012345", tipo_documento: "Pasaporte", nacionalidad: "Serbia"},
  %{nombre: "Georgi",     apellido: "Ivanov",        email: "georgi.ivanov@email.com",       telefono: "+359 88 123 4567",   documento: "BG012345", tipo_documento: "Pasaporte", nacionalidad: "Bulgaria"},
  %{nombre: "Olena",      apellido: "Kovalenko",     email: "olena.kovalenko@email.com",     telefono: "+380 50 123 4567",   documento: "UA012345", tipo_documento: "Pasaporte", nacionalidad: "Ucrania"},
  %{nombre: "Tomas",      apellido: "Kazlauskas",    email: "tomas.kazlauskas@email.com",    telefono: "+370 612 34567",     documento: "LT012345", tipo_documento: "Pasaporte", nacionalidad: "Lituania"},
  %{nombre: "Jānis",      apellido: "Bērziņš",       email: "janis.berzins@email.com",       telefono: "+371 2012 3456",     documento: "LV012345", tipo_documento: "Pasaporte", nacionalidad: "Letonia"},
  %{nombre: "Tarvo",      apellido: "Tamm",          email: "tarvo.tamm@email.com",          telefono: "+372 5012 3456",     documento: "EE012345", tipo_documento: "Pasaporte", nacionalidad: "Estonia"},
  %{nombre: "Nikos",      apellido: "Christodoulou", email: "nikos.christodoulou@email.com", telefono: "+357 99 123456",     documento: "CY012345", tipo_documento: "Pasaporte", nacionalidad: "Chipre"},
  %{nombre: "Vera",       apellido: "Vasić",         email: "vera.vasic@email.com",          telefono: "+386 41 234 567",    documento: "SI012345", tipo_documento: "Pasaporte", nacionalidad: "Eslovenia"},
  %{nombre: "Artur",      apellido: "Dąbrowski",     email: "artur.dabrowski@email.com",     telefono: "+48 601 234 568",    documento: "PL123456", tipo_documento: "Pasaporte", nacionalidad: "Polonia"},
  # Latinoamérica adicional (15)
  %{nombre: "Santiago",   apellido: "Méndez",        email: "santiago.mendez.cr@email.com",  telefono: "+506 8123 4567",     documento: "CR012345", tipo_documento: "Pasaporte", nacionalidad: "Costa Rica"},
  %{nombre: "Paola",      apellido: "Herrera",       email: "paola.herrera.pa@email.com",    telefono: "+507 6123 4567",     documento: "PA012345", tipo_documento: "Pasaporte", nacionalidad: "Panamá"},
  %{nombre: "Luis",       apellido: "Rodríguez",     email: "luis.rodriguez.do@email.com",   telefono: "+1 829-555-0301",    documento: "DO012345", tipo_documento: "Pasaporte", nacionalidad: "Rep. Dominicana"},
  %{nombre: "Xiomara",    apellido: "Ramos",         email: "xiomara.ramos@email.com",       telefono: "+787 555-0302",      documento: "PR012345", tipo_documento: "Pasaporte", nacionalidad: "Puerto Rico"},
  %{nombre: "Ernesto",    apellido: "Castillo",      email: "ernesto.castillo.gt@email.com", telefono: "+502 4123 4567",     documento: "GT012345", tipo_documento: "Pasaporte", nacionalidad: "Guatemala"},
  %{nombre: "Rosa",       apellido: "Aguilar",       email: "rosa.aguilar.hn@email.com",     telefono: "+504 9123 4567",     documento: "HN012345", tipo_documento: "Pasaporte", nacionalidad: "Honduras"},
  %{nombre: "Karla",      apellido: "Monterrosa",    email: "karla.monterrosa@email.com",    telefono: "+503 7123 4567",     documento: "SV012345", tipo_documento: "Pasaporte", nacionalidad: "El Salvador"},
  %{nombre: "Byron",      apellido: "Espinoza",      email: "byron.espinoza.ni@email.com",   telefono: "+505 8234 5678",     documento: "NI012345", tipo_documento: "Pasaporte", nacionalidad: "Nicaragua"},
  %{nombre: "Yolanda",    apellido: "Peralta",       email: "yolanda.peralta.cu@email.com",  telefono: "+53 5123 4567",      documento: "CU012345", tipo_documento: "Pasaporte", nacionalidad: "Cuba"},
  %{nombre: "Rodrigo",    apellido: "Delgado",       email: "rodrigo.delgado.bo@email.com",  telefono: "+591 72 234 567",    documento: "BO123456", tipo_documento: "Pasaporte", nacionalidad: "Bolivia"},
  %{nombre: "Claudia",    apellido: "Amarilla",      email: "claudia.amarilla@email.com",    telefono: "+595 982 345 678",   documento: "PY123456", tipo_documento: "Pasaporte", nacionalidad: "Paraguay"},
  %{nombre: "Ignacio",    apellido: "Larrañaga",     email: "ignacio.larranaga@email.com",   telefono: "+598 98 234 5678",   documento: "UY123456", tipo_documento: "Pasaporte", nacionalidad: "Uruguay"},
  %{nombre: "María José", apellido: "Cárdenas",      email: "mariajose.cardenas@email.com",  telefono: "+593 97 345 6789",   documento: "EC234567", tipo_documento: "Pasaporte", nacionalidad: "Ecuador"},
  %{nombre: "Alejandro",  apellido: "Pizarro",       email: "alejandro.pizarro@email.com",   telefono: "+56 9 4321 0987",    documento: "CL456789", tipo_documento: "Pasaporte", nacionalidad: "Chile"},
  %{nombre: "Gabriela",   apellido: "Suárez",        email: "gabriela.suarez.ve@email.com",  telefono: "+58 424 234 5678",   documento: "VE123456", tipo_documento: "Cédula",    nacionalidad: "Venezuela"},
  # Asia adicional (15)
  %{nombre: "Somchai",    apellido: "Wongkham",      email: "somchai.wongkham@email.com",    telefono: "+66 81 234 5678",    documento: "TH012345", tipo_documento: "Pasaporte", nacionalidad: "Tailandia"},
  %{nombre: "Maria",      apellido: "Santos",        email: "maria.santos.ph@email.com",     telefono: "+63 917 123 4567",   documento: "PH012345", tipo_documento: "Pasaporte", nacionalidad: "Filipinas"},
  %{nombre: "Ahmad",      apellido: "Razak",         email: "ahmad.razak@email.com",         telefono: "+60 12-234 5678",    documento: "MY012345", tipo_documento: "Pasaporte", nacionalidad: "Malasia"},
  %{nombre: "Wei Lin",    apellido: "Tan",           email: "weiling.tan@email.com",         telefono: "+65 9123 4567",      documento: "SG012345", tipo_documento: "Pasaporte", nacionalidad: "Singapur"},
  %{nombre: "Ayesha",     apellido: "Khan",          email: "ayesha.khan@email.com",         telefono: "+92 301 234 5678",   documento: "PK012345", tipo_documento: "Pasaporte", nacionalidad: "Pakistán"},
  %{nombre: "Rashida",    apellido: "Begum",         email: "rashida.begum@email.com",       telefono: "+880 1712 345678",   documento: "BD012345", tipo_documento: "Pasaporte", nacionalidad: "Bangladesh"},
  %{nombre: "Rajan",      apellido: "Shrestha",      email: "rajan.shrestha@email.com",      telefono: "+977 98012 34567",   documento: "NP012345", tipo_documento: "Pasaporte", nacionalidad: "Nepal"},
  %{nombre: "Dilnoza",    apellido: "Yusupova",      email: "dilnoza.yusupova@email.com",    telefono: "+998 93 123 4567",   documento: "UZ123456", tipo_documento: "Pasaporte", nacionalidad: "Uzbekistán"},
  %{nombre: "Batbold",    apellido: "Gantulga",      email: "batbold.gantulga@email.com",    telefono: "+976 9912 3456",     documento: "MN012345", tipo_documento: "Pasaporte", nacionalidad: "Mongolia"},
  %{nombre: "Thanh",      apellido: "Nguyen",        email: "thanh.nguyen2@email.com",       telefono: "+84 91 234 5678",    documento: "VN123456", tipo_documento: "Pasaporte", nacionalidad: "Vietnam"},
  %{nombre: "Min-jun",    apellido: "Lee",           email: "minjun.lee@email.com",          telefono: "+82 10-2345-6789",   documento: "KR123456", tipo_documento: "Pasaporte", nacionalidad: "Corea del Sur"},
  %{nombre: "Isabelle",   apellido: "Lin",           email: "isabelle.lin.tw@email.com",     telefono: "+886 912 345 678",   documento: "TW012345", tipo_documento: "Pasaporte", nacionalidad: "Taiwán"},
  %{nombre: "Nour",       apellido: "Al-Farsi",      email: "nour.alfarsi@email.com",        telefono: "+968 9123 4567",     documento: "OM012345", tipo_documento: "Pasaporte", nacionalidad: "Omán"},
  %{nombre: "Hana",       apellido: "Al-Mutairi",    email: "hana.almutairi@email.com",      telefono: "+965 5123 4567",     documento: "KW012345", tipo_documento: "Pasaporte", nacionalidad: "Kuwait"},
  # Perú adicional (10)
  %{nombre: "Wilmer",     apellido: "Soto",          email: "wilmer.soto@email.com",         telefono: "+51 975 111 222",    documento: "70234567", tipo_documento: "DNI",       nacionalidad: "Perú"},
  %{nombre: "Cynthia",    apellido: "Neyra",         email: "cynthia.neyra@email.com",       telefono: "+51 974 222 333",    documento: "71234567", tipo_documento: "DNI",       nacionalidad: "Perú"},
  %{nombre: "Marco",      apellido: "Alarcón",       email: "marco.alarcon@email.com",       telefono: "+51 973 333 444",    documento: "72234567", tipo_documento: "DNI",       nacionalidad: "Perú"},
  %{nombre: "Fiorella",   apellido: "Cisneros",      email: "fiorella.cisneros@email.com",   telefono: "+51 972 444 555",    documento: "73234567", tipo_documento: "DNI",       nacionalidad: "Perú"},
  %{nombre: "Oswaldo",    apellido: "Lazo",          email: "oswaldo.lazo@email.com",        telefono: "+51 971 555 666",    documento: "74234567", tipo_documento: "DNI",       nacionalidad: "Perú"},
  %{nombre: "Karina",     apellido: "Palomino",      email: "karina.palomino@email.com",     telefono: "+51 970 666 777",    documento: "75234567", tipo_documento: "DNI",       nacionalidad: "Perú"},
  %{nombre: "Jhonatan",   apellido: "Llanos",        email: "jhonatan.llanos@email.com",     telefono: "+51 969 777 888",    documento: "76234567", tipo_documento: "DNI",       nacionalidad: "Perú"},
  %{nombre: "Vanessa",    apellido: "Bustamante",    email: "vanessa.bustamante@email.com",  telefono: "+51 968 888 999",    documento: "77234567", tipo_documento: "DNI",       nacionalidad: "Perú"},
  %{nombre: "Edwin",      apellido: "Ramos",         email: "edwin.ramos.pe@email.com",      telefono: "+51 967 999 000",    documento: "78234567", tipo_documento: "DNI",       nacionalidad: "Perú"},
  %{nombre: "Silvia",     apellido: "Tello",         email: "silvia.tello@email.com",        telefono: "+51 966 000 111",    documento: "79234567", tipo_documento: "DNI",       nacionalidad: "Perú"}
]
nuevos_huespedes_creados = Enum.map(nuevos_huespedes, fn attrs ->
  %Huesped{} |> Huesped.changeset(attrs) |> Repo.insert!(on_conflict: :nothing)
end)
n_nuevos_hues = length(nuevos_huespedes_creados)
IO.puts("  #{n_nuevos_hues} huéspedes nuevos")

# ============================================= RESERVAS EXTRA
# Obtener toda la BD actual para generar reservas sobre nuevos cuartos + huéspedes
habitaciones_db = Repo.all(Habitacion)
hab_map = Map.new(habitaciones_db, fn h -> {h.numero, h.id} end)
todos_los_huespedes = Repo.all(Huesped)
n_todos_hues = length(todos_los_huespedes)

nuevas_hab_precios = [
  {"106", "115.00"}, {"107", "75.00"},  {"206", "220.00"}, {"207", "88.00"},
  {"306", "155.00"}, {"307", "92.00"},  {"406", "310.00"}, {"501", "200.00"},
  {"502", "200.00"}, {"503", "380.00"}, {"504", "210.00"}
]
n_nuevas_habs = length(nuevas_hab_precios)

todas_hab_precios = [
  {"101", "80.00"},  {"102", "80.00"},  {"103", "120.00"}, {"104", "120.00"},
  {"105", "140.00"}, {"106", "115.00"}, {"107", "75.00"},  {"201", "130.00"},
  {"202", "130.00"}, {"203", "250.00"}, {"204", "130.00"}, {"205", "90.00"},
  {"206", "220.00"}, {"207", "88.00"},  {"301", "150.00"}, {"302", "150.00"},
  {"303", "300.00"}, {"304", "95.00"},  {"305", "140.00"}, {"306", "155.00"},
  {"307", "92.00"},  {"401", "350.00"}, {"402", "500.00"}, {"403", "320.00"},
  {"404", "180.00"}, {"405", "180.00"}, {"406", "310.00"}, {"501", "200.00"},
  {"502", "200.00"}, {"503", "380.00"}, {"504", "210.00"}
]
n_todas_habs = length(todas_hab_precios)

notas_pool = [
  "Cliente VIP — atención preferente", "Turista internacional, primera visita",
  "Luna de miel — decoración especial", "Viaje de negocios corporativo",
  "Familia con niños", "Cliente frecuente — tarifa preferencial",
  "Reserva de último momento", "Grupo — celebración especial",
  "Aniversario de bodas", "Congreso internacional",
  "Viajero solitario — tour gastronómico", "Pareja — escapada romántica",
  "Delegación oficial — protocolo especial", "Necesita cuna para bebé",
  "Check-in tardío después de medianoche", "Solicita piso alto y vista al mar",
  "Grupo corporativo — sala de reuniones reservada",
  nil, nil, nil
]

# Reservas para nuevas habitaciones (últimos 24 meses + próximos 3 meses)
reservas_nuevas_habs_spec =
  Enum.flat_map(-24..3, fn mes ->
    dia_base = mes * 30
    fecha_ref = Date.add(hoy, dia_base)
    hoy_mes = fecha_ref.month
    n = cond do
      hoy_mes in [12, 1, 2] -> 10
      hoy_mes in [7, 8, 9]  -> 8
      true                  -> 6
    end
    Enum.map(0..(n - 1), fn i ->
      noches  = rem(i * 3 + abs(mes), 5) + 1
      hab_idx = rem(i * 5 + abs(mes) * 11, n_nuevas_habs)
      hue_idx = rem(i * 13 + abs(mes) * 7, n_todos_hues)
      {dia_base + rem(i * 23 + abs(mes) * 3, 27), noches, hab_idx, hue_idx, :nueva}
    end)
  end)

# Reservas para todos los cuartos en el período extendido -36..-25 (meses nuevos)
reservas_ext_hist_spec =
  Enum.flat_map(-36..-25, fn mes ->
    dia_base = mes * 30
    fecha_ref = Date.add(hoy, dia_base)
    hoy_mes = fecha_ref.month
    n = cond do
      hoy_mes in [12, 1, 2] -> 20
      hoy_mes in [7, 8, 9]  -> 16
      hoy_mes in [10, 11, 3]-> 13
      true                  -> 10
    end
    Enum.map(0..(n - 1), fn i ->
      noches  = rem(i * 2 + abs(mes), 6) + 1
      hab_idx = rem(i * 7 + abs(mes) * 13, n_todas_habs)
      hue_idx = rem(i * 11 + abs(mes) * 9, n_todos_hues)
      {dia_base + rem(i * 29 + abs(mes) * 3, 28), noches, hab_idx, hue_idx, :todas}
    end)
  end)

# Reservas de hoy/recientes con nuevas habitaciones y nuevos huéspedes
reservas_hoy_nuevas = [
  { 0, 2, 0, 0}, { 0, 3, 2, 1}, { 0, 1, 4, 2}, { 0, 2, 6, 3},
  {-1, 2, 1, 4}, {-1, 3, 3, 5}, {-2, 4, 5, 6}, {-1, 1, 7, 7},
  {-3, 3, 8, 8}, { 0, 5, 9, 9}, { 0, 2, 10, 10}, {-1, 3, 0, 11}
]
|> Enum.map(fn {off, n, hi, hei} -> {off, n, hi, hei, :nueva} end)

metodos_pago_list = ["tarjeta", "efectivo", "tarjeta", "transferencia", "tarjeta"]

reservas_extra_creadas =
  Enum.with_index(reservas_nuevas_habs_spec ++ reservas_ext_hist_spec ++ reservas_hoy_nuevas,
    fn {offset, noches, hab_idx, hue_idx, tipo}, i ->
      fecha_entrada = Date.add(hoy, offset)
      fecha_salida  = Date.add(fecha_entrada, noches)

      {hab_num, precio_str} =
        case tipo do
          :nueva -> Enum.at(nuevas_hab_precios, rem(hab_idx, n_nuevas_habs))
          :todas -> Enum.at(todas_hab_precios,  rem(hab_idx, n_todas_habs))
        end

      precio_noche  = Decimal.new(precio_str)
      total         = Decimal.mult(precio_noche, noches)
      hue           = Enum.at(todos_los_huespedes, rem(hue_idx, n_todos_hues))
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
        huesped_id:    hue.id,
        habitacion_id: hab_id,
        fecha_entrada: fecha_entrada,
        fecha_salida:  fecha_salida,
        estado:        estado,
        total:         total,
        notas:         nota
      })
      |> Repo.insert!()
    end)

IO.puts("  #{length(reservas_extra_creadas)} reservas extra")

# ============================================= CONSUMOS EXTRA
productos_db = Repo.all(Producto)
prod_precios  = Enum.map(productos_db, fn p -> {p.id, p.precio, p.categoria} end)
n_prods       = length(prod_precios)

consumos_extra =
  reservas_extra_creadas
  |> Enum.filter(fn r -> r.estado in ["checked_out", "checked_in"] end)
  |> Enum.flat_map(fn reserva ->
    idx_base = :erlang.phash2(reserva.id, 24)
    n        = rem(idx_base, 4) + 2
    Enum.map(0..(n - 1), fn offset ->
      {prod_id, precio, _cat} = Enum.at(prod_precios, rem(idx_base + offset * 7, n_prods))
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

IO.puts("  #{length(consumos_extra)} consumos extra")

# ============================================= PAGOS EXTRA
pagos_extra =
  reservas_extra_creadas
  |> Enum.filter(fn r -> r.estado == "checked_out" end)
  |> Enum.with_index(fn reserva, i ->
    metodo = Enum.at(metodos_pago_list, rem(i, length(metodos_pago_list)))
    ref    = "XPAY-#{String.pad_leading(to_string(5000 + i), 4, "0")}-HF"
    %Pago{}
    |> Pago.changeset(%{
      reserva_id:          reserva.id,
      monto:               reserva.total,
      metodo:              metodo,
      estado:              "completado",
      referencia_externa:  ref
    })
    |> Repo.insert!()
  end)

IO.puts("  #{length(pagos_extra)} pagos extra")

# ============================================= TAREAS EXTRA (nuevas habitaciones)
empleados_limpieza = Repo.all(from u in Usuario, where: u.rol in ["limpieza"], select: u.id)
n_emp = max(1, length(empleados_limpieza))
prioridades_pool = ["baja", "normal", "normal", "normal", "alta", "urgente"]
nuevos_numeros = ["106","107","206","207","306","307","406","501","502","503","504"]
n_nuevos_nums  = length(nuevos_numeros)

# Historial de 90 días para los nuevos cuartos
tareas_hist_nuevas = Enum.flat_map(-90..-1, fn dia_offset ->
  if rem(abs(dia_offset) * 11, 4) == 0 do
    hab_num = Enum.at(nuevos_numeros, rem(abs(dia_offset) * 7, n_nuevos_nums))
    emp_id  = Enum.at(empleados_limpieza, rem(abs(dia_offset), n_emp))
    prio    = Enum.at(prioridades_pool, rem(abs(dia_offset) * 3, length(prioridades_pool)))
    dur     = rem(abs(dia_offset) * 7, 45) + 20
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

# Tareas pendientes para hoy en nuevas habitaciones
tareas_pend_nuevas =
  Enum.with_index(["106","206","306","406","501","502","503","504"], fn num, i ->
    prio = Enum.at(prioridades_pool, rem(i * 2 + 1, length(prioridades_pool)))
    %TareaLimpieza{}
    |> TareaLimpieza.changeset(%{
      habitacion_id: hab_map[num],
      empleado_id:   Enum.at(empleados_limpieza, rem(i, n_emp)),
      estado:        "pendiente",
      prioridad:     prio
    })
    |> Repo.insert!()
  end)

tareas_extra = tareas_hist_nuevas ++ tareas_pend_nuevas
IO.puts("  #{length(tareas_extra)} tareas extra")

# ============================================= HORARIOS EXTRA (nuevos empleados)
nuevos_empleados_ids =
  Repo.all(from u in Usuario,
    where: u.email in ["victor@hotelflux.com", "lourdes@hotelflux.com", "hugo@hotelflux.com",
                       "natalia.staff@hotelflux.com"],
    select: u.id)

turnos = Repo.all(from t in Turno, limit: 3)
[turno_m, turno_t, turno_n | _] = case length(turnos) >= 3 do
  true  -> turnos
  false -> turnos ++ [List.last(turnos), List.last(turnos)]
end

inicio_semana = Date.add(hoy, -(Date.day_of_week(hoy) - 1))

asig_nuevos =
  case nuevos_empleados_ids do
    [e1 | rest] ->
      base = [{e1, turno_m}]
      base ++ Enum.with_index(rest, fn eid, i ->
        {eid, Enum.at([turno_t, turno_n, turno_m], rem(i, 3))}
      end)
    _ -> []
  end

horarios_extra =
  for semana <- 0..25,
      dia    <- 0..6,
      {emp_id, turno} <- asig_nuevos do
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

IO.puts("  #{length(horarios_extra)} horarios extra")

# ============================================= RESUMEN FINAL
total_h  = Repo.aggregate(Habitacion,     :count, :id)
total_hues = Repo.aggregate(Huesped,      :count, :id)
total_r  = Repo.aggregate(Reserva,        :count, :id)
total_p  = Repo.aggregate(Pago,           :count, :id)
total_c  = Repo.aggregate(Consumo,        :count, :id)
total_t  = Repo.aggregate(TareaLimpieza,  :count, :id)
total_prod = Repo.aggregate(Producto,     :count, :id)

IO.puts("")
IO.puts(String.duplicate("=", 60))
IO.puts("  HotelFlux — Seeds Extra completados")
IO.puts(String.duplicate("=", 60))
IO.puts("  Habitaciones totales : #{total_h}")
IO.puts("  Huéspedes totales    : #{total_hues}")
IO.puts("  Productos totales    : #{total_prod}")
IO.puts("  Reservas totales     : #{total_r}")
IO.puts("  Pagos totales        : #{total_p}")
IO.puts("  Consumos totales     : #{total_c}")
IO.puts("  Tareas totales       : #{total_t}")
IO.puts(String.duplicate("=", 60))
