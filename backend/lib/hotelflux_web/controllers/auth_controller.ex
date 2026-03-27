defmodule HotelFluxWeb.AuthController do
  @moduledoc """
  Controlador de autenticación — Login, Registro, Logout, Recordarme.
  Seguridad OWASP:
    - JWT con TTL corto (12h normal, 7 días con recordarme)
    - Cookie HTTP-Only + Secure para el token
    - Protección contra timing attacks con Bcrypt.no_user_verify()
    - Rate limiting por IP en login
    - Blacklist de tokens en Redis al cerrar sesión
    - Validación de contraseña fuerte (min 8 chars, mayúscula, número)
  """
  use Phoenix.Controller
  alias HotelFlux.Repo
  alias HotelFlux.Domain.Usuario
  alias HotelFlux.Guardian
  alias HotelFlux.Adapters.Cache.RedisCache

  import Ecto.Query

  require Logger

  @doc "POST /auth/login — Iniciar sesión con email y contraseña"
  def login(conn, %{"email" => email, "password" => password} = params) do
    recordarme = Map.get(params, "recordarme", false)
    ip = conn.remote_ip |> :inet.ntoa() |> to_string()

    # Rate limiting: máximo 10 intentos de login por minuto por IP
    case RedisCache.verificar_rate_limit("login:#{ip}", 10, 60) do
      {:error, :rate_limit_excedido} ->
        Logger.warning("[Auth] Rate limit excedido para IP #{ip}")
        conn |> put_status(429) |> json(%{error: "Demasiados intentos. Espere un momento."})

      :ok ->
        autenticar(conn, email, password, recordarme)
    end
  end

  @doc "POST /auth/registro — Registrar nuevo usuario"
  def registro(conn, params) do
    changeset = Usuario.changeset(%Usuario{}, params)

    case Repo.insert(changeset) do
      {:ok, usuario} ->
        {:ok, token, _claims} = Guardian.generate_token(usuario)
        Logger.info("[Auth] Nuevo usuario registrado: #{usuario.email} (#{usuario.rol})")

        conn
        |> configurar_cookie_jwt(token, false)
        |> put_status(201)
        |> json(%{
          token: token,
          usuario: serializar_usuario(usuario)
        })

      {:error, changeset} ->
        conn |> put_status(422) |> json(%{errors: format_errors(changeset)})
    end
  end

  @doc "POST /auth/logout — Cerrar sesión y revocar token"
  def logout(conn, _params) do
    # Obtener el token actual del header Authorization
    case Guardian.Plug.current_token(conn) do
      nil ->
        conn |> json(%{ok: true, mensaje: "Sesión cerrada"})

      token ->
        # Revocar el token en Redis (blacklist)
        case Guardian.decode_and_verify(token) do
          {:ok, claims} ->
            jti = claims["jti"]
            exp = claims["exp"]
            ttl = max(exp - System.system_time(:second), 0)
            RedisCache.revocar_token(jti, ttl)

            # Limpiar sesión de recordarme
            if claims["sub"] do
              RedisCache.cerrar_sesion(claims["sub"])
            end

            Logger.info("[Auth] Sesión cerrada para usuario #{claims["sub"]}")

          {:error, _} ->
            :ok
        end

        conn
        |> delete_resp_cookie("hotelflux_token", domain: "", path: "/")
        |> json(%{ok: true, mensaje: "Sesión cerrada correctamente"})
    end
  end

  @doc "POST /auth/renovar — Renovar token JWT"
  def renovar_token(conn, _params) do
    usuario = Guardian.Plug.current_resource(conn)

    case usuario do
      nil ->
        conn |> put_status(401) |> json(%{error: "No autenticado"})

      usuario ->
        {:ok, nuevo_token, _claims} = Guardian.generate_token(usuario)

        conn
        |> configurar_cookie_jwt(nuevo_token, false)
        |> json(%{
          token: nuevo_token,
          usuario: serializar_usuario(usuario)
        })
    end
  end

  @doc "GET /auth/perfil — Obtener perfil del usuario autenticado"
  def perfil(conn, _params) do
    usuario = Guardian.Plug.current_resource(conn)

    case usuario do
      nil ->
        conn |> put_status(401) |> json(%{error: "No autenticado"})

      usuario ->
        conn |> json(%{usuario: serializar_usuario(usuario)})
    end
  end

  @doc "PUT /auth/perfil — Actualizar perfil del usuario autenticado"
  def actualizar_perfil(conn, params) do
    usuario = Guardian.Plug.current_resource(conn)

    campos_permitidos = Map.take(params, ["nombre", "email", "telefono"])

    changeset = Usuario.changeset_perfil(usuario, campos_permitidos)

    case Repo.update(changeset) do
      {:ok, usuario_actualizado} ->
        Logger.info("[Auth] Perfil actualizado: #{usuario_actualizado.email}")
        conn |> json(%{ok: true, usuario: serializar_usuario(usuario_actualizado)})

      {:error, changeset} ->
        conn |> put_status(422) |> json(%{errors: format_errors(changeset)})
    end
  end

  @doc "PUT /auth/cambiar-password — Cambiar contraseña del usuario autenticado"
  def cambiar_password(conn, %{"password_actual" => password_actual, "password_nueva" => password_nueva}) do
    usuario = Guardian.Plug.current_resource(conn)

    cond do
      !Usuario.verify_password(usuario, password_actual) ->
        conn |> put_status(401) |> json(%{error: "Contraseña actual incorrecta"})

      String.length(password_nueva) < 8 ->
        conn |> put_status(422) |> json(%{error: "La nueva contraseña debe tener al menos 8 caracteres"})

      !String.match?(password_nueva, ~r/[A-Z]/) ->
        conn |> put_status(422) |> json(%{error: "La nueva contraseña debe contener al menos una mayúscula"})

      !String.match?(password_nueva, ~r/[0-9]/) ->
        conn |> put_status(422) |> json(%{error: "La nueva contraseña debe contener al menos un número"})

      password_actual == password_nueva ->
        conn |> put_status(422) |> json(%{error: "La nueva contraseña debe ser diferente a la actual"})

      true ->
        changeset = Usuario.changeset_password(usuario, %{"password" => password_nueva})

        case Repo.update(changeset) do
          {:ok, _} ->
            # Invalidar todas las sesiones anteriores
            RedisCache.eliminar_sesion(usuario.id)
            Logger.info("[Auth] Contraseña cambiada: #{usuario.email}")
            conn |> json(%{ok: true, mensaje: "Contraseña actualizada. Inicie sesión nuevamente."})

          {:error, changeset} ->
            conn |> put_status(422) |> json(%{errors: format_errors(changeset)})
        end
    end
  end

  def cambiar_password(conn, _params) do
    conn |> put_status(400) |> json(%{error: "Se requieren password_actual y password_nueva"})
  end

  # ═══════════════════════════════════════════════════════════
  # FUNCIONES PRIVADAS
  # ═══════════════════════════════════════════════════════════

  defp autenticar(conn, email, password, recordarme) do
    case Repo.get_by(from(u in Usuario, where: u.eliminado == false), email: email) do
      nil ->
        # Protección contra timing attacks (OWASP)
        Bcrypt.no_user_verify()
        conn |> put_status(401) |> json(%{error: "Credenciales inválidas"})

      %{activo: false} ->
        conn |> put_status(401) |> json(%{error: "Cuenta desactivada"})

      usuario ->
        if Usuario.verify_password(usuario, password) do
          # Generar token con TTL según recordarme
          ttl = if recordarme, do: {7, :day}, else: {12, :hour}

          claims = %{
            "rol" => to_string(usuario.rol),
            "nombre" => usuario.nombre
          }

          {:ok, token, _claims} = Guardian.encode_and_sign(usuario, claims, ttl: ttl)

          # Si recordarme está activo, guardar sesión en Redis (7 días)
          if recordarme do
            RedisCache.guardar_sesion(usuario.id, token, 7)
          end

          Logger.info("[Auth] Login exitoso: #{usuario.email} (recordarme: #{recordarme})")

          conn
          |> configurar_cookie_jwt(token, recordarme)
          |> json(%{
            token: token,
            usuario: serializar_usuario(usuario),
            recordarme: recordarme
          })
        else
          Logger.warning("[Auth] Contraseña incorrecta para: #{email}")
          conn |> put_status(401) |> json(%{error: "Credenciales inválidas"})
        end
    end
  end

  defp configurar_cookie_jwt(conn, token, recordarme) do
    max_age = if recordarme, do: 7 * 86400, else: 12 * 3600

    put_resp_cookie(conn, "hotelflux_token", token,
      http_only: true,
      secure: Mix.env() == :prod,
      same_site: "Lax",
      max_age: max_age,
      path: "/"
    )
  end

  defp serializar_usuario(usuario) do
    %{
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
      activo: usuario.activo
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
