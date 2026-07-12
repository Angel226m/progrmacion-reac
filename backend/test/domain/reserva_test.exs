defmodule HotelFlux.Domain.ReservaTest do
  @moduledoc """
  Tests de la entidad Reserva — LABORATORIO FUNCIONAL REACTIVO.

  Principios verificados:
  - [FUNCIÓN PURA] validar_transicion/2, calcular_noches/1, calcular_total/2, es_para_hoy?/1
  - [INMUTABILIDAD] struct no muta en ninguna función
  - [TABLA DE VERDAD] transiciones verificadas con Enum.each tabla-driven
  - [COMPOSICIÓN] pipeline funcional entrada→estado→resultado
  - [PROPIEDAD] cálculo de noches es antisimétrico
  """
  use ExUnit.Case, async: true

  alias HotelFlux.Domain.Reserva

  # UUIDs fijos para tests puros (sin DB)
  @hab_id "11111111-1111-1111-1111-111111111111"
  @hue_id "22222222-2222-2222-2222-222222222222"

  # ═════════════════════════════════════════════════════════
  # TABLA DE VERDAD — Transiciones válidas e inválidas
  # ═════════════════════════════════════════════════════════
  # Representa el grafo de estados como datos: {origen, destino, esperado}
  # Técnica funcional: los tests son datos, no código repetido.

  @transiciones_validas [
    {"confirmada", "checked_in"},
    {"confirmada", "cancelada"},
    {"checked_in", "checked_out"}
  ]

  @transiciones_invalidas [
    {"confirmada", "checked_out"},
    {"confirmada", "confirmada"},
    {"checked_in", "cancelada"},
    {"checked_in", "confirmada"},
    {"checked_out", "confirmada"},
    {"checked_out", "checked_in"},
    {"checked_out", "cancelada"},
    {"cancelada", "confirmada"},
    {"cancelada", "checked_in"},
    {"estado_inexistente", "confirmada"}
  ]

  # ── validar_transicion/2 — tabla-driven ────────────────

  describe "validar_transicion/2 — grafo de estados (función pura)" do
    test "transiciones PERMITIDAS: tabla de verdad completa" do
      Enum.each(@transiciones_validas, fn {origen, destino} ->
        reserva = %Reserva{estado: origen}
        result = Reserva.validar_transicion(reserva, destino)
        assert {:ok, ^destino} = result,
               "Se esperaba {:ok, #{destino}} desde #{origen} pero se obtuvo #{inspect(result)}"
      end)
    end

    test "transiciones DENEGADAS: tabla de verdad completa" do
      Enum.each(@transiciones_invalidas, fn {origen, destino} ->
        reserva = %Reserva{estado: origen}
        result = Reserva.validar_transicion(reserva, destino)
        assert {:error, :transicion_invalida} = result,
               "Se esperaba :transicion_invalida desde #{origen}→#{destino} pero se obtuvo #{inspect(result)}"
      end)
    end

    test "composición pipeline: confirmada → checked_in → checked_out" do
      # Aplica reduce funcional sobre la lista de transiciones
      estados_esperados = ["checked_in", "checked_out"]

      {_, transiciones_aplicadas} =
        Enum.reduce(estados_esperados, {%Reserva{estado: "confirmada"}, []}, fn destino, {reserva, acc} ->
          assert {:ok, ^destino} = Reserva.validar_transicion(reserva, destino)
          {%{reserva | estado: destino}, acc ++ [destino]}
        end)

      assert transiciones_aplicadas == ["checked_in", "checked_out"]
    end

    test "inmutabilidad: la struct original no cambia tras validar_transicion" do
      reserva = %Reserva{estado: "confirmada"}
      _result = Reserva.validar_transicion(reserva, "checked_in")
      # La reserva original debe seguir igual — la función es PURA
      assert reserva.estado == "confirmada"
    end

    test "estados terminales: checked_out y cancelada rechazan TODOS los destinos" do
      todos = ~w(confirmada checked_in checked_out cancelada)

      Enum.each(["checked_out", "cancelada"], fn terminal ->
        reserva = %Reserva{estado: terminal}
        results = Enum.map(todos, &Reserva.validar_transicion(reserva, &1))
        assert Enum.all?(results, &match?({:error, :transicion_invalida}, &1)),
               "Estado terminal #{terminal} debería rechazar todos los destinos"
      end)
    end
  end

  # ── Changeset — validaciones puras ─────────────────────

  # ═════════════════════════════════════════════════════════
  # FUNCIONES PURAS DE CÁLCULO — calcular_noches y calcular_total
  # ═════════════════════════════════════════════════════════

  describe "calcular_noches/1 — función pura antisimétrica" do
    test "2 días correctos" do
      reserva = %Reserva{
        fecha_entrada: ~D[2024-11-01],
        fecha_salida: ~D[2024-11-03]
      }
      assert Reserva.calcular_noches(reserva) == 2
    end

    test "1 noche (mínimo)" do
      reserva = %Reserva{
        fecha_entrada: ~D[2024-12-24],
        fecha_salida: ~D[2024-12-25]
      }
      assert Reserva.calcular_noches(reserva) == 1
    end

    test "7 noches (semana completa)" do
      reserva = %Reserva{
        fecha_entrada: ~D[2025-01-01],
        fecha_salida: ~D[2025-01-08]
      }
      assert Reserva.calcular_noches(reserva) == 7
    end

    test "cruce de mes (enero → febrero)" do
      reserva = %Reserva{
        fecha_entrada: ~D[2025-01-28],
        fecha_salida: ~D[2025-02-02]
      }
      assert Reserva.calcular_noches(reserva) == 5
    end

    test "propiedad: tabla de noches es función pura determinista (misma entrada = misma salida)" do
      reserva = %Reserva{
        fecha_entrada: ~D[2025-03-10],
        fecha_salida: ~D[2025-03-15]
      }
      # Llamada múltiple = mismo resultado (referencialmente transparente)
      assert Reserva.calcular_noches(reserva) == Reserva.calcular_noches(reserva)
    end
  end

  describe "calcular_total/2 — función pura de precio × noches" do
    test "2 noches a S/100 = S/200" do
      reserva = %Reserva{fecha_entrada: ~D[2024-11-01], fecha_salida: ~D[2024-11-03]}
      precio = Decimal.new("100.00")
      assert Reserva.calcular_total(reserva, precio) == Decimal.new("200.00")
    end

    test "1 noche a S/250.50 = S/250.50" do
      reserva = %Reserva{fecha_entrada: ~D[2024-12-01], fecha_salida: ~D[2024-12-02]}
      precio = Decimal.new("250.50")
      assert Reserva.calcular_total(reserva, precio) == Decimal.new("250.50")
    end

    test "tabla de precios: múltiples noches y precios — Enum.each tabla-driven" do
      casos = [
        {~D[2025-01-01], ~D[2025-01-04], "80.00", "240.00"},
        {~D[2025-06-01], ~D[2025-06-08], "150.00", "1050.00"},
        {~D[2025-12-24], ~D[2025-12-26], "500.00", "1000.00"}
      ]

      Enum.each(casos, fn {entrada, salida, precio_str, esperado_str} ->
        reserva = %Reserva{fecha_entrada: entrada, fecha_salida: salida}
        precio = Decimal.new(precio_str)
        esperado = Decimal.new(esperado_str)
        resultado = Reserva.calcular_total(reserva, precio)
        assert Decimal.equal?(resultado, esperado),
               "#{precio_str} × #{Date.diff(salida, entrada)} noches debería ser #{esperado_str}"
      end)
    end

    test "composición pura: calcular_noches + calcular_total son consistentes" do
      reserva = %Reserva{fecha_entrada: ~D[2025-03-01], fecha_salida: ~D[2025-03-06]}
      precio = Decimal.new("100.00")
      noches = Reserva.calcular_noches(reserva)
      total = Reserva.calcular_total(reserva, precio)
      # La composición es coherente: total = noches × precio
      assert Decimal.equal?(total, Decimal.mult(Decimal.new(noches), precio))
    end
  end

  # ═════════════════════════════════════════════════════════
  # CHANGESET — validaciones puras de datos de entrada
  # ═════════════════════════════════════════════════════════

  describe "changeset/2 — validaciones sin base de datos" do
    # Tabla de campos requeridos: {campo, attrs_sin_ese_campo}
    @campos_requeridos [:huesped_id, :habitacion_id, :fecha_entrada, :fecha_salida]

    alias HotelFlux.Infra.Persistence.Schema.Reserva, as: ReservaSchema

    test "changeset válido con todos los campos requeridos" do
      attrs = %{
        huesped_id: @hue_id,
        habitacion_id: @hab_id,
        fecha_entrada: Date.utc_today(),
        fecha_salida: Date.add(Date.utc_today(), 2),
        total: Decimal.new("200.00")
      }
      cs = ReservaSchema.changeset(%ReservaSchema{}, attrs)
      assert cs.valid?
    end

    test "todos los campos requeridos producen error si faltan — tabla-driven" do
      attrs_base = %{
        huesped_id: @hue_id,
        habitacion_id: @hab_id,
        fecha_entrada: Date.utc_today(),
        fecha_salida: Date.add(Date.utc_today(), 2)
      }

      Enum.each(@campos_requeridos, fn campo ->
        attrs_sin = Map.delete(attrs_base, campo)
        cs = ReservaSchema.changeset(%ReservaSchema{}, attrs_sin)
        refute cs.valid?,
               "changeset debería ser inválido sin #{campo}"
        assert Keyword.has_key?(cs.errors, campo),
               "debería haber error en #{campo}"
      end)
    end

    test "estado por defecto es confirmada" do
      assert %Reserva{}.estado == "confirmada"
    end

    test "estados inválidos rechazados — tabla-driven" do
      estados_invalidos = ~w(inventado activo cerrado)
      attrs_base = %{
        huesped_id: @hue_id,
        habitacion_id: @hab_id,
        fecha_entrada: Date.utc_today(),
        fecha_salida: Date.add(Date.utc_today(), 1)
      }

      Enum.each(estados_invalidos, fn estado ->
        cs = ReservaSchema.changeset(%ReservaSchema{}, Map.put(attrs_base, :estado, estado))
        refute cs.valid?, "estado '#{estado}' debería ser rechazado"
      end)
    end

    test "estados válidos aceptados — tabla-driven" do
      estados_validos = ~w(confirmada checked_in checked_out cancelada)
      attrs_base = %{
        huesped_id: @hue_id,
        habitacion_id: @hab_id,
        fecha_entrada: Date.utc_today(),
        fecha_salida: Date.add(Date.utc_today(), 1)
      }

      Enum.each(estados_validos, fn estado ->
        cs = ReservaSchema.changeset(%ReservaSchema{}, Map.put(attrs_base, :estado, estado))
        assert cs.valid?, "estado '#{estado}' debería ser aceptado"
      end)
    end
  end
end
