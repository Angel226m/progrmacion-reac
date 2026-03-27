defmodule HotelFluxWeb.ErrorJSON do
  def render("404.json", _assigns) do
    %{errors: %{detail: "No encontrado"}}
  end

  def render("500.json", _assigns) do
    %{errors: %{detail: "Error interno del servidor"}}
  end

  def render(template, _assigns) do
    %{errors: %{detail: Phoenix.Controller.status_message_from_template(template)}}
  end
end
