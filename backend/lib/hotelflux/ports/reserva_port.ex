defmodule HotelFlux.Ports.ReservaPort do
  @moduledoc """
  Puerto hexagonal — Interfaz para operaciones de reserva.
  Define el CONTRATO que cualquier adaptador debe implementar.
  Arquitectura hexagonal: el dominio depende de interfaces, no de implementaciones.
  """

  @callback crear_reserva(map()) :: {:ok, struct()} | {:error, term()}
  @callback obtener_reserva(binary()) :: {:ok, struct()} | {:error, :not_found}
  @callback listar_reservas(map()) :: [struct()]
  @callback actualizar_estado(binary(), String.t()) :: {:ok, struct()} | {:error, term()}
  @callback reservas_por_habitacion(binary(), Date.t(), Date.t()) :: [struct()]
  @callback reservas_activas_hoy() :: [struct()]
end
