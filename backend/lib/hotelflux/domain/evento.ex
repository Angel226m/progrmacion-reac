defmodule HotelFlux.Domain.Evento do
  @moduledoc """
  Entidad base de EVENT SOURCING — Evento de dominio INMUTABLE.

  Cada evento es un registro inmutable que captura un hecho que ocurrió
  en el dominio. Los eventos son la FUENTE DE VERDAD del sistema.

  Nunca se modifican ni eliminan — solo se agregan nuevos eventos.
  """
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "eventos_dominio" do
    field :tipo, :string
    field :agregado_id, :binary_id
    field :agregado_tipo, :string
    field :payload, :map
    field :ocurrido_en, :utc_datetime
  end

  def changeset(evento, attrs) do
    evento
    |> cast(attrs, [:tipo, :agregado_id, :agregado_tipo, :payload, :ocurrido_en])
    |> validate_required([:tipo, :agregado_id, :agregado_tipo, :payload])
    |> put_timestamp()
  end

  @doc """
  Crea un nuevo evento de dominio. FUNCIÓN PURA — no persiste, solo crea el struct.
  """
  def nuevo(tipo, agregado_id, agregado_tipo, payload) do
    %__MODULE__{
      tipo: tipo,
      agregado_id: agregado_id,
      agregado_tipo: agregado_tipo,
      payload: payload,
      ocurrido_en: DateTime.utc_now()
    }
  end

  # ─────────────────────────────────────────────────────────────────
  # EVENT SOURCING — Proyección recursiva de estado
  # ─────────────────────────────────────────────────────────────────

  @doc """
  Proyecta el estado final desde una lista de eventos de dominio.
  FUNCIÓN RECURSIVA PURA — fold-left sobre lista inmutable de eventos.

  Patrón Event Sourcing: state = fold(events, initial_state, projection_fn)
  La proyección es una HIGHER-ORDER FUNCTION — recibida como parámetro.

  ## Parámetros
  - `eventos`: Lista inmutable de eventos de dominio
  - `proyeccion`: `(estado, evento) -> nuevo_estado` — Higher-Order Function
  - `estado_inicial`: Estado de partida (cualquier tipo)

  ## Ejemplo
      Evento.proyectar(eventos,
        fn estado, ev ->
          case ev.tipo do
            "checkin_realizado" -> %{estado | ocupadas: estado.ocupadas + 1}
            "checkout_realizado" -> %{estado | ocupadas: max(0, estado.ocupadas - 1)}
            _ -> estado
          end
        end,
        %{ocupadas: 0, disponibles: 30}
      )
  """
  def proyectar([], _proyeccion, estado_inicial), do: estado_inicial

  def proyectar([evento | resto], proyeccion, estado) do
    nuevo_estado = proyeccion.(estado, evento)
    # Tail recursion — Elixir optimiza a un loop (sin stack overflow)
    proyectar(resto, proyeccion, nuevo_estado)
  end

  @doc """
  Higher-Order Function: retorna una función de filtro para el tipo dado.
  Patrón currying — función que devuelve función.

  ## Ejemplo
      filtro_checkin = Evento.para_tipo("checkin_realizado")
      checkins = Enum.filter(eventos, filtro_checkin)
  """
  def para_tipo(tipo) do
    fn
      %__MODULE__{tipo: t} -> t == tipo
      %{tipo: t} -> t == tipo
    end
  end

  @doc """
  Aplica una lista de transformaciones a un evento en secuencia.
  HIGHER-ORDER FUNCTION + RECURSIÓN: pipeline de transformaciones puras.

  ## Ejemplo
      Evento.transformar(evento, [
        fn ev -> %{ev | payload: Map.put(ev.payload, "procesado", true)} end,
        fn ev -> %{ev | tipo: "\#{ev.tipo}_procesado"} end
      ])
  """
  def transformar(evento, []), do: evento

  def transformar(evento, [transform | resto]) do
    evento |> transform.() |> transformar(resto)
  end

  @doc """
  Cuenta eventos por tipo usando recursión de cola.
  FUNCIÓN RECURSIVA + INMUTABILIDAD: construye mapa sin mutar.
  """
  def contar_por_tipo(eventos) do
    contar_recursivo(eventos, %{})
  end

  defp contar_recursivo([], acumulador), do: acumulador

  defp contar_recursivo([%__MODULE__{tipo: tipo} | resto], acumulador) do
    actualizado = Map.update(acumulador, tipo, 1, &(&1 + 1))
    contar_recursivo(resto, actualizado)
  end

  defp put_timestamp(changeset) do
    case get_field(changeset, :ocurrido_en) do
      nil -> put_change(changeset, :ocurrido_en, DateTime.utc_now())
      _ -> changeset
    end
  end
end
