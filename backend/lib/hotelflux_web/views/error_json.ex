defmodule HotelFluxWeb.ErrorJSON do
  def render("400.json", _assigns) do
    %{errors: %{detail: "Solicitud inválida"}}
  end

  def render("401.json", _assigns) do
    %{errors: %{detail: "No autorizado"}}
  end

  def render("403.json", _assigns) do
    %{errors: %{detail: "Prohibido"}}
  end

  def render("404.json", _assigns) do
    %{errors: %{detail: "No encontrado"}}
  end

  def render("422.json", _assigns) do
    %{errors: %{detail: "Error de validación"}}
  end

  def render("429.json", _assigns) do
    %{errors: %{detail: "Demasiadas solicitudes"}}
  end

  def render("500.json", _assigns) do
    %{errors: %{detail: "Error interno del servidor"}}
  end

  def render(template, assigns) do
    status = Map.get(assigns, :status, 500)
    %{errors: %{detail: Plug.Conn.Status.reason_phrase(status)}}
  end
end
