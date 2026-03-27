defmodule HotelFlux.Repo.Migrations.CreateAllTables do
  use Ecto.Migration

  def change do
    # === USUARIOS ===
    create table(:usuarios, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :nombre, :string, null: false
      add :email, :string, null: false
      add :password_hash, :string, null: false
      add :rol, :string, null: false
      add :activo, :boolean, default: true

      timestamps(type: :utc_datetime)
    end

    create unique_index(:usuarios, [:email])

    # === HABITACIONES ===
    create table(:habitaciones, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :numero, :string, null: false
      add :tipo, :string, null: false
      add :piso, :integer, null: false
      add :capacidad, :integer, null: false
      add :precio_noche, :decimal, precision: 10, scale: 2, null: false
      add :estado, :string, null: false, default: "disponible"
      add :caracteristicas, :map

      timestamps(type: :utc_datetime)
    end

    create unique_index(:habitaciones, [:numero])

    # === HUÉSPEDES ===
    create table(:huespedes, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :nombre, :string, null: false
      add :apellido, :string, null: false
      add :email, :string
      add :telefono, :string
      add :documento, :string
      add :tipo_documento, :string
      add :nacionalidad, :string

      timestamps(type: :utc_datetime)
    end

    create unique_index(:huespedes, [:email], where: "email IS NOT NULL")

    # === RESERVAS ===
    create table(:reservas, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :huesped_id, references(:huespedes, type: :binary_id, on_delete: :restrict), null: false
      add :habitacion_id, references(:habitaciones, type: :binary_id, on_delete: :restrict), null: false
      add :fecha_entrada, :date, null: false
      add :fecha_salida, :date, null: false
      add :estado, :string, default: "confirmada"
      add :total, :decimal, precision: 10, scale: 2
      add :notas, :text

      timestamps(type: :utc_datetime)
    end

    create index(:reservas, [:huesped_id])
    create index(:reservas, [:habitacion_id])
    create index(:reservas, [:estado])
    create index(:reservas, [:fecha_entrada, :fecha_salida])

    # === PRODUCTOS ===
    create table(:productos, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :nombre, :string, null: false
      add :descripcion, :text
      add :categoria, :string, null: false
      add :precio, :decimal, precision: 10, scale: 2, null: false
      add :disponible, :boolean, default: true
      add :stock, :integer
      add :imagen_url, :string

      timestamps(type: :utc_datetime)
    end

    create index(:productos, [:categoria])

    # === CONSUMOS ===
    create table(:consumos, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :reserva_id, references(:reservas, type: :binary_id, on_delete: :restrict), null: false
      add :producto_id, references(:productos, type: :binary_id, on_delete: :restrict), null: false
      add :cantidad, :integer, null: false, default: 1
      add :precio_unitario, :decimal, precision: 10, scale: 2, null: false
      add :total, :decimal, precision: 10, scale: 2, null: false
      add :estado, :string, default: "pendiente"

      timestamps(type: :utc_datetime)
    end

    create index(:consumos, [:reserva_id])
    create index(:consumos, [:producto_id])

    # === PAGOS ===
    create table(:pagos, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :reserva_id, references(:reservas, type: :binary_id, on_delete: :restrict)
      add :monto, :decimal, precision: 10, scale: 2, null: false
      add :metodo, :string, null: false
      add :estado, :string, default: "pendiente"
      add :referencia_externa, :string

      timestamps(type: :utc_datetime)
    end

    create index(:pagos, [:reserva_id])

    # === TAREAS DE LIMPIEZA ===
    create table(:tareas_limpieza, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :habitacion_id, references(:habitaciones, type: :binary_id, on_delete: :restrict), null: false
      add :empleado_id, references(:usuarios, type: :binary_id, on_delete: :nilify_all)
      add :estado, :string, default: "pendiente"
      add :iniciada_en, :utc_datetime
      add :completada_en, :utc_datetime
      add :duracion_minutos, :integer
      add :notas, :text

      timestamps(type: :utc_datetime)
    end

    create index(:tareas_limpieza, [:habitacion_id])
    create index(:tareas_limpieza, [:empleado_id])
    create index(:tareas_limpieza, [:estado])

    # === EVENTOS DE DOMINIO (Event Sourcing) ===
    create table(:eventos_dominio, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :tipo, :string, null: false
      add :agregado_id, :binary_id, null: false
      add :agregado_tipo, :string, null: false
      add :payload, :map, null: false
      add :ocurrido_en, :utc_datetime, null: false
    end

    create index(:eventos_dominio, [:tipo])
    create index(:eventos_dominio, [:agregado_id, :agregado_tipo])
    create index(:eventos_dominio, [:ocurrido_en])
  end
end
