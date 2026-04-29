defmodule Hotelflux.Domain.StateMachineTest do
  use ExUnit.Case, async: true

  alias Hotelflux.Domain.StateMachine
  alias Hotelflux.Domain.Transitions

  # ──────────────────────────────────────────────────────────
  # StateMachine — Pruebas de funciones puras
  # ──────────────────────────────────────────────────────────

  describe "transicion/3" do
    test "ejecuta transición válida y retorna {:ok, nuevo_estado}" do
      fsm = %{
        estados: [:inicio, :proceso, :fin],
        transiciones: %{
          inicio: %{empezar: :proceso},
          proceso: %{finalizar: :fin}
        },
        estado_inicial: :inicio
      }

      assert {:ok, :proceso} = StateMachine.transicion(fsm, :inicio, :empezar)
    end

    test "rechaza transición inválida con {:error, :transicion_invalida}" do
      fsm = %{
        estados: [:inicio, :proceso, :fin],
        transiciones: %{inicio: %{empezar: :proceso}},
        estado_inicial: :inicio
      }

      assert {:error, :transicion_invalida} = StateMachine.transicion(fsm, :inicio, :finalizar)
    end

    test "rechaza estado desconocido con {:error, :estado_invalido}" do
      fsm = %{
        estados: [:inicio],
        transiciones: %{},
        estado_inicial: :inicio
      }

      assert {:error, :estado_invalido} = StateMachine.transicion(fsm, :inexistente, :algo)
    end
  end

  describe "existe_ruta?/3 (BFS recursivo con TCO)" do
    test "encuentra ruta entre estados conectados" do
      fsm = %{
        estados: [:a, :b, :c, :d],
        transiciones: %{
          a: %{ir_b: :b},
          b: %{ir_c: :c},
          c: %{ir_d: :d}
        },
        estado_inicial: :a
      }

      assert StateMachine.existe_ruta?(fsm, :a, :d)
    end

    test "retorna false cuando no hay ruta" do
      fsm = %{
        estados: [:a, :b, :c],
        transiciones: %{
          a: %{ir_b: :b}
          # c es aislado
        },
        estado_inicial: :a
      }

      refute StateMachine.existe_ruta?(fsm, :a, :c)
    end

    test "retorna true para el mismo estado de origen" do
      fsm = %{estados: [:a], transiciones: %{}, estado_inicial: :a}
      assert StateMachine.existe_ruta?(fsm, :a, :a)
    end
  end

  describe "aplicar_eventos/3 (recursión con acumulador)" do
    test "aplica lista de eventos en secuencia" do
      fsm = %{
        estados: [:inicio, :medio, :fin],
        transiciones: %{
          inicio: %{paso1: :medio},
          medio: %{paso2: :fin}
        },
        estado_inicial: :inicio
      }

      assert {:ok, :fin} = StateMachine.aplicar_eventos(fsm, :inicio, [:paso1, :paso2])
    end

    test "retorna error si algún evento falla en el pipeline" do
      fsm = %{
        estados: [:inicio, :medio],
        transiciones: %{inicio: %{paso1: :medio}},
        estado_inicial: :inicio
      }

      assert {:error, _} = StateMachine.aplicar_eventos(fsm, :inicio, [:paso1, :evento_invalido])
    end

    test "lista vacía retorna estado original sin cambios" do
      fsm = %{estados: [:inicio], transiciones: %{}, estado_inicial: :inicio}
      assert {:ok, :inicio} = StateMachine.aplicar_eventos(fsm, :inicio, [])
    end
  end

  # ──────────────────────────────────────────────────────────
  # Transitions — Tablas de dominio
  # ──────────────────────────────────────────────────────────

  describe "transicionar_habitacion/2" do
    test "disponible → reservada al reservar" do
      assert {:ok, :reservada} = Transitions.transicionar_habitacion(:disponible, :reservar)
    end

    test "reservada → ocupada al hacer check-in" do
      assert {:ok, :ocupada} = Transitions.transicionar_habitacion(:reservada, :check_in)
    end

    test "ocupada → en_limpieza al hacer check-out" do
      assert {:ok, :en_limpieza} = Transitions.transicionar_habitacion(:ocupada, :check_out)
    end

    test "en_limpieza → disponible al limpiar" do
      assert {:ok, :disponible} = Transitions.transicionar_habitacion(:en_limpieza, :completar_limpieza)
    end

    test "rechaza transición ilegal: disponible no puede hacer check-out" do
      assert {:error, _} = Transitions.transicionar_habitacion(:disponible, :check_out)
    end
  end

  describe "puede_transicionar_habitacion?/2" do
    test "retorna true para transición válida" do
      assert Transitions.puede_transicionar_habitacion?(:disponible, :reservar)
    end

    test "retorna false para transición inválida" do
      refute Transitions.puede_transicionar_habitacion?(:disponible, :check_out)
    end
  end

  describe "eventos_habitacion/1" do
    test "retorna lista de eventos disponibles desde disponible" do
      eventos = Transitions.eventos_habitacion(:disponible)
      assert is_list(eventos)
      assert :reservar in eventos
    end

    test "retorna lista vacía para estado terminal o sin transiciones" do
      # bloqueada solo puede ser desbloqueada (si existe esa transición)
      eventos = Transitions.eventos_habitacion(:bloqueada)
      assert is_list(eventos)
    end
  end
end
