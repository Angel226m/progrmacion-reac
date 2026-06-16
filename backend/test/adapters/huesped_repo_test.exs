defmodule HotelFlux.Adapters.HuespedRepoTest do
  @moduledoc """
  Tests de integración — HuespedRepo: LABORATORIO DE CARGA Y VALIDACIÓN.

  Principios verificados:
  - [AISLAMIENTO] Sandbox Ecto por test — sin contaminación entre casos
  - [CARGA N-REGISTROS] Inserta N huéspedes y valida propiedades funcionales
  - [FOLD/REDUCE] Validación batch con Enum.reduce
  - [PIPELINE FUNCIONAL] crear → buscar → actualizar → listar
  - [SOFT-DELETE] Integridad de visibilidad en listados
  """
  use HotelFlux.DataCase, async: false

  alias HotelFlux.Domain.Huesped
  alias HotelFlux.Adapters.Repos.HuespedRepo

  # ── Helpers ─────────────────────────────────────────────

  defp email_unico, do: "huesped_#{System.unique_integer([:positive])}@test.pe"

  defp insertar_huesped(attrs \\ %{}) do
    base = %{nombre: "Test", apellido: "Repo", email: email_unico()}
    {:ok, huesped} = HuespedRepo.crear(Map.merge(base, attrs))
    huesped
  end

  # ── obtener/1 ───────────────────────────────────────────

  describe "obtener/1" do
    test "retorna huésped existente por id" do
      huesped = insertar_huesped()
      assert {:ok, encontrado} = HuespedRepo.obtener(huesped.id)
      assert encontrado.id == huesped.id
      assert encontrado.nombre == huesped.nombre
    end

    test "retorna :not_found para ID inexistente" do
      assert {:error, :not_found} = HuespedRepo.obtener(Ecto.UUID.generate())
    end

    test "propiedad: obtener(id) es idempotente" do
      huesped = insertar_huesped()
      {:ok, r1} = HuespedRepo.obtener(huesped.id)
      {:ok, r2} = HuespedRepo.obtener(huesped.id)
      assert r1.id == r2.id
    end
  end

  # ── crear/1 ─────────────────────────────────────────────

  describe "crear/1" do
    test "crea huésped con datos válidos" do
      attrs = %{nombre: "Lucía", apellido: "Mendoza", email: email_unico()}
      assert {:ok, huesped} = HuespedRepo.crear(attrs)
      assert huesped.nombre == "Lucía"
      assert huesped.apellido == "Mendoza"
      assert huesped.eliminado == false
    end

    test "falla sin nombre requerido" do
      assert {:error, cs} = HuespedRepo.crear(%{apellido: "Sin nombre", email: email_unico()})
      assert Keyword.has_key?(cs.errors, :nombre)
    end

    test "falla con email duplicado" do
      email = email_unico()
      {:ok, _} = HuespedRepo.crear(%{nombre: "A", apellido: "B", email: email})
      assert {:error, cs} = HuespedRepo.crear(%{nombre: "C", apellido: "D", email: email})
      assert Keyword.has_key?(cs.errors, :email)
    end

    test "falla con email malformado" do
      assert {:error, cs} = HuespedRepo.crear(%{nombre: "Ana", apellido: "Sol", email: "noesmail"})
      assert Keyword.has_key?(cs.errors, :email)
    end

    test "carga: crea 10 huéspedes sin colisiones (Enum.reduce fold)" do
      # Técnica funcional: Enum.reduce como fold secuencial
      resultados =
        Enum.reduce(1..10, [], fn i, acc ->
          attrs = %{nombre: "Carga#{i}", apellido: "Test", email: email_unico()}
          {:ok, huesped} = HuespedRepo.crear(attrs)
          [huesped.id | acc]
        end)

      # Todos los IDs son únicos
      assert length(resultados) == 10
      assert length(Enum.uniq(resultados)) == 10
    end
  end

  # ── actualizar/2 ────────────────────────────────────────

  describe "actualizar/2" do
    test "actualiza campos del huésped" do
      huesped = insertar_huesped()
      assert {:ok, actualizado} = HuespedRepo.actualizar(huesped.id, %{telefono: "+51999001122"})
      assert actualizado.telefono == "+51999001122"
    end

    test "retorna :not_found para ID inexistente" do
      assert {:error, :not_found} = HuespedRepo.actualizar(Ecto.UUID.generate(), %{nombre: "X"})
    end

    test "pipeline: crear → actualizar → obtener — consistencia" do
      {:ok, h} = HuespedRepo.crear(%{nombre: "Inicial", apellido: "Test", email: email_unico()})
      {:ok, actualizado} = HuespedRepo.actualizar(h.id, %{nombre: "Actualizado"})
      {:ok, obtenido} = HuespedRepo.obtener(h.id)

      assert actualizado.nombre == "Actualizado"
      assert obtenido.nombre == "Actualizado"
    end
  end

  # ── listar/0 ────────────────────────────────────────────

  describe "listar/0" do
    test "retorna lista (puede ser vacía al inicio)" do
      assert is_list(HuespedRepo.listar())
    end

    test "incluye huésped recién creado" do
      huesped = insertar_huesped()
      ids = HuespedRepo.listar() |> Enum.map(& &1.id)
      assert huesped.id in ids
    end

    test "no incluye huéspedes eliminados (soft delete)" do
      huesped = insertar_huesped()
      Repo.update_all(
        from(h in Huesped, where: h.id == ^huesped.id),
        set: [eliminado: true]
      )
      ids = HuespedRepo.listar() |> Enum.map(& &1.id)
      refute huesped.id in ids
    end

    test "carga: lista N huéspedes con propiedades verificadas (Enum.all?)" do
      n = 5
      ids_insertados =
        Enum.map(1..n, fn i ->
          {:ok, h} = HuespedRepo.crear(%{nombre: "Batch#{i}", apellido: "Load", email: email_unico()})
          h.id
        end)

      lista = HuespedRepo.listar()
      # Propiedad funcional: todos los insertados aparecen en el listado
      assert Enum.all?(ids_insertados, fn id -> id in Enum.map(lista, & &1.id) end)
      # Propiedad: ningún huésped eliminado en la lista
      assert Enum.all?(lista, fn h -> h.eliminado == false end)
    end
  end

  # ── buscar_por_email/1 ──────────────────────────────────

  describe "buscar_por_email/1" do
    test "encuentra huésped por email exacto" do
      email = email_unico()
      {:ok, huesped} = HuespedRepo.crear(%{nombre: "Email", apellido: "Test", email: email})
      assert {:ok, encontrado} = HuespedRepo.buscar_por_email(email)
      assert encontrado.id == huesped.id
    end

    test "retorna :not_found para email inexistente" do
      assert {:error, :not_found} = HuespedRepo.buscar_por_email("no_existe@test.pe")
    end

    test "pipeline: crear → buscar_por_email — simetría" do
      email = email_unico()
      {:ok, creado} = HuespedRepo.crear(%{nombre: "Sym", apellido: "Test", email: email})
      {:ok, buscado} = HuespedRepo.buscar_por_email(email)
      # La búsqueda por email devuelve el mismo registro que el creado
      assert creado.id == buscado.id
    end
  end

  # ── buscar/1 ────────────────────────────────────────────

  describe "buscar/1" do
    test "busca por nombre parcial (case-insensitive)" do
      {:ok, huesped} =
        HuespedRepo.crear(%{nombre: "Fernanda", apellido: "Busqueda", email: email_unico()})
      resultados = HuespedRepo.buscar("ferna")
      assert huesped.id in Enum.map(resultados, & &1.id)
    end

    test "retorna lista vacía si no hay coincidencias" do
      assert [] == HuespedRepo.buscar("xyz_no_existe_1928374")
    end

    test "carga: búsqueda en conjunto de N nombres con Enum.filter (fold funcional)" do
      prefijo = "Zsearch#{System.unique_integer([:positive])}"
      _insertados =
        Enum.map(1..5, fn i ->
          {:ok, h} = HuespedRepo.crear(%{
            nombre: "#{prefijo}_#{i}",
            apellido: "Test",
            email: email_unico()
          })
          h
        end)

      resultados = HuespedRepo.buscar(prefijo)
      assert length(resultados) >= 5
      # Propiedad: todos los resultados contienen el prefijo (case-insensitive)
      assert Enum.all?(resultados, fn h ->
        String.contains?(String.downcase(h.nombre), String.downcase(prefijo))
      end)
    end
  end
end
