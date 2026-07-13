defmodule HotelFlux.Domain.PasswordReset do
  @moduledoc """
  Entidad de dominio PURA — Token de recuperación de contraseña.
  Sin dependencias de Ecto ni efectos secundarios.
  Generación y validación de tokens con expiración.
  """

  @token_ttl_hours 1

  defstruct [:id, :usuario_id, :token, :expira_en, :usado, :usado_en, :inserted_at]

  @type t :: %__MODULE__{
    id: String.t(),
    usuario_id: String.t(),
    token: String.t(),
    expira_en: DateTime.t(),
    usado: boolean(),
    usado_en: DateTime.t() | nil,
    inserted_at: DateTime.t()
  }

  @doc """
  Genera un nuevo token de recuperación para un usuario.
  Token criptográficamente seguro (64 bytes aleatorios, hex-encoded).
  """
  @spec generar(String.t()) :: t()
  def generar(usuario_id) do
    ahora = DateTime.utc_now()

    %__MODULE__{
      id: UUID.uuid4(),
      usuario_id: usuario_id,
      token: generar_token_hex(),
      expira_en: DateTime.add(ahora, @token_ttl_hours * 3600, :second),
      usado: false,
      usado_en: nil,
      inserted_at: ahora
    }
  end

  @doc """
  Valida si un token es válido (no expirado y no usado).
  Sin if: pattern matching en dos cláusulas.
  """
  @spec valido?(t()) :: boolean()
  def valido?(%__MODULE__{usado: false, expira_en: expira}) do
    DateTime.compare(expira, DateTime.utc_now()) == :gt
  end
  def valido?(%__MODULE__{}), do: false

  @doc """
  Marca un token como usado (consumido).
  """
  @spec usar(t()) :: t()
  def usar(%__MODULE__{} = token) do
    %{token | usado: true, usado_en: DateTime.utc_now()}
  end

  @doc """
  Genera un token hex seguro de 64 bytes (128 caracteres hex).
  """
  @spec generar_token_hex() :: String.t()
  def generar_token_hex do
    64
    |> :crypto.strong_rand_bytes()
    |> Base.encode16(case: :lower)
  end
end
