defmodule HotelFlux.Adapters.TareaRepoTest do
  @moduledoc """
  Tests de integración del repositorio de tareas de limpieza.
  Cada test crea sus propios fixtures para aislamiento total.
  """
  use HotelFlux.DataCase, async: false

  alias HotelFlux.Domain.{Habitacion, Usuario}
  alias HotelFlux.Adapters.Repos.TareaRepo

  # ── Fixtures ────────────────────────────────────────────

  defp insertar_habitacion do
    {:ok, hab} =
      Repo.insert(%Habitacion{
        numero: "TK#{System.unique_integer([:positive])}",
        tipo: "simple",
        piso: 1,
        capacidad: 1,
        precio_noche: Decimal.new("80.00"),
        estado: "en_limpieza"
      })

    hab
  end

  defp insertar_empleado do
    {:ok, emp} =
      Repo.insert(%Usuario{
        nombre: "Limpiador Test",
        email: "limpiad_#{System.unique_integer([:positive])}@hotel.pe",
        password_hash: "hash_irrelevante",
        rol: "limpieza",
        activo: true
      })

    emp
  end

  # ── crear/1 ─────────────────────────────────────────────

  describe "crear/1" do
    test "crea tarea pendiente por defecto" do
      hab = insertar_habitacion()
      emp = insertar_empleado()

      attrs = %{habitacion_id: hab.id, empleado_id: emp.id}
      assert {:ok, tarea} = TareaRepo.crear(attrs)
      assert tarea.estado == "pendiente"
      assert tarea.habitacion != nil
    end

    test "crea tarea con prioridad alta" do
      hab = insertar_habitacion()
      emp = insertar_empleado()

      attrs = %{habitacion_id: hab.id, empleado_id: emp.id, prioridad: "alta"}
      assert {:ok, tarea} = TareaRepo.crear(attrs)
      assert tarea.prioridad == "alta"
    end

    test "falla sin habitacion_id" do
      emp = insertar_empleado()
      assert {:error, changeset} = TareaRepo.crear(%{empleado_id: emp.id})
      assert Keyword.has_key?(changeset.errors, :habitacion_id)
    end

    test "falla sin empleado_id" do
      hab = insertar_habitacion()
      assert {:error, changeset} = TareaRepo.crear(%{habitacion_id: hab.id})
      assert Keyword.has_key?(changeset.errors, :empleado_id)
    end

    test "falla con prioridad inválida" do
      hab = insertar_habitacion()
      emp = insertar_empleado()

      attrs = %{habitacion_id: hab.id, empleado_id: emp.id, prioridad: "critica_inventada"}
      assert {:error, changeset} = TareaRepo.crear(attrs)
      assert Keyword.has_key?(changeset.errors, :prioridad)
    end
  end

  # ── obtener/1 ───────────────────────────────────────────

  describe "obtener/1" do
    test "retorna tarea con habitación precargada" do
      hab = insertar_habitacion()
      emp = insertar_empleado()
      {:ok, tarea} = TareaRepo.crear(%{habitacion_id: hab.id, empleado_id: emp.id})

      assert {:ok, encontrada} = TareaRepo.obtener(tarea.id)
      assert encontrada.id == tarea.id
      assert encontrada.habitacion.id == hab.id
    end

    test "retorna :not_found para ID inexistente" do
      assert {:error, :not_found} = TareaRepo.obtener(Ecto.UUID.generate())
    end
  end

  # ── listar/0 ────────────────────────────────────────────

  describe "listar/0" do
    test "retorna lista de tareas no eliminadas" do
      hab = insertar_habitacion()
      emp = insertar_empleado()
      {:ok, tarea} = TareaRepo.crear(%{habitacion_id: hab.id, empleado_id: emp.id})

      tareas = TareaRepo.listar()
      ids = Enum.map(tareas, & &1.id)
      assert tarea.id in ids
    end
  end

  # ── por_empleado/1 ──────────────────────────────────────

  describe "por_empleado/1" do
    test "retorna solo tareas activas del empleado" do
      hab = insertar_habitacion()
      emp = insertar_empleado()
      {:ok, tarea} = TareaRepo.crear(%{habitacion_id: hab.id, empleado_id: emp.id})

      tareas = TareaRepo.por_empleado(emp.id)
      ids = Enum.map(tareas, & &1.id)
      assert tarea.id in ids
    end

    test "retorna lista vacía para empleado sin tareas" do
      emp = insertar_empleado()
      assert TareaRepo.por_empleado(emp.id) == []
    end
  end

  # ── actualizar_estado/2 ─────────────────────────────────

  describe "actualizar_estado/2" do
    test "cambia estado de pendiente a en_proceso" do
      hab = insertar_habitacion()
      emp = insertar_empleado()
      {:ok, tarea} = TareaRepo.crear(%{habitacion_id: hab.id, empleado_id: emp.id})

      assert {:ok, actualizada} = TareaRepo.actualizar_estado(tarea.id, "en_proceso")
      assert actualizada.estado == "en_proceso"
    end

    test "cambia estado a completada" do
      hab = insertar_habitacion()
      emp = insertar_empleado()
      {:ok, tarea} = TareaRepo.crear(%{habitacion_id: hab.id, empleado_id: emp.id})
      {:ok, tarea_iniciada} = TareaRepo.actualizar_estado(tarea.id, "en_proceso")

      assert {:ok, completada} = TareaRepo.actualizar_estado(tarea_iniciada.id, "completada")
      assert completada.estado == "completada"
    end

    test "retorna :not_found para ID inexistente" do
      assert {:error, :not_found} = TareaRepo.actualizar_estado(Ecto.UUID.generate(), "completada")
    end
  end
end
