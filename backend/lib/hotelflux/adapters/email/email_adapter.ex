defmodule HotelFlux.Adapters.Email.EmailAdapter do
  @moduledoc """
  Adaptador de email — implementa el puerto `NotificacionPort`.
  Usa el patrón decorador funcional para componer el pipeline de envío.

  Pipeline:
    1. with_resend_format — transforma Email struct a formato Resend
    2. with_tracking      — añade metadatos de tracking
    3. with_logging       — registra envíos en logger
    4. base(transport)    — llamado real a Resend o simulación
  """

  @behaviour HotelFlux.Ports.NotificacionPort

  alias HotelFlux.Domain.Email
  alias HotelFlux.Domain.Email.Decorator
  alias HotelFlux.Domain.Email.Template
  alias HotelFlux.Adapters.Email.ResendAdapter
  require Logger

  @doc """
  Construye el pipeline de decoradores para envío de emails.
  Composición funcional: cada decorador envuelve al siguiente.
  """
  # Construye el pipeline de envío real con formato Resend, logging y tracking
  def build_sender do
    Decorator.base(&ResendAdapter.enviar/1)
    |> Decorator.with_resend_format()
    |> Decorator.with_logging()
    |> Decorator.with_tracking()
  end

  @doc """
  Versión del pipeline que usa el adaptador simulado (para dev/test).
  """
  # Construye el pipeline simulado (solo logging, sin llamada HTTP real)
  def build_simulated_sender do
    Decorator.base(&simular_envio/1)
    |> Decorator.with_logging()
  end

  @impl true
  # Envía email de confirmación de reserva con los datos del huésped y habitación
  def enviar_email_confirmacion(reserva) do
    %{huesped: huesped, habitacion: habitacion} = reserva

    email =
      Email.nuevo(
        [huesped.email],
        "HotelFlux <no-reply@correo.angelproyect.com>",
        "¡Reserva confirmada! — HotelFlux",
        metadata: %{
          huesped: %{nombre: huesped.nombre, email: huesped.email},
          habitacion: %{numero: habitacion.numero, tipo: habitacion.tipo},
          fecha_entrada: to_string(reserva.fecha_entrada),
          fecha_salida: to_string(reserva.fecha_salida),
          total: to_string(reserva.total),
          id: reserva.id
        }
      )

    sender = build_sender()
    # Agrega la plantilla HTML con los datos de la reserva
    sender = Decorator.with_template(&Template.datos_reserva/1, sender)

    sender.(email)
  end

  @impl true
  # Envía email de checkout con el total de la estadía y noches transcurridas
  def enviar_email_checkout(reserva, total) do
    %{huesped: huesped, habitacion: habitacion} = reserva

    noches = Date.diff(reserva.fecha_salida, reserva.fecha_entrada)

    email =
      Email.nuevo(
        [huesped.email],
        "HotelFlux <no-reply@correo.angelproyect.com>",
        "Gracias por tu estadía — HotelFlux",
        metadata: %{
          huesped: %{nombre: huesped.nombre},
          habitacion: %{numero: habitacion.numero},
          total: to_string(total),
          noches: noches,
          consumos: []
        }
      )

    sender = build_sender()
    # Agrega la plantilla HTML de checkout
    sender = Decorator.with_template(&Template.checkout_reserva/1, sender)

    sender.(email)
  end

  @impl true
  # Envía email de recuperación de contraseña con el token generado
  def enviar_email_recuperacion_contrasena(%{nombre: nombre, email: email, token: token}) do
    email =
      Email.nuevo(
        [email],
        "HotelFlux <no-reply@correo.angelproyect.com>",
        "Recuperación de contraseña — HotelFlux",
        metadata: %{
          nombre: nombre,
          email: email,
          token: token
        }
      )

    sender = build_sender()
    # Agrega la plantilla HTML de recuperación de contraseña
    sender = Decorator.with_template(&Template.recuperar_contrasena/1, sender)

    sender.(email)
  end

  @doc """
  Función de transporte simulada (para desarrollo/test).
  """
  # Simula el envío de un email sin llamar a la API real de Resend
  def simular_envio(%Email{to: to, subject: subject}) do
    Logger.info("[EmailAdapter-Simulado] → #{inspect(to)} — #{subject}")
    Process.sleep(50)
    {:ok, %{message_id: "sim-#{UUID.uuid4() |> String.slice(0..7)}", provider: :simulado}}
  end
end
