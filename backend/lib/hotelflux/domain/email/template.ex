defmodule HotelFlux.Domain.Email.Template do
  @moduledoc """
  Módulo puro de templates HTML para emails.
  Sin dependencias externas, sin efectos secundarios.
  Cada función retorna un string HTML listo para inyectar.
  """

  @hotel_nombre "HotelFlux"
  @hotel_direccion "Av. Principal 123, Lima, Perú"
  @hotel_telefono "+51 1 234-5678"
  @hotel_email "reservas@hotelflux.pe"

  def datos_reserva(%{
        huesped: %{nombre: huesped_nombre},
        habitacion: %{numero: num, tipo: tipo},
        fecha_entrada: entrada,
        fecha_salida: salida,
        total: total,
        id: reserva_id
      }) do
    """
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <style>
      body{margin:0;padding:0;background-color:#f4f4f4;font-family:'Segoe UI',Arial,sans-serif}
      .container{max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08)}
      .header{background:linear-gradient(135deg,#1a237e,#283593);padding:32px 24px;text-align:center}
      .header h1{color:#ffffff;margin:0;font-size:24px;font-weight:600}
      .header p{color:#c5cae9;margin:8px 0 0;font-size:14px}
      .body{padding:32px 24px}
      .greeting{font-size:18px;color:#1a237e;font-weight:600;margin:0 0 4px}
      .subtitle{color:#666;font-size:14px;margin:0 0 24px}
      .details{background:#f8f9ff;border-radius:8px;padding:20px;margin-bottom:24px}
      .detail-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e8eaf6}
      .detail-row:last-child{border-bottom:none}
      .detail-label{color:#666;font-size:14px}
      .detail-value{color:#1a237e;font-size:14px;font-weight:600;text-align:right}
      .total-row{display:flex;justify-content:space-between;padding:12px 0 0;margin-top:8px;border-top:2px solid #1a237e}
      .total-label{color:#1a237e;font-size:16px;font-weight:700}
      .total-value{color:#1a237e;font-size:18px;font-weight:700}
      .footer{background:#f4f4f4;padding:24px;text-align:center;font-size:12px;color:#999}
      .footer a{color:#283593;text-decoration:none}
      .hotel-info{margin-top:16px;font-size:13px;color:#666}
      .hotel-info span{display:block;margin:2px 0}
    </style>
    </head>
    <body>
    <div class="container">
      <div class="header">
        <h1>#{@hotel_nombre}</h1>
        <p>Datos de tu reserva</p>
      </div>
      <div class="body">
        <p class="greeting">Hola, #{huesped_nombre}</p>
        <p class="subtitle">Aquí están los datos de tu reserva en #{@hotel_nombre}:</p>
        <div class="details">
          <div class="detail-row">
            <span class="detail-label">Código</span>
            <span class="detail-value">#{String.slice(reserva_id, 0, 8)}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Habitación</span>
            <span class="detail-value">#{num} — #{String.capitalize(tipo)}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Entrada</span>
            <span class="detail-value">#{entrada}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Salida</span>
            <span class="detail-value">#{salida}</span>
          </div>
          <div class="total-row">
            <span class="total-label">Total</span>
            <span class="total-value">S/ #{total}</span>
          </div>
        </div>
        <p style="color:#666;font-size:13px;margin:0">
          Check-in: desde las 14:00 | Check-out: hasta las 12:00
        </p>
      </div>
      <div class="footer">
        <p>#{@hotel_nombre} — #{@hotel_direccion}</p>
        <div class="hotel-info">
          <span>📞 #{@hotel_telefono}</span>
          <span>✉️ #{@hotel_email}</span>
        </div>
      </div>
    </div>
    </body>
    </html>
    """
  end

  def recuperar_contrasena(%{nombre: nombre, email: email, token: token}) do
    """
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <style>
      body{margin:0;padding:0;background-color:#f4f4f4;font-family:'Segoe UI',Arial,sans-serif}
      .container{max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08)}
      .header{background:linear-gradient(135deg,#b71c1c,#c62828);padding:32px 24px;text-align:center}
      .header h1{color:#ffffff;margin:0;font-size:24px;font-weight:600}
      .header p{color:#ffcdd2;margin:8px 0 0;font-size:14px}
      .body{padding:32px 24px}
      .greeting{font-size:18px;color:#b71c1c;font-weight:600;margin:0 0 4px}
      .subtitle{color:#666;font-size:14px;margin:0 0 24px}
      .alert-box{background:#fff5f5;border:1px solid #ffcdd2;border-radius:8px;padding:20px;margin-bottom:24px;text-align:center}
      .alert-box p{color:#b71c1c;font-size:14px;margin:0 0 16px}
      .btn{display:inline-block;background:#b71c1c;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:6px;font-size:16px;font-weight:600}
      .btn:hover{background:#c62828}
      .warning{background:#fff8e1;border-left:4px solid #ffa000;padding:14px;border-radius:4px;margin-top:20px}
      .warning p{color:#e65100;font-size:13px;margin:0}
      .footer{background:#f4f4f4;padding:24px;text-align:center;font-size:12px;color:#999}
      .footer a{color:#c62828;text-decoration:none}
      .hotel-info{margin-top:16px;font-size:13px;color:#666}
      .hotel-info span{display:block;margin:2px 0}
    </style>
    </head>
    <body>
    <div class="container">
      <div class="header">
        <h1>#{@hotel_nombre}</h1>
        <p>Recuperación de contraseña</p>
      </div>
      <div class="body">
        <p class="greeting">Hola, #{nombre}</p>
        <p class="subtitle">Recibimos una solicitud para restablecer tu contraseña.</p>
        <div class="alert-box">
          <p>Haz clic en el botón para crear una nueva contraseña:</p>
          <a href="#" class="btn">Restablecer contraseña</a>
        </div>
        <div class="warning">
          <p>⚠️ Este enlace expira en 1 hora. Si no solicitaste este cambio, ignora este mensaje y tu contraseña permanecerá segura.</p>
        </div>
        <p style="color:#666;font-size:13px;margin-top:20px">
          Si el botón no funciona, copia y pega este enlace en tu navegador:<br>
          <span style="color:#b71c1c;word-break:break-all">
            #{frontend_url()}/recuperar-contrasena?token=#{token}&email=#{email}
          </span>
        </p>
      </div>
      <div class="footer">
        <p>#{@hotel_nombre} — #{@hotel_direccion}</p>
        <div class="hotel-info">
          <span>📞 #{@hotel_telefono}</span>
          <span>✉️ #{@hotel_email}</span>
        </div>
        <p style="margin-top:12px">
          <a href="#">Contactar soporte</a>
        </p>
      </div>
    </div>
    </body>
    </html>
    """
  end

  def checkout_reserva(%{
        huesped: %{nombre: nombre},
        habitacion: %{numero: num},
        total: total,
        consumos: consumos,
        noches: noches
      }) do
    items = consumos_html(consumos || [])

    """
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <style>
      body{margin:0;padding:0;background-color:#f4f4f4;font-family:'Segoe UI',Arial,sans-serif}
      .container{max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08)}
      .header{background:linear-gradient(135deg,#00695c,#00897b);padding:32px 24px;text-align:center}
      .header h1{color:#ffffff;margin:0;font-size:24px;font-weight:600}
      .header p{color:#b2dfdb;margin:8px 0 0;font-size:14px}
      .body{padding:32px 24px}
      .greeting{font-size:18px;color:#00695c;font-weight:600;margin:0 0 4px}
      .subtitle{color:#666;font-size:14px;margin:0 0 24px}
      .summary{background:#f0fdfa;border-radius:8px;padding:20px;margin-bottom:24px}
      .summary-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e0f2f1}
      .summary-row:last-child{border-bottom:none}
      .summary-label{color:#666;font-size:14px}
      .summary-value{color:#00695c;font-size:14px;font-weight:600}
      .items-table{width:100%;border-collapse:collapse;margin-bottom:24px}
      .items-table th{background:#e0f2f1;padding:10px 14px;text-align:left;font-size:13px;color:#00695c;font-weight:600}
      .items-table td{padding:10px 14px;border-bottom:1px solid #e0f2f1;font-size:14px;color:#333}
      .items-table td:last-child{text-align:right;font-weight:600}
      .grand-total{display:flex;justify-content:space-between;padding:16px 20px;background:#00695c;border-radius:8px;color:#ffffff;font-size:18px;font-weight:700}
      .footer{background:#f4f4f4;padding:24px;text-align:center;font-size:12px;color:#999}
      .footer a{color:#00695c;text-decoration:none}
      .hotel-info{margin-top:16px;font-size:13px;color:#666}
      .hotel-info span{display:block;margin:2px 0}
    </style>
    </head>
    <body>
    <div class="container">
      <div class="header">
        <h1>#{@hotel_nombre}</h1>
        <p>Gracias por tu estadía</p>
      </div>
      <div class="body">
        <p class="greeting">Hola, #{nombre}</p>
        <p class="subtitle">Aquí está el resumen de tu estadía en la habitación #{num}.</p>
        <div class="summary">
          <div class="summary-row">
            <span class="summary-label">Habitación</span>
            <span class="summary-value">#{num}</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">Noches</span>
            <span class="summary-value">#{noches}</span>
          </div>
        </div>
        #{items}
        <div class="grand-total">
          <span>Total pagado</span>
          <span>S/ #{total}</span>
        </div>
        <p style="color:#666;font-size:13px;margin-top:20px">
          ¡Esperamos verte pronto! Si tienes algún comentario, no dudes en contactarnos.
        </p>
      </div>
      <div class="footer">
        <p>#{@hotel_nombre} — #{@hotel_direccion}</p>
        <div class="hotel-info">
          <span>📞 #{@hotel_telefono}</span>
          <span>✉️ #{@hotel_email}</span>
        </div>
        <p style="margin-top:12px">
          <a href="#">Dejar una reseña</a>
        </p>
      </div>
    </div>
    </body>
    </html>
    """
  end

  defp consumos_html([]), do: ""
  defp consumos_html(consumos) do
    rows = Enum.map(consumos, fn c ->
      nombre = Map.get(c, :nombre) || Map.get(c, "nombre") || "—"
      cantidad = Map.get(c, :cantidad) || Map.get(c, "cantidad") || 1
      precio = Map.get(c, :precio_unitario) || Map.get(c, "precio_unitario") || Map.get(c, :total) || Map.get(c, "total") || "—"
      """
      <tr>
        <td>#{nombre}</td>
        <td>#{cantidad}</td>
        <td>S/ #{precio}</td>
      </tr>
      """
    end)

    """
    <table class="items-table">
      <thead>
        <tr>
          <th>Producto/Servicio</th>
          <th>Cant.</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        #{Enum.join(rows, "")}
      </tbody>
    </table>
    """
  end

  defp frontend_url do
    Application.get_env(:hotelflux, :frontend_url, "http://localhost:3001")
  end
end
