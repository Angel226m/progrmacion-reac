defmodule HotelFlux.UseCases.Saga.ReservaSaga do
  @moduledoc """
  🔥 SAGA REACTIVA DE RESERVAS — Patrón Saga con compensación automática.

  Demuestra conceptos clave de Programación Funcional y Reactiva:

  1. **Pattern matching funcional**: El `with` de Elixir maneja el flujo
     de errores de forma declarativa, sin if/else manuales.
  2. **Funciones puras en pipeline**: Cada paso es una función que recibe
     datos y devuelve {:ok, datos} o {:error, razon}.
  3. **Compensación automática**: Si un paso falla, todos los anteriores
     se compensan en orden inverso.
  4. **Broadcast reactivo**: Cada paso emite un evento al PubSub que llega
     al frontend en tiempo real vía WebSocket.
  5. **Event Sourcing**: Cada paso registra un evento inmutable.

  ## Pasos de la Saga:
  1. verificar_disponibilidad → busca habitación libre
  2. bloquear_habitacion → bloquea temporalmente (Redis lock)
  3. procesar_pago → cobra al cliente
  4. crear_reserva → registra en BD
  5. enviar_confirmacion → email al cliente (retry con Oban si falla)

  ## Compensaciones:
  - Falla paso 3 (pago): libera bloqueo
  - Falla paso 4 (BD): reversa pago + libera bloqueo
  - Falla paso 5 (email): reserva queda creada, reintenta con Oban
  """

  alias HotelFlux.Repo
  alias HotelFlux.Domain.{Evento, Pago}
  alias HotelFlux.Events.ReservaCreada
  alias HotelFlux.Adapters.Repos.{HabitacionRepo, ReservaRepo, ConsumoRepo}
  alias HotelFlux.Adapters.Pagos.PagoAdapter
  alias HotelFlux.Adapters.Email.EmailAdapter

  require Logger

  @doc """
  Ejecuta la Saga completa de reserva.

  Pipeline funcional con `with`:
    verificar → bloquear → pagar → crear → confirmar

  Si cualquier paso falla, se ejecuta la compensación correspondiente.
  Cada paso emite un broadcast reactivo al frontend.
  """
  def ejecutar(params) do
    saga_id = UUID.uuid4()
    broadcast_paso(saga_id, "iniciada", %{params: sanitize_params(params)})

    with {:ok, habitacion} <- verificar_disponibilidad(saga_id, params),
         {:ok, _bloqueo} <- bloquear_habitacion(saga_id, habitacion),
         monto            = calcular_monto(habitacion, params),
         params_con_monto = Map.put(params, "monto", monto),
         {:ok, pago}     <- procesar_pago(saga_id, params_con_monto),
         {:ok, reserva}  <- crear_reserva(saga_id, habitacion, pago, params_con_monto),
         {:ok, _email}   <- enviar_confirmacion(saga_id, reserva) do

      # Saga completada exitosamente
      broadcast_paso(saga_id, "completada", %{reserva_id: reserva.id})
      registrar_evento(reserva)

      {:ok, %{saga_id: saga_id, reserva: reserva, habitacion: habitacion}}
    else
      # --- COMPENSACIONES AUTOMÁTICAS ---

      {:error, :sin_disponibilidad} ->
        broadcast_paso(saga_id, "error_disponibilidad", %{
          mensaje: "No hay habitaciones disponibles para esas fechas"
        })
        {:error, %{saga_id: saga_id, error: "No hay habitaciones disponibles"}}

      {:error, :bloqueo_fallido} ->
        broadcast_paso(saga_id, "error_bloqueo", %{
          mensaje: "No se pudo reservar la habitación. Intente nuevamente."
        })
        {:error, %{saga_id: saga_id, error: "Habitación no disponible momentáneamente"}}

      {:error, :pago_fallido, habitacion_id} ->
        # COMPENSACIÓN: liberar bloqueo de habitación
        Logger.warning("[Saga #{saga_id}] Pago fallido — compensando: liberando bloqueo")
        liberar_bloqueo(habitacion_id)
        broadcast_paso(saga_id, "error_pago_compensado", %{
          mensaje: "Pago rechazado. La habitación fue liberada automáticamente.",
          compensacion: "bloqueo_liberado"
        })
        {:error, %{saga_id: saga_id, error: "Pago rechazado"}}

      {:error, :error_bd, pago_id, habitacion_id} ->
        # COMPENSACIÓN: reversar pago + liberar bloqueo
        Logger.warning("[Saga #{saga_id}] Error BD — compensando: reversando pago + liberando bloqueo")
        PagoAdapter.reversar_pago(pago_id)
        liberar_bloqueo(habitacion_id)
        broadcast_paso(saga_id, "error_bd_compensado", %{
          mensaje: "Error al crear reserva. Pago reversado automáticamente.",
          compensacion: "pago_reversado_y_bloqueo_liberado"
        })
        {:error, %{saga_id: saga_id, error: "Error interno, pago reversado"}}

      {:error, :email_fallido, reserva} ->
        # La reserva se creó exitosamente — reintenta email con Oban
        Logger.warning("[Saga #{saga_id}] Email fallido — reintentando con Oban")
        programar_reintento_email(reserva)
        broadcast_paso(saga_id, "completada_sin_email", %{
          reserva_id: reserva.id,
          mensaje: "Reserva creada. Email de confirmación se enviará pronto."
        })
        {:ok, %{saga_id: saga_id, reserva: reserva, email_pendiente: true}}
    end
  end

  # ---- PASO 1: Verificar disponibilidad (función pura + query) ----
  defp verificar_disponibilidad(saga_id, params) do
    broadcast_paso(saga_id, "verificando_disponibilidad", %{
      habitacion_id: params["habitacion_id"],
      tipo: params["tipo_habitacion"]
    })

    fecha_entrada = Date.from_iso8601!(params["fecha_entrada"])
    fecha_salida  = Date.from_iso8601!(params["fecha_salida"])

    result =
      cond do
        id = params["habitacion_id"] ->
          case HabitacionRepo.obtener(id) do
            {:ok, %{estado: estado} = hab} when estado not in ["mantenimiento", "fuera_de_servicio"] ->
              if HabitacionRepo.esta_disponible?(id, fecha_entrada, fecha_salida) do
                {:ok, hab}
              else
                {:error, :sin_disponibilidad}
              end
            {:ok, hab} ->
              Logger.warning("[Saga #{saga_id}] Habitación #{id} existe pero estado inválido: #{hab.estado}")
              {:error, :sin_disponibilidad}
            {:error, :not_found} ->
              Logger.error("[Saga #{saga_id}] Habitación #{id} NO EXISTE en la BD")
              {:error, :sin_disponibilidad}
            {:error, :eliminado} ->
              Logger.warning("[Saga #{saga_id}] Habitación #{id} está eliminada")
              {:error, :sin_disponibilidad}
            {:error, reason} ->
              Logger.error("[Saga #{saga_id}] Error al obtener habitación #{id}: #{inspect(reason)}")
              {:error, :sin_disponibilidad}
          end

        tipo = params["tipo_habitacion"] ->
          HabitacionRepo.buscar_disponible(tipo, fecha_entrada, fecha_salida)

        true ->
          {:error, :sin_disponibilidad}
      end

    case result do
      {:ok, habitacion} ->
        broadcast_paso(saga_id, "disponibilidad_ok", %{
          habitacion_id: habitacion.id,
          numero: habitacion.numero
        })
        {:ok, habitacion}

      {:error, :sin_disponibilidad} ->
        {:error, :sin_disponibilidad}
    end
  end

  # ---- HELPER: Calcular monto total (habitación + servicios extra) ----
  defp calcular_monto(habitacion, params) do
    noches = Date.diff(
      Date.from_iso8601!(params["fecha_salida"]),
      Date.from_iso8601!(params["fecha_entrada"])
    )
    room_total = Decimal.mult(habitacion.precio_noche, noches)

    servicios_total =
      (params["servicios_extra"] || [])
      |> Enum.reduce(Decimal.new("0"), fn s, acc ->
        precio = Decimal.new(to_string(s["precio"] || "0"))
        cantidad = s["cantidad"] || 1
        Decimal.add(acc, Decimal.mult(precio, cantidad))
      end)

    Decimal.add(room_total, servicios_total)
  end

  # ---- PASO 2: Bloquear habitación (Redis lock para evitar doble reserva) ----
  defp bloquear_habitacion(saga_id, habitacion) do
    broadcast_paso(saga_id, "bloqueando_habitacion", %{habitacion_id: habitacion.id})

    lock_key = "lock:habitacion:#{habitacion.id}"

    case Redix.command(:redix, ["SET", lock_key, saga_id, "NX", "EX", "300"]) do
      {:ok, "OK"} ->
        broadcast_paso(saga_id, "habitacion_bloqueada", %{habitacion_id: habitacion.id})
        {:ok, :bloqueada}

      _ ->
        {:error, :bloqueo_fallido}
    end
  end

  # ---- PASO 3: Procesar pago ----
  defp procesar_pago(saga_id, params) do
    broadcast_paso(saga_id, "procesando_pago", %{monto: params["monto"]})

    case PagoAdapter.procesar_pago(%{
      monto: params["monto"],
      metodo: params["metodo_pago"] || "tarjeta",
      referencia: saga_id
    }) do
      {:ok, pago} ->
        broadcast_paso(saga_id, "pago_ok", %{pago_id: pago.id})
        {:ok, pago}

      {:error, _reason} ->
        {:error, :pago_fallido, params["habitacion_id"]}
    end
  end

  # ---- PASO 4: Crear reserva en BD ----
  defp crear_reserva(saga_id, habitacion, pago, params) do
    broadcast_paso(saga_id, "creando_reserva", %{})

    attrs = %{
      huesped_id: params["huesped_id"],
      habitacion_id: habitacion.id,
      fecha_entrada: params["fecha_entrada"],
      fecha_salida: params["fecha_salida"],
      total: params["monto"],
      notas: params["notas"],
      estado: "confirmada"
    }

    case ReservaRepo.crear(attrs) do
      {:ok, reserva} ->
        # Vincular pago a la reserva recién creada
        Repo.get(Pago, pago.id)
        |> Pago.changeset(%{reserva_id: reserva.id})
        |> Repo.update()
        # Registrar consumos de servicios extra
        Enum.each(params["servicios_extra"] || [], fn s ->
          precio = Decimal.new(to_string(s["precio"] || "0"))
          cantidad = s["cantidad"] || 1
          ConsumoRepo.crear(%{
            reserva_id: reserva.id,
            producto_id: s["id"],
            cantidad: cantidad,
            precio_unitario: precio,
            total: Decimal.mult(precio, cantidad),
            estado: "pendiente"
          })
        end)
        # Actualizar estado de la habitación a "reservada" (broadcast reactivo incluido)
        HabitacionRepo.cambiar_estado(habitacion.id, "reservada")
        broadcast_paso(saga_id, "reserva_creada", %{reserva_id: reserva.id})
        {:ok, reserva}

      {:error, _changeset} ->
        {:error, :error_bd, pago.id, habitacion.id}
    end
  end

  # ---- PASO 5: Enviar confirmación por email ----
  defp enviar_confirmacion(saga_id, reserva) do
    broadcast_paso(saga_id, "enviando_confirmacion", %{})

    case EmailAdapter.enviar_email_confirmacion(reserva) do
      {:ok, _} ->
        broadcast_paso(saga_id, "confirmacion_enviada", %{})
        {:ok, :email_enviado}

      {:error, _reason} ->
        {:error, :email_fallido, reserva}
    end
  end

  # ---- COMPENSACIONES ----

  defp liberar_bloqueo(habitacion_id) do
    lock_key = "lock:habitacion:#{habitacion_id}"
    Redix.command(:redix, ["DEL", lock_key])
  end

  defp programar_reintento_email(reserva) do
    # Oban job para reintentar email
    %{reserva_id: reserva.id}
    |> HotelFlux.Workers.EmailWorker.new(schedule_in: 60)
    |> Oban.insert()
  end

  # ---- BROADCAST REACTIVO ----

  # Emite progreso de la Saga al PubSub — llega a todos los frontends conectados.
  defp broadcast_paso(saga_id, paso, datos) do
    Phoenix.PubSub.broadcast(
      HotelFlux.PubSub,
      "saga:#{saga_id}",
      {:saga_paso, %{
        saga_id: saga_id,
        paso: paso,
        datos: datos,
        timestamp: DateTime.utc_now()
      }}
    )

    # También emitir al topic general de reservas
    Phoenix.PubSub.broadcast(
      HotelFlux.PubSub,
      "reservas",
      {:saga_progreso, %{saga_id: saga_id, paso: paso}}
    )
  end

  # ---- EVENT SOURCING ----

  defp registrar_evento(reserva) do
    evento = ReservaCreada.nuevo(reserva)
    changeset = Evento.changeset(%Evento{}, Map.from_struct(evento))
    Repo.insert(changeset)
  end

  # Sanitiza parámetros para broadcast (no enviar datos sensibles)
  defp sanitize_params(params) do
    Map.drop(params, ["metodo_pago", "numero_tarjeta"])
  end
end
