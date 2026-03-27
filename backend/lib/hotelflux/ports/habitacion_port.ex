defmodule HotelFlux.Ports.HabitacionPort do
  @moduledoc """
  Puerto hexagonal — Interfaz para operaciones de habitación.
  """

  @callback obtener(binary()) :: {:ok, struct()} | {:error, :not_found}
  @callback listar(map()) :: [struct()]
  @callback cambiar_estado(binary(), String.t()) :: {:ok, struct()} | {:error, term()}
  @callback buscar_disponible(String.t(), Date.t(), Date.t()) :: {:ok, struct()} | {:error, :sin_disponibilidad}
  @callback contar_por_estado() :: map()
end
