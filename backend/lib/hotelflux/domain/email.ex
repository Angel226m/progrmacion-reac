defmodule HotelFlux.Domain.Email do
  @moduledoc """
  Entidad de dominio INMUTABLE — Representa un correo electrónico.

  Struct puro sin lógica de negocio compleja. Se utiliza como valor
  que fluye desde la creación hasta el envío a través del adapter de email.
  """

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

  # Crea un nuevo email con los campos obligatorios y opciones adicionales
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

  # Agrega contenido HTML al email (función pura)
  def add_html(%__MODULE__{} = email, html) do
    %{email | html: html}
  end

  # Agrega contenido texto plano al email (función pura)
  def add_text(%__MODULE__{} = email, text) do
    %{email | text: text}
  end

  # Agrega metadatos adicionales al email (función pura)
  def add_metadata(%__MODULE__{} = email, metadata) do
    %{email | metadata: metadata}
  end
end
