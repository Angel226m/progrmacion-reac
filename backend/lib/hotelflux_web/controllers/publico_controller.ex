defmodule HotelFluxWeb.PublicoController do
  @moduledoc """
  Controlador público — API para el frontend de clientes/huéspedes.
  No requiere autenticación JWT.

  Endpoints:
    - Consultar disponibilidad de habitaciones
    - Crear reserva como huésped
    - Consultar estado de reserva
    - Obtener información del hotel (tipos, servicios, pisos)
    - Política de privacidad y términos
  """
  use Phoenix.Controller

  alias HotelFlux.Adapters.Repos.{HabitacionRepo, ReservaRepo, HuespedRepo, PisoRepo, ProductoRepo}
  alias HotelFlux.Domain.Usuario
  alias HotelFlux.Repo
  alias Ecto.Multi
  alias HotelFlux.Adapters.Cache.RedisCache

  require Logger

  # ═══════════════════════════════════════════════════════════
  # INFORMACIÓN DEL HOTEL
  # ═══════════════════════════════════════════════════════════

  @doc "GET /publico/info — Información general del hotel"
  def info_hotel(conn, _params) do
    cache_key = "publico:info_hotel"

    caso = RedisCache.get(cache_key)
    datos = case caso do
      {:ok, nil} ->
        info = calcular_info_hotel()
        RedisCache.set(cache_key, info, 3600)
        info
      {:ok, cached} -> cached
      _ -> calcular_info_hotel()
    end

    conn |> json(%{data: datos})
  end

  defp calcular_info_hotel do
    pisos = PisoRepo.listar()
    %{
      nombre: "HotelFlux",
      descripcion: "Hotel moderno con gestión reactiva en tiempo real",
      pisos: Enum.map(pisos, fn p ->
        %{
          id: p.id,
          numero: p.numero,
          nombre: p.nombre,
          descripcion: p.descripcion
        }
      end),
      tipos_habitacion: [
        %{tipo: "individual", descripcion: "Habitación individual", capacidad: 1, icono: "🛏️"},
        %{tipo: "doble", descripcion: "Habitación doble", capacidad: 2, icono: "🛏️🛏️"},
        %{tipo: "suite", descripcion: "Suite premium", capacidad: 3, icono: "👑"},
        %{tipo: "familiar", descripcion: "Habitación familiar", capacidad: 4, icono: "👨‍👩‍👧‍👦"},
        %{tipo: "presidencial", descripcion: "Suite presidencial", capacidad: 4, icono: "🏛️"}
      ],
      servicios: [
        %{nombre: "WiFi Gratuito", icono: "📶"},
        %{nombre: "Room Service 24h", icono: "🍽️"},
        %{nombre: "Piscina", icono: "🏊"},
        %{nombre: "Gimnasio", icono: "💪"},
        %{nombre: "Estacionamiento", icono: "🅿️"},
        %{nombre: "Recepción 24h", icono: "🏨"},
        %{nombre: "Lavandería", icono: "👔"},
        %{nombre: "Restaurante", icono: "🍴"}
      ],
      contacto: %{
        telefono: "+51 1 234-5678",
        email: "reservas@hotelflux.pe",
        direccion: "Av. Principal 123, Lima, Perú"
      }
    }
  end

  # ═══════════════════════════════════════════════════════════
  # DISPONIBILIDAD
  # ═══════════════════════════════════════════════════════════

  @doc "GET /publico/disponibilidad — Buscar habitaciones disponibles"
  def disponibilidad(conn, params) do
    with {:ok, fecha_entrada} <- parse_fecha(params["fecha_entrada"]),
         {:ok, fecha_salida} <- parse_fecha(params["fecha_salida"]),
         :ok <- validar_fechas(fecha_entrada, fecha_salida) do

      tipo = Map.get(params, "tipo")
      capacidad_min = parse_int(params["capacidad"], 1)

      disponibles = HabitacionRepo.buscar_disponible(fecha_entrada, fecha_salida)

      filtradas = disponibles
        |> filtrar_por_tipo(tipo)
        |> filtrar_por_capacidad(capacidad_min)
        |> Enum.map(&serializar_habitacion_publica/1)

      conn |> json(%{
        data: %{
          habitaciones: filtradas,
          total: length(filtradas),
          fecha_entrada: to_string(fecha_entrada),
          fecha_salida: to_string(fecha_salida),
          noches: Date.diff(fecha_salida, fecha_entrada)
        }
      })
    else
      {:error, reason} ->
        conn |> put_status(400) |> json(%{error: to_string(reason)})
    end
  end

  @doc "GET /publico/habitaciones/tipos — Tipos de habitación con precios base"
  def tipos_habitacion(conn, _params) do
    habitaciones = HabitacionRepo.listar()

    tipos = habitaciones
      |> Enum.filter(& &1.eliminado == false)
      |> Enum.group_by(& &1.tipo)
      |> Enum.map(fn {tipo, habs} ->
        precios = Enum.map(habs, & &1.precio_noche) |> Enum.filter(& &1)
        %{
          tipo: tipo,
          cantidad_total: length(habs),
          disponibles: Enum.count(habs, & &1.estado == "disponible"),
          precio_desde: if(precios != [], do: Enum.min(precios), else: nil),
          precio_hasta: if(precios != [], do: Enum.max(precios), else: nil)
        }
      end)

    conn |> json(%{data: tipos})
  end

  # ═══════════════════════════════════════════════════════════
  # RESERVAS DE CLIENTES
  # ═══════════════════════════════════════════════════════════

  @doc "POST /publico/reservar — Crear reserva como huésped"
  def crear_reserva(conn, params) do
    with {:ok, huesped} <- crear_o_obtener_huesped(params),
         {:ok, fecha_entrada} <- parse_fecha(params["fecha_entrada"]),
         {:ok, fecha_salida} <- parse_fecha(params["fecha_salida"]),
         :ok <- validar_fechas(fecha_entrada, fecha_salida),
         {:ok, habitacion_id} <- validar_habitacion(params["habitacion_id"]) do

      reserva_params = %{
        "huesped_id" => huesped.id,
        "habitacion_id" => habitacion_id,
        "fecha_entrada" => Date.to_iso8601(fecha_entrada),
        "fecha_salida" => Date.to_iso8601(fecha_salida),
        "notas" => params["notas"] || "",
        "metodo_pago" => params["metodo_pago"] || "tarjeta",
        "servicios_extra" => params["servicios_extra"] || []
      }

      case HotelFlux.UseCases.Saga.ReservaSaga.ejecutar(reserva_params) do
        {:ok, resultado} ->
          Logger.info("[Público] Reserva creada: #{resultado.reserva.id} por #{huesped.nombre}")
          hab = resultado.habitacion
          conn |> put_status(201) |> json(%{
            ok: true,
            reserva: %{
              id: resultado.reserva.id,
              estado: resultado.reserva.estado,
              habitacion_numero: hab.numero,
              habitacion_tipo: hab.tipo,
              fecha_entrada: to_string(resultado.reserva.fecha_entrada),
              fecha_salida: to_string(resultado.reserva.fecha_salida),
              total: to_string(resultado.reserva.total),
              codigo_confirmacion: generar_codigo()
            }
          })
        {:error, %{error: msg}} ->
          conn |> put_status(422) |> json(%{error: msg})
        {:error, reason} ->
          conn |> put_status(422) |> json(%{error: to_string(reason)})
      end
    else
      {:error, reason} ->
        conn |> put_status(400) |> json(%{error: to_string(reason)})
    end
  end

  @doc "GET /publico/reserva/:codigo — Consultar estado de reserva por código"
  def consultar_reserva(conn, %{"id" => id}) do
    case ReservaRepo.obtener(id) do
      {:ok, reserva} ->
        conn |> json(%{data: serializar_reserva_publica(reserva)})
      {:error, _} ->
        conn |> put_status(404) |> json(%{error: "Reserva no encontrada"})
    end
  end

  # ═══════════════════════════════════════════════════════════
  # SERVICIOS Y PRODUCTOS PÚBLICOS
  # ═══════════════════════════════════════════════════════════

  @doc "GET /publico/servicios — Lista de servicios y amenidades"
  def servicios(conn, _params) do
    productos = ProductoRepo.listar()

    servicios = productos
      |> Enum.filter(& &1.disponible && not &1.eliminado)
      |> Enum.group_by(& &1.categoria)
      |> Enum.map(fn {cat, prods} ->
        %{
          categoria: cat,
          productos: Enum.map(prods, fn p ->
            %{id: p.id, nombre: p.nombre, descripcion: p.descripcion, precio: to_string(p.precio)}
          end)
        }
      end)

    conn |> json(%{data: servicios})
  end

  # ═══════════════════════════════════════════════════════════
  # REGISTRO DE HUÉSPEDES
  # ═══════════════════════════════════════════════════════════

  @doc "POST /publico/registro — Registro de nuevo huésped (crea Huesped + Usuario para login)"
  def registro(conn, params) do
    email = String.downcase(params["email"] || "")

    # Verificar email duplicado en ambas tablas
    usuario_existe = Repo.get_by(Usuario, email: email) != nil
    huesped_existe = case HuespedRepo.buscar_por_email(email) do
      {:ok, _} -> true
      _ -> false
    end

    if usuario_existe do
      conn |> put_status(409) |> json(%{error: "El email ya está registrado"})
    else
      huesped_attrs = %{
        "nombre"         => params["nombre"],
        "apellido"       => params["apellido"],
        "email"          => email,
        "telefono"       => params["telefono"],
        "tipo_documento" => params["documento_tipo"] || params["tipo_documento"],
        "documento"      => params["documento"],
        "nacionalidad"   => params["nacionalidad"]
      }

      usuario_attrs = %{
        "nombre" => "#{params["nombre"]} #{params["apellido"]}",
        "email"  => email,
        "password" => params["password"],
        "rol"    => "huesped"
      }

      multi =
        if huesped_existe do
          Multi.new()
          |> Multi.insert(:usuario, Usuario.changeset(%Usuario{}, usuario_attrs))
        else
          Multi.new()
          |> Multi.insert(:huesped, HotelFlux.Domain.Huesped.changeset(%HotelFlux.Domain.Huesped{}, huesped_attrs))
          |> Multi.insert(:usuario, Usuario.changeset(%Usuario{}, usuario_attrs))
        end

      result = Repo.transaction(multi)

      case result do
        {:ok, %{huesped: huesped}} ->
          Logger.info("[Público] Huésped registrado: #{email}")
          conn |> put_status(201) |> json(%{
            ok: true,
            huesped: %{
              id: huesped.id,
              nombre: huesped.nombre,
              apellido: huesped.apellido,
              email: huesped.email
            },
            mensaje: "Registro exitoso. Ya puede iniciar sesión."
          })

        {:ok, %{usuario: usuario}} ->
          Logger.info("[Público] Huésped registrado (cuenta existente): #{email}")
          conn |> put_status(201) |> json(%{
            ok: true,
            huesped: %{nombre: usuario.nombre, email: usuario.email},
            mensaje: "Registro exitoso. Ya puede iniciar sesión."
          })

        {:error, :huesped, changeset, _} ->
          conn |> put_status(422) |> json(%{errors: format_errors(changeset)})

        {:error, :usuario, changeset, _} ->
          conn |> put_status(422) |> json(%{errors: format_errors(changeset)})
      end
    end
  end

  # ═══════════════════════════════════════════════════════════
  # LEGALES (Perú)
  # ═══════════════════════════════════════════════════════════

  @doc "GET /publico/legal/privacidad — Política de privacidad (Ley N° 29733)"
  def politica_privacidad(conn, _params) do
    conn |> json(%{data: politica_privacidad_peru()})
  end

  @doc "GET /publico/legal/terminos — Términos y condiciones"
  def terminos_condiciones(conn, _params) do
    conn |> json(%{data: terminos_peru()})
  end

  @doc "GET /publico/legal/cookies — Política de cookies"
  def politica_cookies(conn, _params) do
    conn |> json(%{data: cookies_peru()})
  end

  # ═══════════════════════════════════════════════════════════
  # FUNCIONES PRIVADAS
  # ═══════════════════════════════════════════════════════════

  defp crear_o_obtener_huesped(params) do
    email = params["email"]
    documento = params["documento"]

    cond do
      email && String.length(email) > 0 ->
        case HuespedRepo.buscar_por_email(email) do
          {:ok, huesped} -> {:ok, huesped}
          {:error, _} -> crear_huesped(params)
        end
      documento && String.length(documento) > 0 ->
        case HuespedRepo.buscar_por_documento(documento) do
          {:ok, huesped} -> {:ok, huesped}
          {:error, _} -> crear_huesped(params)
        end
      true ->
        crear_huesped(params)
    end
  end

  defp crear_huesped(params) do
    HuespedRepo.crear(%{
      "nombre" => params["nombre"] || "Huésped",
      "apellido" => params["apellido"] || "",
      "email" => params["email"],
      "telefono" => params["telefono"],
      "tipo_documento" => params["documento_tipo"] || params["tipo_documento"] || "DNI",
      "documento" => params["documento"],
      "nacionalidad" => params["nacionalidad"] || "PE",
      "notas" => params["notas"]
    })
  end

  defp validar_habitacion(nil), do: {:error, :habitacion_requerida}
  defp validar_habitacion(habitacion_id) do
    case HabitacionRepo.obtener(habitacion_id) do
      {:ok, hab} when hab.estado == "disponible" -> {:ok, hab.id}
      {:ok, _} -> {:error, :habitacion_no_disponible}
      _ -> {:error, :habitacion_no_encontrada}
    end
  end

  defp parse_fecha(nil), do: {:error, :fecha_requerida}
  defp parse_fecha(fecha_str) when is_binary(fecha_str) do
    case Date.from_iso8601(fecha_str) do
      {:ok, fecha} -> {:ok, fecha}
      _ -> {:error, :formato_fecha_invalido}
    end
  end
  defp parse_fecha(%Date{} = fecha), do: {:ok, fecha}

  defp validar_fechas(entrada, salida) do
    cond do
      Date.compare(entrada, Date.utc_today()) == :lt ->
        {:error, :fecha_entrada_pasada}
      Date.compare(salida, entrada) != :gt ->
        {:error, :fecha_salida_debe_ser_posterior}
      Date.diff(salida, entrada) > 30 ->
        {:error, :maximo_30_noches}
      true ->
        :ok
    end
  end

  defp parse_int(nil, default), do: default
  defp parse_int(val, _default) when is_integer(val), do: val
  defp parse_int(val, default) when is_binary(val) do
    case Integer.parse(val) do
      {n, _} -> n
      _ -> default
    end
  end

  defp filtrar_por_tipo(habitaciones, nil), do: habitaciones
  defp filtrar_por_tipo(habitaciones, ""), do: habitaciones
  defp filtrar_por_tipo(habitaciones, tipo), do: Enum.filter(habitaciones, & &1.tipo == tipo)

  defp filtrar_por_capacidad(habitaciones, 1), do: habitaciones
  defp filtrar_por_capacidad(habitaciones, min) do
    Enum.filter(habitaciones, fn h ->
      capacidad = case h.tipo do
        "individual" -> 1
        "doble" -> 2
        "suite" -> 3
        "familiar" -> 4
        "presidencial" -> 4
        _ -> 2
      end
      capacidad >= min
    end)
  end

  defp serializar_habitacion_publica(h) do
    %{
      id: h.id,
      numero: h.numero,
      tipo: h.tipo,
      piso: h.piso,
      precio_noche: if(h.precio_noche, do: to_string(h.precio_noche), else: nil),
      clasificacion: Map.get(h, :clasificacion, nil),
      caracteristicas: Map.get(h, :caracteristicas, nil),
      amenidades: amenidades_por_tipo(h.tipo)
    }
  end

  defp serializar_reserva_publica(r) do
    %{
      id: r.id,
      estado: r.estado,
      fecha_entrada: to_string(r.fecha_entrada),
      fecha_salida: to_string(r.fecha_salida),
      total: if(r.total, do: to_string(r.total), else: nil),
      noches: if(r.fecha_entrada && r.fecha_salida, do: Date.diff(r.fecha_salida, r.fecha_entrada), else: nil)
    }
  end

  defp amenidades_por_tipo("individual"), do: ["WiFi", "TV", "Aire Acondicionado", "Baño privado"]
  defp amenidades_por_tipo("doble"), do: ["WiFi", "TV", "Aire Acondicionado", "Baño privado", "Mini-bar"]
  defp amenidades_por_tipo("suite"), do: ["WiFi", "Smart TV", "Aire Acondicionado", "Jacuzzi", "Mini-bar", "Balcón", "Caja fuerte"]
  defp amenidades_por_tipo("familiar"), do: ["WiFi", "TV", "Aire Acondicionado", "2 Baños", "Mini-bar", "Sala de estar"]
  defp amenidades_por_tipo("presidencial"), do: ["WiFi", "Smart TV 65\"", "Aire Acondicionado", "Jacuzzi", "Mini-bar Premium", "Terraza", "Caja fuerte", "Sala de conferencias", "Butler service"]
  defp amenidades_por_tipo(_), do: ["WiFi", "TV", "Aire Acondicionado"]

  defp generar_codigo do
    :crypto.strong_rand_bytes(4) |> Base.encode16() |> binary_part(0, 8)
  end

  # ═══════════════════════════════════════════════════════════
  # CONTENIDO LEGAL (Perú — Ley N° 29733)
  # ═══════════════════════════════════════════════════════════

  defp politica_privacidad_peru do
    %{
      titulo: "Política de Privacidad",
      version: "1.0",
      fecha_actualizacion: "2025-01-01",
      ley_aplicable: "Ley N° 29733 — Ley de Protección de Datos Personales del Perú",
      reglamento: "Decreto Supremo N° 003-2013-JUS",
      secciones: [
        %{
          titulo: "1. Responsable del Tratamiento",
          contenido: "HotelFlux S.A.C., con domicilio en Lima, Perú, es responsable del tratamiento de sus datos personales conforme a la Ley N° 29733 y su reglamento."
        },
        %{
          titulo: "2. Datos que Recopilamos",
          contenido: "Recopilamos: nombre completo, documento de identidad (DNI/Pasaporte/CE), correo electrónico, teléfono, nacionalidad, datos de reserva y preferencias de estadía. No recopilamos datos sensibles sin consentimiento explícito."
        },
        %{
          titulo: "3. Finalidad del Tratamiento",
          contenido: "Sus datos son tratados para: (a) gestionar su reserva y estadía, (b) cumplir obligaciones legales (SUNAT, migraciones), (c) enviar comunicaciones sobre su reserva, (d) mejorar nuestros servicios, (e) seguridad del establecimiento."
        },
        %{
          titulo: "4. Base Legal",
          contenido: "El tratamiento se basa en: (a) ejecución del contrato de hospedaje, (b) cumplimiento de obligaciones legales, (c) consentimiento del titular para comunicaciones comerciales."
        },
        %{
          titulo: "5. Transferencia de Datos",
          contenido: "Sus datos podrán ser compartidos con: autoridades competentes (SUNAT, Migraciones), procesadores de pago autorizados, y proveedores de servicios bajo acuerdos de confidencialidad. No se realizan transferencias internacionales sin consentimiento."
        },
        %{
          titulo: "6. Derechos ARCO",
          contenido: "Usted tiene derecho de Acceso, Rectificación, Cancelación y Oposición (ARCO) sobre sus datos. Puede ejercerlos enviando solicitud a privacidad@hotelflux.pe o presencialmente. Plazo de respuesta: 10 días hábiles."
        },
        %{
          titulo: "7. Plazo de Conservación",
          contenido: "Sus datos se conservarán durante la relación comercial y hasta 5 años después conforme a obligaciones tributarias y legales peruanas."
        },
        %{
          titulo: "8. Medidas de Seguridad",
          contenido: "Implementamos medidas técnicas y organizativas: cifrado de datos en tránsito (TLS 1.3) y en reposo (AES-256), control de acceso basado en roles, auditoría de accesos, backups cifrados."
        },
        %{
          titulo: "9. Autoridad de Control",
          contenido: "Puede presentar reclamación ante la Autoridad Nacional de Protección de Datos Personales (ANPDP) del Ministerio de Justicia y Derechos Humanos del Perú."
        }
      ]
    }
  end

  defp terminos_peru do
    %{
      titulo: "Términos y Condiciones",
      version: "1.0",
      fecha_actualizacion: "2025-01-01",
      secciones: [
        %{
          titulo: "1. Objeto",
          contenido: "Estos términos regulan el uso del sistema de reservas en línea de HotelFlux y la prestación del servicio de hospedaje conforme a la legislación peruana."
        },
        %{
          titulo: "2. Reservas",
          contenido: "La reserva se confirma al completar el proceso en línea. El hotel se reserva el derecho de solicitar documentos de identidad al momento del check-in. Las tarifas incluyen IGV (18%)."
        },
        %{
          titulo: "3. Check-in / Check-out",
          contenido: "Check-in: a partir de las 14:00 horas. Check-out: hasta las 12:00 horas. Se requiere documento de identidad vigente. Early check-in y late check-out sujetos a disponibilidad y recargo adicional."
        },
        %{
          titulo: "4. Cancelaciones",
          contenido: "Cancelación gratuita hasta 48 horas antes del check-in. Cancelaciones tardías: cargo del 50% de la primera noche. No-show: cargo del 100% de la primera noche."
        },
        %{
          titulo: "5. Responsabilidades del Huésped",
          contenido: "El huésped se compromete a: usar las instalaciones de manera adecuada, respetar horarios de silencio (22:00-07:00), no fumar en áreas no habilitadas, reportar daños. Daños a la propiedad serán cargados a la cuenta."
        },
        %{
          titulo: "6. Responsabilidades del Hotel",
          contenido: "El hotel garantiza: limpieza diaria, funcionamiento de servicios básicos, seguridad de las instalaciones, atención 24 horas. El hotel dispone de libro de reclamaciones conforme al Código de Protección al Consumidor."
        },
        %{
          titulo: "7. Pagos",
          contenido: "Aceptamos efectivo (PEN/USD), tarjetas de crédito/débito, transferencias bancarias. Los precios están expresados en Soles (PEN) e incluyen IGV. Se emite comprobante de pago electrónico."
        },
        %{
          titulo: "8. Libro de Reclamaciones",
          contenido: "Conforme al artículo 150° del Código de Protección al Consumidor (Ley N° 29571), el hotel pone a disposición el Libro de Reclamaciones físico y virtual."
        },
        %{
          titulo: "9. Resolución de Controversias",
          contenido: "Las controversias se resolverán preferentemente por conciliación. En caso de no acuerdo, serán competentes los jueces de Lima, Perú. Aplica el Código de Protección al Consumidor."
        },
        %{
          titulo: "10. Ley Aplicable",
          contenido: "Estos términos se rigen por las leyes de la República del Perú."
        }
      ]
    }
  end

  defp cookies_peru do
    %{
      titulo: "Política de Cookies",
      version: "1.0",
      fecha_actualizacion: "2025-01-01",
      secciones: [
        %{
          titulo: "1. ¿Qué son las cookies?",
          contenido: "Las cookies son pequeños archivos de texto que se almacenan en su dispositivo cuando visita nuestro sitio web."
        },
        %{
          titulo: "2. Cookies que utilizamos",
          contenido: "Cookies estrictamente necesarias: sesión de usuario, token de autenticación, preferencias de idioma. Cookies de rendimiento: análisis de uso anónimo. Cookies funcionales: recordar preferencias de búsqueda."
        },
        %{
          titulo: "3. Base Legal",
          contenido: "Las cookies estrictamente necesarias no requieren consentimiento. Para las demás, solicitamos su consentimiento explícito conforme a la Ley N° 29733."
        },
        %{
          titulo: "4. Gestión de Cookies",
          contenido: "Puede configurar su navegador para rechazar cookies. Tenga en cuenta que deshabilitar cookies necesarias puede afectar la funcionalidad del sistema de reservas."
        },
        %{
          titulo: "5. Cookies de Terceros",
          contenido: "No utilizamos cookies de terceros para publicidad. Solo utilizamos servicios de análisis anónimo para mejorar la experiencia del usuario."
        }
      ]
    }
  end

  defp format_errors(changeset) do
    Ecto.Changeset.traverse_errors(changeset, fn {msg, opts} ->
      Enum.reduce(opts, msg, fn {key, value}, acc ->
        String.replace(acc, "%{#{key}}", to_string(value))
      end)
    end)
  end
end
