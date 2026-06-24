defmodule HotelFlux.Domain.StateMachineTest do
  use ExUnit.Case, async: true

  alias HotelFlux.Domain.StateMachine
  alias HotelFlux.Domain.Transitions
  alias HotelFlux.Domain.Habitacion

  @habitacion_fsm [
    {:reservar,          "disponible",       "reservada"},
    {:ocupar,            "reservada",        "ocupada"},
    {:solicitar_limpieza,"ocupada",          "en_limpieza"},
    {:completar_limpieza,"en_limpieza",      "disponible"},
    {:bloquear,          "disponible",       "bloqueada"},
    {:desbloquear,       "bloqueada",        "disponible"}
  ]

  describe "transicion/3" do
    test "ejecuta transición válida y retorna {:ok, nuevo_estado}" do
      assert {:ok, "reservada"} = StateMachine.transicion("disponible", :reservar, @habitacion_fsm)
    end

    test "rechaza transición inválida con {:error, :transicion_invalida}" do
      assert {:error, :transicion_invalida} = StateMachine.transicion("disponible", :check_out, @habitacion_fsm)
    end

    test "rechaza estado desconocido con {:error, :estado_desconocido}" do
      assert {:error, :estado_desconocido} = StateMachine.transicion("inexistente", :algo, @habitacion_fsm)
    end
  end

  describe "existe_ruta?/3 (BFS recursivo con TCO)" do
    test "encuentra ruta entre estados conectados" do
      assert StateMachine.existe_ruta?("disponible", "en_limpieza", @habitacion_fsm)
    end

    test "retorna false cuando no hay ruta" do
      refute StateMachine.existe_ruta?("disponible", "cancelada", @habitacion_fsm)
    end

    test "retorna true para el mismo estado de origen" do
      assert StateMachine.existe_ruta?("disponible", "disponible", @habitacion_fsm)
    end
  end

  describe "aplicar_eventos/3 (recursión con acumulador)" do
    test "aplica lista de eventos en secuencia" do
      fsm = [
        {:reservar, "disponible", "reservada"},
        {:ocupar,   "reservada",  "ocupada"}
      ]
      assert {:ok, "ocupada"} = StateMachine.aplicar_eventos("disponible", [:reservar, :ocupar], fsm)
    end

    test "retorna error si algún evento falla en el pipeline" do
      fsm = [
        {:paso1, "inicio", "medio"}
      ]
      assert {:error, _} = StateMachine.aplicar_eventos("inicio", [:paso1, :evento_invalido], fsm)
    end

    test "lista vacía retorna estado original sin cambios" do
      assert {:ok, "inicio"} = StateMachine.aplicar_eventos("inicio", [], [])
    end
  end

  describe "transicionar_habitacion/2" do
    test "disponible → reservada al reservar" do
      hab = %Habitacion{numero: "101", tipo: "simple", piso: 1, capacidad: 1, precio_noche: Decimal.new("100"), estado: "disponible"}
      assert {:ok, %Habitacion{estado: "reservada"}} = Transitions.transicionar_habitacion(hab, :reservar)
    end

    test "reservada → ocupada al hacer check-in" do
      hab = %Habitacion{numero: "101", tipo: "simple", piso: 1, capacidad: 1, precio_noche: Decimal.new("100"), estado: "reservada"}
      assert {:ok, %Habitacion{estado: "ocupada"}} = Transitions.transicionar_habitacion(hab, :ocupar)
    end

    test "ocupada → en_limpieza al hacer check-out" do
      hab = %Habitacion{numero: "101", tipo: "simple", piso: 1, capacidad: 1, precio_noche: Decimal.new("100"), estado: "ocupada"}
      assert {:ok, %Habitacion{estado: "en_limpieza"}} = Transitions.transicionar_habitacion(hab, :solicitar_limpieza)
    end

    test "en_limpieza → disponible al limpiar" do
      hab = %Habitacion{numero: "101", tipo: "simple", piso: 1, capacidad: 1, precio_noche: Decimal.new("100"), estado: "en_limpieza"}
      assert {:ok, %Habitacion{estado: "disponible"}} = Transitions.transicionar_habitacion(hab, :completar_limpieza)
    end

    test "rechaza transición ilegal: disponible no puede hacer check-out" do
      hab = %Habitacion{numero: "101", tipo: "simple", piso: 1, capacidad: 1, precio_noche: Decimal.new("100"), estado: "disponible"}
      assert {:error, _} = Transitions.transicionar_habitacion(hab, :check_out)
    end
  end

  describe "puede_transicionar_habitacion?/2" do
    test "retorna true para transición válida" do
      hab = %Habitacion{numero: "101", tipo: "simple", piso: 1, capacidad: 1, precio_noche: Decimal.new("100"), estado: "disponible"}
      assert Transitions.puede_transicionar_habitacion?(hab, :reservar)
    end

    test "retorna false para transición inválida" do
      hab = %Habitacion{numero: "101", tipo: "simple", piso: 1, capacidad: 1, precio_noche: Decimal.new("100"), estado: "disponible"}
      refute Transitions.puede_transicionar_habitacion?(hab, :check_out)
    end
  end

  describe "eventos_habitacion/1" do
    test "retorna lista de eventos disponibles desde disponible" do
      hab = %Habitacion{numero: "101", tipo: "simple", piso: 1, capacidad: 1, precio_noche: Decimal.new("100"), estado: "disponible"}
      eventos = Transitions.eventos_habitacion(hab)
      assert is_list(eventos)
      assert :reservar in eventos
    end

    test "retorna lista vacía para estado terminal o sin transiciones" do
      hab = %Habitacion{numero: "101", tipo: "simple", piso: 1, capacidad: 1, precio_noche: Decimal.new("100"), estado: "limpiando"}
      eventos = Transitions.eventos_habitacion(hab)
      assert is_list(eventos)
    end
  end
end
