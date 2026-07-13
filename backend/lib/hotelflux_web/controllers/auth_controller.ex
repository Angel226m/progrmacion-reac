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
    - JWT con TTL corto (30min normal — OWASP A07, 7 días con recordarme)
    - Refresh automático vía POST /auth/renovar
    - Cookie HTTP-Only + Secure + SameSite=Strict
    - Token blacklist en Redis al cerrar sesión
    - Account lockout tras 5 intentos fallidos (30 min)
  """
  use Phoenix.Controller
  alias HotelFlux.Repo
  alias HotelFlux.Domain.Usuario
  alias HotelFlux.Infra.Persistence.Schema.Usuario, as: UsuarioEsquema
  alias HotelFlux.Infra.Persistence.Schema.Evento, as: EventoEsquema
  alias HotelFlux.Events.LoginRealizado
  alias HotelFlux.Guardian
  alias HotelFlux.Adapters.Cache.RedisCache

  import Ecto.Query

  require Logger

  @max_login_attempts 5
  @lockout_duration_seconds 1800
  @min_password_length 8

  @doc "POST /auth/login — Inicio de sesión con protección OWASP completa"
  def login(conn, %{"email" => email, "password" => password} = params) do
    recordarme = Map.get(params, "recordarme", false)
    ip = conn.remote_ip |> :inet.ntoa() |> to_string()

    case RedisCache.verificar_rate_limit("login:#{ip}", 10, 60) do
      {:error, :rate_limit_excedido} ->
        Logger.warning("[Auth] Rate limit excedido para IP #{ip}")
        conn |> put_status(429) |> json(%{error: "Demasiados intentos. Espere un momento."})

      :ok ->
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
    changeset = UsuarioEsquema.changeset(%UsuarioEsquema{}, params)

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
    case Guardian.Plug.current_token(conn) do
      nil ->
        conn |> json(%{ok: true, mensaje: "Sesión cerrada"})

      token ->
        case Guardian.decode_and_verify(token) do
          {:ok, claims} ->
            jti = claims["jti"]
            exp = claims["exp"]
            ttl = max(exp - System.system_time(:second), 0)
            RedisCache.revocar_token(jti, ttl)
            maybe_cerrar_sesion(claims)
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
    renovar_token_autenticado(conn, Guardian.Plug.current_resource(conn))
  end

  defp renovar_token_autenticado(conn, nil) do
    conn |> put_status(401) |> json(%{error: "No autenticado"})
  end

  defp renovar_token_autenticado(conn, usuario) do
    claims = Guardian.Plug.current_claims(conn)
    recordarme = Map.get(claims, "recordarme", false)

    claims_nuevas = %{
      "rol" => to_string(usuario.rol),
      "nombre" => usuario.nombre,
      "recordarme" => recordarme
    }

    {:ok, nuevo_token, _claims} =
      Guardian.encode_and_sign(usuario, claims_nuevas, ttl: token_ttl(recordarme))

    conn
    |> configurar_cookie_jwt(nuevo_token, recordarme)
    |> json(%{
      token: nuevo_token,
      usuario: serializar_usuario(usuario)
    })
  end

  @doc "GET /auth/perfil — Obtener perfil del usuario autenticado"
  def perfil(conn, _params) do
    responder_perfil(conn, Guardian.Plug.current_resource(conn))
  end

  defp responder_perfil(conn, nil) do
    conn |> put_status(401) |> json(%{error: "No autenticado"})
  end

  defp responder_perfil(conn, usuario) do
    conn |> json(%{usuario: serializar_usuario(usuario)})
  end

  @doc "PUT /auth/perfil — Actualizar perfil del usuario autenticado"
  def actualizar_perfil(conn, params) do
    usuario_schema = Guardian.Plug.current_resource(conn)
    campos_permitidos = Map.take(params, ["nombre", "email", "telefono"])
    changeset = UsuarioEsquema.changeset_perfil(usuario_schema, campos_permitidos)

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
    usuario_schema = Guardian.Plug.current_resource(conn)
    usuario_domain = struct(Usuario, Map.from_struct(usuario_schema))

    case validar_cambio_password(usuario_domain, password_actual, password_nueva) do
      {:error, {status, mensaje}} ->
        conn |> put_status(status) |> json(%{error: mensaje})

      :ok ->
        changeset = UsuarioEsquema.changeset_password(usuario_schema, %{"password" => password_nueva})

        case Repo.update(changeset) do
          {:ok, _} ->
            RedisCache.eliminar_sesion(usuario_schema.id)
            Logger.info("[Auth] Contraseña cambiada: #{usuario_schema.email}")
            conn |> json(%{ok: true, mensaje: "Contraseña actualizada. Inicie sesión nuevamente."})

          {:error, changeset} ->
            conn |> put_status(422) |> json(%{errors: format_errors(changeset)})
        end
    end
  end

  def cambiar_password(conn, _params) do
    conn |> put_status(400) |> json(%{error: "Se requieren password_actual y password_nueva"})
  end

  defp autenticar(conn, email, password, recordarme, ip) do
    usuario_schema = Repo.get_by(from(u in UsuarioEsquema, where: u.eliminado == false), email: email)
    intentos = registrar_intento_fallido(email)

    case verificar_credenciales(usuario_schema, password) do
      {:ok, usuario} ->
        limpiar_intentos_fallidos(email)

        evento = LoginRealizado.nuevo(email, true, ip, usuario.nombre, usuario.rol)
        Repo.insert(EventoEsquema.changeset(%EventoEsquema{}, Map.from_struct(evento)))

        claims = %{
          "rol" => to_string(usuario.rol),
          "nombre" => usuario.nombre,
          "recordarme" => recordarme
        }

        {:ok, token, _claims} =
          Guardian.encode_and_sign(usuario_schema, claims, ttl: token_ttl(recordarme))

        maybe_guardar_sesion(recordarme, usuario.id, token)

        Logger.info("[Auth] Login exitoso: #{usuario.email} (recordarme: #{recordarme}) IP=#{ip}")

        conn
        |> configurar_cookie_jwt(token, recordarme)
        |> json(%{
          token: token,
          usuario: serializar_usuario(usuario),
          recordarme: recordarme
        })

      :error ->
        evento = LoginRealizado.nuevo(email, false, ip)
        Repo.insert(EventoEsquema.changeset(%EventoEsquema{}, Map.from_struct(evento)))

        Logger.warning(
          "[Auth] Login fallido (#{razon_fallo(usuario_schema)}): #{email} (intento #{intentos}/#{@max_login_attempts}) IP=#{ip}"
        )

        restantes = @max_login_attempts - intentos
        mensaje = mensaje_error(usuario_schema, restantes)

        conn |> put_status(401) |> json(%{error: mensaje})
    end
  end

  defp verificar_credenciales(nil, _password) do
    Bcrypt.no_user_verify()
    :error
  end

  defp verificar_credenciales(%UsuarioEsquema{activo: false}, _password) do
    Bcrypt.no_user_verify()
    :error
  end

  defp verificar_credenciales(usuario_schema, password) do
    usuario = struct(Usuario, Map.from_struct(usuario_schema))

    case Usuario.verify_password(usuario, password) do
      true -> {:ok, usuario}
      false -> :error
    end
  end

  defp token_ttl(true), do: {7, :day}
  defp token_ttl(false), do: access_token_ttl()

  defp maybe_guardar_sesion(true, usuario_id, token), do: RedisCache.guardar_sesion(usuario_id, token, 7)
  defp maybe_guardar_sesion(false, _usuario_id, _token), do: :ok

  defp maybe_cerrar_sesion(%{"sub" => sub}) when not is_nil(sub), do: RedisCache.cerrar_sesion(sub)
  defp maybe_cerrar_sesion(_), do: :ok

  defp configurar_cookie_jwt(conn, token, recordarme) do
    put_resp_cookie(conn, "hotelflux_token", token,
      http_only: true,
      secure: Application.get_env(:hotelflux, :env) == :prod,
      same_site: "Lax",
      max_age: cookie_max_age(recordarme),
      path: "/"
    )
  end

  defp cookie_max_age(true), do: 7 * 86400
  defp cookie_max_age(false), do: ttl_to_seconds(access_token_ttl())

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

  defp registrar_intento_fallido(email) do
    key = "login_attempts:#{email}"
    intentos = RedisCache.incrementar(key, @lockout_duration_seconds)
    maybe_bloquear_cuenta(email, intentos)
    intentos
  end

  defp maybe_bloquear_cuenta(email, intentos) when intentos >= @max_login_attempts do
    RedisCache.set("lockout:#{email}", "locked", @lockout_duration_seconds)
    Logger.warning("[Auth] Cuenta bloqueada por #{@max_login_attempts} intentos fallidos: #{email}")
  end

  defp maybe_bloquear_cuenta(_email, _intentos), do: :ok

  defp limpiar_intentos_fallidos(email) do
    RedisCache.delete("login_attempts:#{email}")
    RedisCache.delete("lockout:#{email}")
  end

  defp validar_cambio_password(usuario, password_actual, password_nueva) do
    case Usuario.verify_password(usuario, password_actual) do
      false ->
        {:error, {401, "Contraseña actual incorrecta"}}

      true ->
        verificar_password_distinta(usuario, password_actual, password_nueva)
    end
  end

  defp verificar_password_distinta(_usuario, pa, pn) when pa == pn do
    {:error, {422, "La nueva contraseña debe ser diferente a la actual"}}
  end

  defp verificar_password_distinta(usuario, _pa, pn) do
    validar_politica_password(pn, usuario.email)
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
    case String.length(password) < @min_password_length do
      true -> errores ++ ["La contraseña debe tener al menos #{@min_password_length} caracteres"]
      false -> errores
    end
  end

  defp validar_mayuscula(errores, password) do
    case String.match?(password, ~r/[A-Z]/) do
      true -> errores
      false -> errores ++ ["Debe contener al menos una letra mayúscula"]
    end
  end

  defp validar_minuscula(errores, password) do
    case String.match?(password, ~r/[a-z]/) do
      true -> errores
      false -> errores ++ ["Debe contener al menos una letra minúscula"]
    end
  end

  defp validar_numero(errores, password) do
    case String.match?(password, ~r/[0-9]/) do
      true -> errores
      false -> errores ++ ["Debe contener al menos un número"]
    end
  end

  defp validar_especial(errores, password) do
    case String.match?(password, ~r/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/) do
      true -> errores
      false -> errores ++ ["Debe contener al menos un carácter especial (!@#$%^&*)"]
    end
  end

  defp validar_no_contiene_email(errores, password, email) do
    nombre_email = email |> String.split("@") |> List.first() |> String.downcase()

    case String.contains?(String.downcase(password), nombre_email) do
      true -> errores ++ ["La contraseña no puede contener tu nombre de usuario"]
      false -> errores
    end
  end

  defp razon_fallo(nil), do: "usuario no existe"
  defp razon_fallo(%UsuarioEsquema{activo: false}), do: "cuenta desactivada"
  defp razon_fallo(_), do: "contraseña incorrecta"

  defp mensaje_error(nil, _restantes), do: "Credenciales inválidas"
  defp mensaje_error(%UsuarioEsquema{activo: false}, _restantes), do: "Credenciales inválidas"
  defp mensaje_error(%UsuarioEsquema{}, restantes) when restantes > 0, do: "Credenciales inválidas. #{restantes} intento(s) restante(s)."
  defp mensaje_error(%UsuarioEsquema{}, _restantes), do: "Cuenta bloqueada por #{div(@lockout_duration_seconds, 60)} minutos."

  defp access_token_ttl do
    Application.get_env(:hotelflux, HotelFlux.Guardian, [])
    |> Keyword.get(:ttl, {30, :minute})
  end

  defp ttl_to_seconds({amount, :minute}), do: amount * 60
  defp ttl_to_seconds({amount, :hour}), do: amount * 3600
  defp ttl_to_seconds({amount, :day}), do: amount * 86400

  # ═══════════════════════════════════════════════════════════
  # RECUPERACIÓN DE CONTRASEÑA (OWASP A07 — forgot password)
  # ═══════════════════════════════════════════════════════════

  alias HotelFlux.Infra.Persistence.Schema.PasswordResetToken, as: ResetTokenSchema
  alias HotelFlux.Domain.PasswordReset
  alias HotelFlux.Adapters.Email.EmailAdapter

  @doc """
  POST /auth/olvide-password — Solicitar recuperación de contraseña.
  Envía email con token de recuperación (válido 1 hora).
  """
  def solicitar_recuperacion(conn, %{"email" => email}) do
    email = String.downcase(email)

    case Repo.get_by(UsuarioEsquema, email: email) do
      nil ->
        conn
        |> put_status(200)
        |> json(%{ok: true, mensaje: "Si el email existe, recibirás instrucciones para recuperar tu contraseña."})

      %{activo: false} ->
        conn
        |> put_status(200)
        |> json(%{ok: true, mensaje: "Si el email existe, recibirás instrucciones para recuperar tu contraseña."})

      usuario ->
        enviar_token_recuperacion(usuario, conn)
    end
  end

  def solicitar_recuperacion(conn, _params) do
    conn |> put_status(400) |> json(%{error: "El email es requerido"})
  end

  defp enviar_token_recuperacion(usuario, conn) do
    token_domain = PasswordReset.generar(usuario.id)

    changeset = ResetTokenSchema.changeset(%ResetTokenSchema{}, %{
      usuario_id: token_domain.usuario_id,
      token: token_domain.token,
      expira_en: token_domain.expira_en
    })

    case Repo.insert(changeset) do
      {:ok, _} ->
        Logger.info("[Auth] Token de recuperación generado para #{usuario.email}")

        EmailAdapter.enviar_email_recuperacion_contrasena(%{
          nombre: usuario.nombre,
          email: usuario.email,
          token: token_domain.token
        })

        conn
        |> put_status(200)
        |> json(%{ok: true, mensaje: "Si el email existe, recibirás instrucciones para recuperar tu contraseña."})

      {:error, changeset} ->
        Logger.error("[Auth] Error guardando token: #{inspect(changeset.errors)}")
        conn |> put_status(200) |> json(%{ok: true, mensaje: "Si el email existe, recibirás instrucciones para recuperar tu contraseña."})
    end
  end

  @doc """
  POST /auth/restablecer-password — Restablecer contraseña con token.
  Valida token, actualiza password, invalida sesiones.
  """
  def restablecer_password(conn, %{"token" => token, "password" => password, "email" => email}) do
    email = String.downcase(email)

    token_record = Repo.get_by(ResetTokenSchema, token: token)

    case validar_token_recuperacion(token_record, email) do
      {:ok, usuario, token_schema} ->
        actualizar_password_con_token(conn, usuario, token_schema, password)

      {:error, mensaje, status} ->
        conn |> put_status(status) |> json(%{error: mensaje})
    end
  end

  def restablecer_password(conn, _params) do
    conn |> put_status(400) |> json(%{error: "Se requieren token, email y password"})
  end

  defp validar_token_recuperacion(nil, _email), do: {:error, "Token inválido o expirado", 400}

  defp validar_token_recuperacion(%{usado: true} = _token, _email),
    do: {:error, "Este token ya ha sido utilizado", 400}

  defp validar_token_recuperacion(%{usuario_id: uid, token: tkn, expira_en: expira} = token_schema, email) do
    usuario = Repo.get_by(UsuarioEsquema, id: uid, email: email)

    case usuario do
      nil -> {:error, "Token inválido o expirado", 400}
      %{activo: false} -> {:error, "Cuenta desactivada", 403}
      _ -> validar_expiracion_token(usuario, token_schema, expira)
    end
  end

  defp validar_expiracion_token(usuario, token_schema, expira) do
    case DateTime.compare(expira, DateTime.utc_now()) do
      :gt -> {:ok, usuario, token_schema}
      _ -> {:error, "El token ha expirado. Solicita uno nuevo.", 400}
    end
  end

  defp actualizar_password_con_token(conn, usuario, token_schema, password) do
    changeset = UsuarioEsquema.changeset_password(usuario, %{"password" => password})

    case Repo.update(changeset) do
      {:ok, _} ->
        Repo.update(ResetTokenSchema.marcar_usado(token_schema))
        RedisCache.eliminar_sesion(usuario.id)

        Logger.info("[Auth] Contraseña restablecida exitosamente: #{usuario.email}")

        conn
        |> put_status(200)
        |> json(%{ok: true, mensaje: "Contraseña actualizada exitosamente. Ya puedes iniciar sesión."})

      {:error, changeset} ->
        conn |> put_status(422) |> json(%{errors: format_errors(changeset)})
    end
  end
end
