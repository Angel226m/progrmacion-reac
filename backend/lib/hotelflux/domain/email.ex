defmodule HotelFlux.Domain.Email do
  defstruct [:to, :from, :subject, :html, :text, :metadata, :reply_to]

  @type t :: %__MODULE__{
    to: [String.t()],
    from: String.t(),
    subject: String.t(),
    html: String.t() | nil,
    text: String.t() | nil,
    metadata: map() | nil,
    reply_to: String.t() | nil
  }

  def nuevo(to, from, subject, opts \\ []) do
    %__MODULE__{
      to: List.wrap(to),
      from: from,
      subject: subject,
      html: opts[:html],
      text: opts[:text],
      metadata: opts[:metadata],
      reply_to: opts[:reply_to]
    }
  end

  def add_html(%__MODULE__{} = email, html) do
    %{email | html: html}
  end

  def add_text(%__MODULE__{} = email, text) do
    %{email | text: text}
  end

  def add_metadata(%__MODULE__{} = email, metadata) do
    %{email | metadata: metadata}
  end
end
