🐛 Bug 1 (CRÍTICO) — event_sourcing.ex:93
Campo inexistente insertado_en
snapshot_en_fecha accede a evento.insertado_en, pero el schema Evento (y su migración) no define ese campo. El campo real es ocurrido_en. Causa KeyError en runtime.
🐛 Bug 2 (CRÍTICO) — tarea_limpieza.ex:13
Faltan estados en validación de FSM
@estados ~w(pendiente en_proceso completada) no incluye "con_problema" ni "cancelada", pero transitions.ex:47-54 define transiciones hacia esos estados. Cualquier cambioset que intente poner esos estados fallará.
🐛 Bug 3 (ALTO) — tarea_limpieza.ex:36 + checkout_use_case.ex:89-93
empleado_id required pero no siempre se provee
validate_required([:habitacion_id, :empleado_id]) exige empleado_id, pero en checkout cuando no hay empleados disponibles se crea la tarea sin empleado_id → error de validación.
🐛 Bug 4 (ALTO) — pipeline.ex:107-116
memoize/1 con Agent inseguro
Agent.start_link(fn -> %{} end) |> elem(1) si start_link falla, elem(1) retorna el error y Agent.get explota. Además hay race condition entre Agent.get y Agent.update (no es atómico).
🐛 Bug 5 (ALTO) — reserva_saga.ex:244-246
Resultado de Repo.update ignorado
La vinculación Pago → reserva_id ignora el resultado del update. Si falla, la reserva queda sin pago asociado silenciosamente.
🐛 Bug 6 (ALTO) — reserva_saga.ex:248-258
Enum.each pierde errores de consumos
Si algún consumo falla al crearse, el error se pierde porque Enum.each descarta los resultados. Debería ser Enum.map con manejo de errores.
🐛 Bug 7 (MEDIO) — tree_walker.ex:170-174
Type spec incorrecto en agrupar_por_estado
Spec dice %{atom() => [habitacion()]} pero estado es string en el schema, retorna claves string → el type spec es engañoso.
🐛 Bug 8 (MEDIO) — tree_walker.ex:152-163
Comparación átomo vs string
contar_habitaciones con átomo compara h.estado == estado donde h.estado es string y estado es átomo → siempre false.
🐛 Bug 9 (MEDIO) — recursion.ts:223-224
Mutación en función "pura"
agruparRecursivo usa acc.set(...) que muta el Map, violando el principio de inmutabilidad declarado en los comentarios.
🐛 Bug 10 (BAJO) — reserva.ex:15-16 vs transitions.ex:40
Inconsistencia: estado pendiente
La FSM en transitions.ex usa "pendiente" como estado inicial de reserva, pero @estados_validos en reserva.ex no lo incluye. No causa crash hoy porque el default es "confirmada", pero es una bomba de tiempo.
🐛 Bug 11 (BAJO) — habitacion.ex vs transitions.ex
Dos FSM duplicadas para habitación
Hay dos definiciones de transiciones de habitación: una en habitacion.ex:23-30 y otra en transitions.ex:25-37. Si se modifican independientemente, habrá inconsistencias. La función HabitacionRepo.cambiar_estado usa la de habitacion.ex, mientras el resto del sistema usa transitions.ex.