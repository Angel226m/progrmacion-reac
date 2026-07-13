defmodule HotelFlux.Domain.Email.Decorator do
  @moduledoc ~S"""
  Decorador funcional para envío de emails — estilo FRP, sin if/else/switch.

  ## Principios
  - Cada decorador es una HOF: `(send_fn) -> send_fn`
  - `compose/2` compone decoradores en pipeline (izquierda → derecha)
  - Sin `if`, `case`, `switch` — solo pattern matching
  - Los decoradores se encadenan por composición funcional pura

  ## Uso
      sender =
        Email.Decorator.base(&ResendAdapter.enviar/1)
        |> Email.Decorator.with_template(&Template.confirmacion_reserva/1)
        |> Email.Decorator.with_logging()

      sender.(email)
  """

  require Logger

  alias HotelFlux.Domain.Email

  @type send_fn :: (Email.t() | map() -> {:ok, map()} | {:error, term()})
  @type decorator :: (send_fn() -> send_fn())

  @doc """
  Decorador base — recibe la función de transporte real.
  Punto de partida del pipeline.
  """
  @spec base(send_fn()) :: send_fn()
  def base(transport_fn), do: transport_fn

  @doc """
  Compone una lista de decoradores alrededor de un sender base.
  Sin recursión ni case: reduce la lista con aplicación de funciones.
  """
  @spec compose(send_fn(), [decorator()]) :: send_fn()
  def compose(sender, decorators) do
    Enum.reduce(decorators, sender, fn d, acc -> d.(acc) end)
  end

  @doc """
  Decorador: inyecta HTML renderizado por un template function.
  El template recibe el metadata del email (mapa) y retorna el HTML string.
  """
  @spec with_template(fun(), send_fn()) :: send_fn()
  def with_template(template_fn, next) do
    fn %Email{} = email ->
      html = template_fn.(email.metadata || %{})
      next.(%{email | html: html})
    end
  end

  @doc """
  Decorador: registra en logger cada envío (éxito o fallo).
  Sin if: pattern matching en dos cláusulas de función.
  """
  @spec with_logging(send_fn()) :: send_fn()
  def with_logging(next) do
    fn %Email{to: to, subject: subject} = email ->
      Logger.info("[EmailDecorator] → Enviando a #{inspect(to)} — #{subject}")
      result = next.(email)
      log_result(result, to, subject)
      result
    end
  end

  defp log_result({:ok, %{id: id}}, _to, _subject) do
    Logger.info("[EmailDecorator] ✓ Enviado — ID: #{id}")
  end

  defp log_result({:ok, %{message_id: mid}}, _to, _subject) do
    Logger.info("[EmailDecorator] ✓ Enviado — MessageID: #{mid}")
  end

  defp log_result({:error, reason}, to, subject) do
    Logger.error("[EmailDecorator] ✗ Fallo — #{inspect(to)} / #{subject} — #{inspect(reason)}")
  end

  @doc """
  Decorador: añade metadatos de tracking.
  """
  @spec with_tracking(send_fn()) :: send_fn()
  def with_tracking(next) do
    fn %Email{metadata: meta} = email ->
      tracking = Map.merge(meta || %{}, %{tracking: true, timestamp: DateTime.utc_now()})
      next.(%{email | metadata: tracking})
    end
  end

  @doc """
  Decorador: transforma un Email struct al formato plano que espera Resend.
  """
  @spec with_resend_format(send_fn()) :: send_fn()
  def with_resend_format(next) do
    fn %Email{to: to, from: from, subject: subject, html: html, text: text, reply_to: reply_to} ->
      params =
        %{from: from, to: to, subject: subject}
        |> Map.put(:html, html || text || "")
        |> put_reply_to(reply_to)

      next.(params)
    end
  end

  defp put_reply_to(params, nil), do: params
  defp put_reply_to(params, reply_to), do: Map.put(params, :reply_to, reply_to)

  @doc """
  Decorador: fallback a texto plano si no hay HTML.
  Dos cláusulas: una para email sin contenido, otra para cualquier otro.
  """
  @spec with_text_fallback(String.t(), send_fn()) :: send_fn()
  def with_text_fallback(fallback_text, next) do
    fn
      %Email{html: nil, text: nil} = email ->
        next.(%{email | text: fallback_text})

      %Email{} = email ->
        next.(email)
    end
  end
end
