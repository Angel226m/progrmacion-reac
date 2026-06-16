defmodule HotelFlux.Guardian do
  @moduledoc """
  Guardian JWT — autenticación stateless por rol.
  Genera y valida tokens JWT con claims de rol para
  autorización en cada request.
  """
  use Guardian, otp_app: :hotelflux

  alias HotelFlux.Repo
  alias HotelFlux.Domain.Usuario

  def subject_for_token(%{id: id}, _claims), do: {:ok, to_string(id)}
  def subject_for_token(_, _), do: {:error, :invalid_resource}

  def resource_from_claims(%{"sub" => id}) do
    case Repo.get(Usuario, id) do
      nil -> {:error, :resource_not_found}
      usuario -> {:ok, usuario}
    end
  end

  def resource_from_claims(_), do: {:error, :invalid_claims}

  @doc """
  Genera un token JWT con el rol embebido en los claims.
  Usa el TTL configurado en el entorno (fallback: 12h).
  """
  def generate_token(usuario) do
    ttl = Application.get_env(:hotelflux, HotelFlux.Guardian, [])
          |> Keyword.get(:ttl, {12, :hour})

    claims = %{
      "rol" => to_string(usuario.rol),
      "nombre" => usuario.nombre,
      "recordarme" => false
    }
    encode_and_sign(usuario, claims, ttl: ttl)
  end
end
