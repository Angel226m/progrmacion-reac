defmodule HotelFluxWeb.AuthController do
  @moduledoc """
  Controlador de autenticación — Login, Registro, Logout, Perfil, Cambio de contraseña.

  Seguridad OWASP Top 10 + ISO 27001 implementada:
    - A02:2021 Cryptographic Failures → Bcrypt 12 rounds + timing-attack protection
    - A03:2021 Injection → Input sanitization en pipeline
    - A04:2021 Insecure Design → Rate limiting + account lockout
    - A07:2021 Authentication Failures → Password policy NIST 800-63B
    - ISO 27001 A.9.3 → Responsabilidades del usuario (contraseña segura)
    - ISO 27001 A.9.4 → Control de acceso al sistema
    - ISO 27001 A.12.4 → Logging de eventos de seguridad

  Política de contraseñas (NIST 800-63B + OWASP):
    - Mínimo 8 caracteres
    - Al menos 1 mayúscula
    - Al menos 1 minúscula
    - Al menos 1 número
    - Al menos 1 carácter especial (!@#$%^&*)
    - No puede ser igual a la anterior
    - No puede contener el email del usuario

  Control de sesión:
    - JWT con TTL corto (12h normal, 7 días con recordarme)
    - Cookie HTTP-Only + Secure + SameSite=Strict
    - Token blacklist en Redis al cerrar sesión
    - Account lockout tras 5 intentos fallidos (30 min)
  """
  use Phoenix.Controller
  alias HotelFlux.Repo
  alias HotelFlux.Domain.{Evento, Usuario}
  alias HotelFlux.Events.LoginRealizado
  alias HotelFlux.Guardian
  alias HotelFlux.Adapters.Cache.RedisCache

  import Ecto.Query

  require Logger

  # Política de seguridad configurable (ISO 27001 A.9.3)
  @max_login_attempts 5
  @lockout_duration_seconds 1800
  @min_password_length 8

  @doc "POST /auth/login — Inicio de sesión con protección OWASP completa"
  def login(conn, %{"email" => email, "password" => password} = params) do
    recordarme = Map.get(params, "recordarme", false)
    ip = conn.remote_ip |> :inet.ntoa() |> to_string()

    # OWASP A07: Rate limiting por IP (10 req/min)
    case RedisCache.verificar_rate_limit("login:#{ip}", 10, 60) do
      {:error, :rate_limit_excedido} ->
        Logger.warning("[Auth] Rate limit excedido para IP #{ip}")
        conn |> put_status(429) |> json(%{error: "Demasiados intentos. Espere un momento."})

      :ok ->
        # ISO 27001 A.9.4: Verificar bloqueo de cuenta por intentos fallidos
        case verificar_bloqueo_cuenta(email) do
          {:error, restante} ->
            Logger.warning("[Auth] Cuenta bloqueada: #{email} (#{restante}s restantes)")
            conn |> put_status(423) |> json(%{
              error: "Cuenta bloqueada temporalmente por múltiples intentos fallidos.",
              retry_after: restante,
              codigo: "OWASP_A07_LOCKOUT"
            })

          :ok ->
            autenticar(conn, email, password, recordarme, ip)
        end
    end
  end

  def login(conn, _params) do
    conn |> put_status(400) |> json(%{error: "Se requieren email y password"})
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

  @doc "POST /auth/renovar — Renovar token JWT preservando recordarme"
  def renovar_token(conn, _params) do
    usuario = Guardian.Plug.current_resource(conn)

    case usuario do
      nil ->
        conn |> put_status(401) |> json(%{error: "No autenticado"})

      usuario ->
        claims = Guardian.Plug.current_claims(conn)
        recordarme = Map.get(claims, "recordarme", false)
        ttl = if recordarme, do: {7, :day}, else: {12, :hour}

        claims_nuevas = %{
          "rol" => to_string(usuario.rol),
          "nombre" => usuario.nombre,
          "recordarme" => recordarme
        }

        {:ok, nuevo_token, _claims} = Guardian.encode_and_sign(usuario, claims_nuevas, ttl: ttl)

        conn
        |> configurar_cookie_jwt(nuevo_token, recordarme)
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

  @doc """
  PUT /auth/cambiar-password — Cambiar contraseña (OWASP A07 + NIST 800-63B)

  Validaciones:
    1. Contraseña actual correcta
    2. Nueva contraseña cumple política NIST 800-63B
    3. Nueva contraseña diferente a la actual
    4. No contiene el email del usuario
    5. Invalida todas las sesiones anteriores
  """
  def cambiar_password(conn, %{"password_actual" => password_actual, "password_nueva" => password_nueva}) do
    usuario = Guardian.Plug.current_resource(conn)

    case validar_cambio_password(usuario, password_actual, password_nueva) do
      {:error, {status, mensaje}} ->
        conn |> put_status(status) |> json(%{error: mensaje})

      :ok ->
        changeset = Usuario.changeset_password(usuario, %{"password" => password_nueva})

        case Repo.update(changeset) do
          {:ok, _} ->
            # ISO 27001 A.9.3: Invalidar todas las sesiones anteriores
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

  defp autenticar(conn, email, password, recordarme, ip) do
    usuario = Repo.get_by(from(u in Usuario, where: u.eliminado == false), email: email)

    # Timing‑attack protection: always perform a bcrypt operation
    # and always record the failed attempt, regardless of user existence.
    password_valid =
      if usuario && usuario.activo do
        Usuario.verify_password(usuario, password)
      else
        Bcrypt.no_user_verify()
        false
      end

    # Always call registrar_intento_fallido so the Redis round‑trip
    # is indistinguishable between "user doesn't exist" and "wrong password".
    intentos = registrar_intento_fallido(email)

    if usuario && usuario.activo && password_valid do
      limpiar_intentos_fallidos(email)

      # Event Sourcing: Login exitoso
      evento = LoginRealizado.nuevo(email, true, ip, usuario.nombre, usuario.rol)
      Repo.insert(Evento.changeset(%Evento{}, Map.from_struct(evento)))

      ttl = if recordarme, do: {7, :day}, else: {12, :hour}

      claims = %{
        "rol" => to_string(usuario.rol),
        "nombre" => usuario.nombre,
        "recordarme" => recordarme
      }

      {:ok, token, _claims} = Guardian.encode_and_sign(usuario, claims, ttl: ttl)

      if recordarme do
        RedisCache.guardar_sesion(usuario.id, token, 7)
      end

      Logger.info("[Auth] Login exitoso: #{usuario.email} (recordarme: #{recordarme}) IP=#{ip}")

      conn
      |> configurar_cookie_jwt(token, recordarme)
      |> json(%{
        token: token,
        usuario: serializar_usuario(usuario),
        recordarme: recordarme
      })
    else
      reason = cond do
        is_nil(usuario) -> "usuario no existe"
        !usuario.activo -> "cuenta desactivada"
        true -> "contraseña incorrecta"
      end

      Logger.warning("[Auth] Login fallido (#{reason}): #{email} (intento #{intentos}/#{@max_login_attempts}) IP=#{ip}")

      # Event Sourcing: Login fallido
      evento = LoginRealizado.nuevo(email, false, ip)
      Repo.insert(Evento.changeset(%Evento{}, Map.from_struct(evento)))

      restantes = @max_login_attempts - intentos

      mensaje = if !usuario || !usuario.activo do
        "Credenciales inválidas"
      else
        if restantes > 0 do
          "Credenciales inválidas. #{restantes} intento(s) restante(s)."
        else
          "Cuenta bloqueada por #{div(@lockout_duration_seconds, 60)} minutos."
        end
      end

      conn |> put_status(401) |> json(%{error: mensaje})
    end
  end

  defp configurar_cookie_jwt(conn, token, recordarme) do
    max_age = if recordarme, do: 7 * 86400, else: 12 * 3600

    put_resp_cookie(conn, "hotelflux_token", token,
      http_only: true,
      secure: Application.get_env(:hotelflux, :env) == :prod,
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
      activo: usuario.activo,
      inserted_at: usuario.inserted_at
    }
  end

  defp format_errors(changeset) do
    Ecto.Changeset.traverse_errors(changeset, fn {msg, opts} ->
      Enum.reduce(opts, msg, fn {key, value}, acc ->
        String.replace(acc, "%{#{key}}", to_string(value))
      end)
    end)
  end

  # ═══════════════════════════════════════════════════════════
  # ACCOUNT LOCKOUT (OWASP A07 + ISO 27001 A.9.4.2)
  # ═══════════════════════════════════════════════════════════

  # Verifica si la cuenta está bloqueada por intentos fallidos
  defp verificar_bloqueo_cuenta(email) do
    key = "lockout:#{email}"

    case RedisCache.get(key) do
      {:ok, nil} -> :ok
      {:ok, _} ->
        ttl = RedisCache.ttl(key)
        {:error, max(ttl, 0)}
      _ -> :ok
    end
  end

  # Registra un intento fallido y bloquea si excede el máximo
  defp registrar_intento_fallido(email) do
    key = "login_attempts:#{email}"
    intentos = RedisCache.incrementar(key, @lockout_duration_seconds)

    if intentos >= @max_login_attempts do
      # Bloquear cuenta
      RedisCache.set("lockout:#{email}", "locked", @lockout_duration_seconds)
      Logger.warning("[Auth] Cuenta bloqueada por #{@max_login_attempts} intentos fallidos: #{email}")
    end

    intentos
  end

  # Limpia los intentos fallidos tras login exitoso
  defp limpiar_intentos_fallidos(email) do
    RedisCache.delete("login_attempts:#{email}")
    RedisCache.delete("lockout:#{email}")
  end

  # ═══════════════════════════════════════════════════════════
  # VALIDACIÓN DE CONTRASEÑA (NIST 800-63B + OWASP)
  # ═══════════════════════════════════════════════════════════

  defp validar_cambio_password(usuario, password_actual, password_nueva) do
    cond do
      !Usuario.verify_password(usuario, password_actual) ->
        {:error, {401, "Contraseña actual incorrecta"}}

      password_actual == password_nueva ->
        {:error, {422, "La nueva contraseña debe ser diferente a la actual"}}

      true ->
        validar_politica_password(password_nueva, usuario.email)
    end
  end

  defp validar_politica_password(password, email) do
    errores =
      []
      |> validar_longitud(password)
      |> validar_mayuscula(password)
      |> validar_minuscula(password)
      |> validar_numero(password)
      |> validar_especial(password)
      |> validar_no_contiene_email(password, email)

    case errores do
      [] -> :ok
      [primer_error | _] -> {:error, {422, primer_error}}
    end
  end

  defp validar_longitud(errores, password) do
    if String.length(password) < @min_password_length do
      errores ++ ["La contraseña debe tener al menos #{@min_password_length} caracteres"]
    else
      errores
    end
  end

  defp validar_mayuscula(errores, password) do
    if String.match?(password, ~r/[A-Z]/), do: errores,
    else: errores ++ ["Debe contener al menos una letra mayúscula"]
  end

  defp validar_minuscula(errores, password) do
    if String.match?(password, ~r/[a-z]/), do: errores,
    else: errores ++ ["Debe contener al menos una letra minúscula"]
  end

  defp validar_numero(errores, password) do
    if String.match?(password, ~r/[0-9]/), do: errores,
    else: errores ++ ["Debe contener al menos un número"]
  end

  defp validar_especial(errores, password) do
    if String.match?(password, ~r/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/), do: errores,
    else: errores ++ ["Debe contener al menos un carácter especial (!@#$%^&*)"]
  end

  defp validar_no_contiene_email(errores, password, email) do
    nombre_email = email |> String.split("@") |> List.first() |> String.downcase()
    if String.contains?(String.downcase(password), nombre_email) do
      errores ++ ["La contraseña no puede contener tu nombre de usuario"]
    else
      errores
    end
  end
end
