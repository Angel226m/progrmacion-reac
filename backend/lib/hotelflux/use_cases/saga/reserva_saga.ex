defmodule HotelFlux.UseCases.Saga.ReservaSaga do
  @moduledoc """
  Saga de reservas — Coreografía de eventos pura.

  ## Principios FRP aplicados
  - Sin if/else/switch: pattern matching en cláusulas de función
  - ADT (Algebraic Data Type) para pasos de saga
  - Inyección de dependencias funcional (HOF)
  - Efectos secundarios separados al final del pipeline
  - Compensaciones como datos, no como lógica imperativa
  - Idempotencia via idempotency_key
  - Inmutabilidad total: todos los retornos son nuevos structs
  """

  alias HotelFlux.Domain.{Evento, Result}

  # ───────────────────────────────────────────────────────────
  # ADT — Tipos algebraicos para pasos de la saga
  # ───────────────────────────────────────────────────────────

  @tipo_paso %{
    parsear_fechas: 1,
    verificar_disponibilidad: 2,
    bloquear_habitacion: 3,
    procesar_pago: 4,
    crear_reserva: 5,
    enviar_confirmacion: 6,
    completada: 7
  }

  defp liberar_bloqueo_compensacion(saga, _paso) do
    saga.datos
    |> Map.get(:habitacion, %{})
    |> Map.get(:id)
    |> case do
      nil -> saga
      hab_id ->
        saga.adapter_liberar.("habitacion:#{hab_id}")
        saga
    end
  end

  defp reversar_pago_y_bloqueo(saga, _paso) do
    saga = liberar_bloqueo_compensacion(saga, nil)
    case Map.fetch(saga.datos, :pago) do
      {:ok, %{id: pago_id}} ->
        saga.adapter_reversar.(pago_id)
        saga
      :error -> saga
    end
  end

  defp compensaciones do
    %{
      procesar_pago: fn saga, paso -> liberar_bloqueo_compensacion(saga, paso) end,
      bloquear_habitacion: fn saga, paso -> liberar_bloqueo_compensacion(saga, paso) end,
      crear_reserva: fn saga, paso -> reversar_pago_y_bloqueo(saga, paso) end,
    }
  end

  defstruct [:saga_id, :paso_actual, :pasos_completados, :datos, :adapter_pago, :adapter_reversar,
    :adapter_email, :adapter_bloqueo, :adapter_liberar, :habitacion_repo, :reserva_repo,
    :consumo_repo, :pubsub, :broadcast_fn, :usuario, :ip]

  @type t :: %__MODULE__{
    saga_id: String.t(),
    paso_actual: atom(),
    pasos_completados: [atom()],
    datos: map(),
    adapter_pago: fun(),
    adapter_reversar: fun(),
    adapter_email: fun(),
    adapter_bloqueo: fun(),
    adapter_liberar: fun(),
    habitacion_repo: atom(),
    reserva_repo: atom(),
    consumo_repo: atom(),
    pubsub: atom(),
    broadcast_fn: fun(),
    usuario: String.t() | nil,
    ip: String.t() | nil
  }

  # ───────────────────────────────────────────────────────────
  # PUNTO DE ENTRADA — construye saga con DI y ejecuta pipeline
  # ───────────────────────────────────────────────────────────

  def ejecutar(params, opts \\ []) do
    saga = %__MODULE__{
      saga_id: UUID.uuid4(),
      paso_actual: nil,
      pasos_completados: [],
      datos: %{params: params},
      adapter_pago: Keyword.get(opts, :pago_adapter, &HotelFlux.Adapters.Pagos.PagoAdapter.procesar_pago/1),
      adapter_reversar: Keyword.get(opts, :reversar_adapter, &HotelFlux.Adapters.Pagos.PagoAdapter.reversar_pago/1),
      adapter_email: Keyword.get(opts, :email_adapter, &HotelFlux.Adapters.Email.EmailAdapter.enviar_email_confirmacion/1),
      adapter_bloqueo: Keyword.get(opts, :bloqueo_adapter, &HotelFlux.Adapters.Cache.RedisCache.adquirir_bloqueo/3),
      adapter_liberar: Keyword.get(opts, :liberar_adapter, &HotelFlux.Adapters.Cache.RedisCache.liberar_bloqueo/1),
      habitacion_repo: Keyword.get(opts, :habitacion_repo, HotelFlux.Adapters.Repos.HabitacionRepo),
      reserva_repo: Keyword.get(opts, :reserva_repo, HotelFlux.Adapters.Repos.ReservaRepo),
      consumo_repo: Keyword.get(opts, :consumo_repo, HotelFlux.Adapters.Repos.ConsumoRepo),
      pubsub: Keyword.get(opts, :pubsub, HotelFlux.PubSub),
      broadcast_fn: Keyword.get(opts, :broadcast, &broadcast_paso/3),
      usuario: Keyword.get(opts, :usuario),
      ip: Keyword.get(opts, :ip)
    }

    saga_con_idempotencia = verificar_idempotencia(saga, params["idempotency_key"])
    saga_con_idempotencia
    |> ejecutar_paso(:parsear_fechas)
    |> ejecutar_paso(:verificar_disponibilidad)
    |> ejecutar_paso(:bloquear_habitacion)
    |> ejecutar_paso(:procesar_pago)
    |> ejecutar_paso(:crear_reserva)
    |> ejecutar_paso(:enviar_confirmacion)
    |> aplicar_efectos_finales()
  end

  # ───────────────────────────────────────────────────────────
  # IDEMPOTENCIA — pattern matching en 2 cláusulas
  # ───────────────────────────────────────────────────────────

  defp verificar_idempotencia(saga, key) when is_binary(key) and byte_size(key) > 0 do
    case HotelFlux.Adapters.Cache.RedisCache.get("idempotency:#{key}") do
      {:ok, resultado} -> %{saga | datos: Map.put(saga.datos, :idempotency_resultado, resultado)}
      {:error, :not_found} -> saga
    end
  end
  defp verificar_idempotencia(saga, _key), do: saga

  # ───────────────────────────────────────────────────────────
  # EJECUTOR DE PASOS — pipeline puro con pattern matching en 3 cláusulas
  # ───────────────────────────────────────────────────────────

  # Caso 1: saga ya en error → no ejecuta más pasos (short-circuit)
  defp ejecutar_paso(%__MODULE__{paso_actual: :error} = saga, _nombre_paso), do: saga

  # Caso 2: ya tiene idempotency_resultado → saltea
  defp ejecutar_paso(%__MODULE__{datos: %{idempotency_resultado: _}} = saga, _nombre_paso), do: saga

  # Caso 3: paso normal — ejecuta y bifurca por resultado
  defp ejecutar_paso(%__MODULE__{} = saga, nombre_paso) do
    fn_paso = obtener_fn_paso(nombre_paso)

    case fn_paso.(saga) do
      {:ok, saga_ok} ->
        broadcast_paso(saga.pubsub, saga.saga_id, nombre_paso, :completado, %{})
        %{saga_ok | paso_actual: nombre_paso, pasos_completados: [nombre_paso | saga_ok.pasos_completados]}

      {:error, error} ->
        broadcast_paso(saga.pubsub, saga.saga_id, nombre_paso, :fallido, %{error: error})
        saga_error = %{saga | paso_actual: :error, datos: Map.put(saga.datos, :error, error)}
        ejecutar_compensaciones(saga_error, saga.pasos_completados)
    end
  end

  # ───────────────────────────────────────────────────────────
  # MAPA POLIMÓRFICO — función por paso (sin case)
  # ───────────────────────────────────────────────────────────

  defp obtener_fn_paso(:parsear_fechas), do: &parsear_fechas/1
  defp obtener_fn_paso(:verificar_disponibilidad), do: &verificar_disponibilidad/1
  defp obtener_fn_paso(:bloquear_habitacion), do: &bloquear_habitacion/1
  defp obtener_fn_paso(:procesar_pago), do: &procesar_pago/1
  defp obtener_fn_paso(:crear_reserva), do: &crear_reserva/1
  defp obtener_fn_paso(:enviar_confirmacion), do: &enviar_confirmacion/1

  # ───────────────────────────────────────────────────────────
  # COMPENSACIONES — data-driven (mapa de funciones, sin case)
  # ───────────────────────────────────────────────────────────

  # Caso base: no hay más pasos que compensar
  defp ejecutar_compensaciones(saga, []), do: saga

  defp ejecutar_compensaciones(saga, [paso | resto]) do
    saga_compensado = case Map.fetch(compensaciones(), paso) do
      {:ok, fn_compensacion} -> fn_compensacion.(saga, paso)
      :error -> saga
    end
    broadcast_paso(saga_compensado.pubsub, saga_compensado.saga_id, paso, :compensado, %{})
    ejecutar_compensaciones(saga_compensado, resto)
  end

  # ───────────────────────────────────────────────────────────
  # EFECTOS FINALES — broadcasting, persistencia, schedule
  # ───────────────────────────────────────────────────────────

  defp aplicar_efectos_finales(%__MODULE__{paso_actual: :error} = saga) do
    {:error, %{saga_id: saga.saga_id, error: saga.datos[:error] || :error_desconocido,
      pasos_completados: saga.pasos_completados}}
  end

  defp aplicar_efectos_finales(saga) do
    saga.broadcast_fn.(saga.saga_id, :completada, %{reserva_id: saga.datos.reserva.id})

    guardar_idempotencia(saga)
    evento = HotelFlux.Events.ReservaCreada.nuevo(saga.datos.reserva, saga.usuario, saga.ip)
    HotelFlux.Repo.insert(Evento.changeset(%Evento{}, Map.from_struct(evento)))

    programar_reintento_si_fallo_email(saga)

    {:ok, %{saga_id: saga.saga_id, reserva: saga.datos.reserva,
      habitacion: saga.datos.habitacion, email_pendiente: saga.datos.email_enviado == false}}
  end

  # Guarda clave de idempotencia si existe
  defp guardar_idempotencia(%{datos: %{params: %{"idempotency_key" => key}}} = saga) when is_binary(key) do
    HotelFlux.Adapters.Cache.RedisCache.set("idempotency:#{key}",
      %{saga_id: saga.saga_id, reserva_id: saga.datos.reserva.id}, 86_400)
  end
  defp guardar_idempotencia(_saga), do: :ok

  # Programa reintento de email si falló el envío
  defp programar_reintento_si_fallo_email(%{datos: %{email_enviado: false, reserva: res}} = _saga) do
    %{reserva_id: res.id}
    |> HotelFlux.Workers.EmailWorker.new(schedule_in: 60)
    |> Oban.insert()
  end
  defp programar_reintento_si_fallo_email(_saga), do: :ok

  # ───────────────────────────────────────────────────────────
  # PASOS DE LA SAGA — cada uno es una función pura con pattern matching
  # ───────────────────────────────────────────────────────────

  # --- PARSEAR FECHAS ---
  defp parsear_fechas(%__MODULE__{datos: %{params: %{"fecha_entrada" => fe, "fecha_salida" => fs}}} = saga) do
    with {:ok, entrada} <- Date.from_iso8601(fe),
         {:ok, salida} <- Date.from_iso8601(fs),
         {:ok, _} <- validar_orden_fechas(entrada, salida) do
      {:ok, %{saga | datos: Map.put(saga.datos, :fechas, %{entrada: entrada, salida: salida})}}
    else
      _ -> {:error, :fechas_invalidas}
    end
  end
  defp parsear_fechas(%__MODULE__{datos: %{fechas: %{entrada: %Date{} = e, salida: %Date{} = s}}} = saga) do
    with {:ok, _} <- validar_orden_fechas(e, s) do
      {:ok, saga}
    end
  end
  defp parsear_fechas(_saga), do: {:error, :fechas_invalidas}

  defp validar_orden_fechas(entrada, salida) do
    case Date.compare(entrada, salida) do
      :lt -> {:ok, :valido}
      _ -> {:error, :fechas_invalidas}
    end
  end

  # --- VERIFICAR DISPONIBILIDAD ---
  defp verificar_disponibilidad(%__MODULE__{datos: %{params: %{"habitacion_id" => id}} = datos,
    habitacion_repo: repo} = saga) when is_binary(id) and byte_size(id) > 0 do
    with {:ok, hab} <- repo.obtener(id),
         :ok <- validar_estado_hab(hab),
         {:ok, fechas} <- Map.fetch(datos, :fechas),
         {:ok, true} <- {:ok, repo.esta_disponible?(id, fechas.entrada, fechas.salida)} do
      {:ok, %{saga | datos: Map.put(datos, :habitacion, hab)}}
    else
      {:ok, false} -> {:error, :sin_disponibilidad}
      _ -> {:error, :sin_disponibilidad}
    end
  end

  defp verificar_disponibilidad(%__MODULE__{datos: %{params: %{"tipo_habitacion" => tipo}} = datos,
    habitacion_repo: repo} = saga) when is_binary(tipo) do
    with {:ok, fechas} <- Map.fetch(datos, :fechas),
         {:ok, hab} <- repo.buscar_disponible(tipo, fechas.entrada, fechas.salida) do
      {:ok, %{saga | datos: Map.put(datos, :habitacion, hab)}}
    else
      _ -> {:error, :sin_disponibilidad}
    end
  end
  defp verificar_disponibilidad(_saga), do: {:error, :sin_disponibilidad}

  defp validar_estado_hab(%{estado: "disponible"}), do: :ok
  defp validar_estado_hab(%{estado: "reservada"}), do: :ok
  defp validar_estado_hab(%{estado: "ocupada"}), do: :ok
  defp validar_estado_hab(_), do: {:error, :estado_invalido}

  # --- BLOQUEAR HABITACIÓN ---
  defp bloquear_habitacion(%__MODULE__{datos: %{habitacion: %{id: hab_id}} = datos,
    adapter_bloqueo: bloqueo} = saga) do
    case bloqueo.("habitacion:#{hab_id}", "saga", 300) do
      {:ok, _} -> {:ok, %{saga | datos: Map.put(datos, :bloqueo_id, hab_id)}}
      {:error, _} -> {:error, :bloqueo_fallido}
    end
  end
  defp bloquear_habitacion(_saga), do: {:error, :bloqueo_fallido}

  # --- PROCESAR PAGO ---
  defp procesar_pago(%__MODULE__{datos: %{params: p, habitacion: hab, fechas: fechas} = datos,
    adapter_pago: pago_fn} = saga) do
    noches = Date.diff(fechas.salida, fechas.entrada)
    monto = Decimal.mult(hab.precio_noche, noches)
    |> Decimal.add(calcular_servicios(p["servicios_extra"] || []))
    metodo = Map.get(p, "metodo_pago", "tarjeta")
    case pago_fn.(%{monto: monto, metodo: metodo, referencia: UUID.uuid4()}) do
      {:ok, pago} -> {:ok, %{saga | datos: Map.put(datos, :pago, pago)}}
      {:error, _} -> {:error, :pago_fallido}
    end
  end

  # Con monto explícito
  defp procesar_pago(%__MODULE__{datos: %{params: %{"monto" => monto_str}} = datos,
    adapter_pago: pago_fn} = saga) do
    monto = Decimal.new(to_string(monto_str))
    metodo = Map.get(datos.params, "metodo_pago", "tarjeta")
    case pago_fn.(%{monto: monto, metodo: metodo, referencia: UUID.uuid4()}) do
      {:ok, pago} -> {:ok, %{saga | datos: Map.put(datos, :pago, pago)}}
      {:error, _} -> {:error, :pago_fallido}
    end
  end
  defp procesar_pago(_saga), do: {:error, :pago_fallido}

  defp calcular_servicios([]), do: Decimal.new("0")
  defp calcular_servicios(servicios) do
    servicios
    |> Enum.map(fn s ->
      precio = Map.get(s, "precio") || Map.get(s, :precio) || Decimal.new("0")
      precio = Decimal.new(to_string(precio))
      cantidad = Map.get(s, "cantidad") || Map.get(s, :cantidad) || 1
      Decimal.mult(precio, Decimal.new(to_string(cantidad)))
    end)
    |> Enum.reduce(Decimal.new("0"), &Decimal.add/2)
  end

  # --- CREAR RESERVA ---
  defp crear_reserva(%__MODULE__{datos: %{habitacion: hab, pago: pago, fechas: _fechas} = datos,
    reserva_repo: rr, habitacion_repo: hr, consumo_repo: cr} = saga) do
    multi = Ecto.Multi.new()
    |> Ecto.Multi.run(:reserva, fn _repo, _ -> rr.crear(%{
      huesped_id: datos.params["huesped_id"],
      habitacion_id: hab.id,
      fecha_entrada: datos.params["fecha_entrada"],
      fecha_salida: datos.params["fecha_salida"],
      total: pago.monto,
      notas: datos.params["notas"],
      estado: "confirmada"}) end)
    |> Ecto.Multi.run(:vincular_pago, fn _repo, %{reserva: r} ->
      with pago_id when not is_nil(pago_id) <- Map.get(pago, :id),
           {:ok, pago_db} <- HotelFlux.Adapters.Repos.PagoRepo.obtener(pago_id) do
        HotelFlux.Adapters.Repos.PagoRepo.actualizar(pago_db, %{reserva_id: r.id})
      else
        nil -> {:error, :pago_sin_id}
        _ -> {:error, :pago_no_encontrado}
      end end)
    |> Ecto.Multi.run(:cambiar_estado_hab, fn _repo, _ -> hr.cambiar_estado(hab.id, "reservada") end)
    |> incluir_consumos_extra(datos.params["servicios_extra"] || [], cr)

    case HotelFlux.Repo.transaction(multi) do
      {:ok, %{reserva: reserva}} -> {:ok, %{saga | datos: Map.put(datos, :reserva, reserva)}}
      {:error, _, _, _} -> {:error, :error_bd}
    end
  end

  defp incluir_consumos_extra(multi, [], _cr), do: Ecto.Multi.run(multi, :sin_consumos, fn _repo, _ -> {:ok, %{}} end)
  defp incluir_consumos_extra(multi, servicios, cr) do
    servicios
    |> Enum.filter(&(&1))
    |> Enum.reduce(multi, fn s, acc_multi ->
      precio = Map.get(s, "precio") || Map.get(s, :precio) || Decimal.new("0")
      precio_dec = if is_binary(precio), do: Decimal.new(precio), else: precio
      cantidad = Map.get(s, "cantidad") || Map.get(s, :cantidad) || 1
      prod_id = Map.get(s, "producto_id") || Map.get(s, "id") || Map.get(s, :producto_id) || Map.get(s, :id)
      case prod_id do
        nil -> acc_multi
        pid ->
          Ecto.Multi.run(acc_multi, :"consumo_#{pid}_#{:erlang.unique_integer([:positive])}",
            fn _repo, %{reserva: r} ->
              cr.crear(%{reserva_id: r.id, producto_id: pid, cantidad: cantidad,
                precio_unitario: precio_dec,
                total: Decimal.mult(precio_dec, Decimal.new(to_string(cantidad))),
                estado: "pendiente"})
            end)
      end
    end)
  end

  # --- ENVIAR CONFIRMACIÓN ---
  defp enviar_confirmacion(%__MODULE__{datos: %{reserva: %{id: _}} = datos,
    adapter_email: email_fn} = saga) do
    case email_fn.(datos.reserva) do
      {:ok, _} -> {:ok, %{saga | datos: Map.put(datos, :email_enviado, true)}}
      {:error, _} -> {:ok, %{saga | datos: Map.put(datos, :email_enviado, false)}}
    end
  end
  defp enviar_confirmacion(saga), do: {:ok, %{saga | datos: Map.put(saga.datos, :email_enviado, false)}}

  # ───────────────────────────────────────────────────────────
  # BROADCAST — efecto puro al edge (sin lógica de negocio)
  # ───────────────────────────────────────────────────────────

  defp broadcast_paso(saga_id, estado, metadata) do
    payload = %{saga_id: saga_id, paso: estado, estado: estado, metadata: metadata, timestamp: DateTime.utc_now()}
    Phoenix.PubSub.broadcast(HotelFlux.PubSub, "saga:#{saga_id}", {:saga_paso, payload})
  end

  defp broadcast_paso(pubsub, saga_id, paso, estado, metadata) do
    payload = %{saga_id: saga_id, paso: paso, estado: estado, metadata: metadata, timestamp: DateTime.utc_now()}
    Phoenix.PubSub.broadcast(pubsub, "saga:#{saga_id}", {:saga_paso, payload})
  end
end
