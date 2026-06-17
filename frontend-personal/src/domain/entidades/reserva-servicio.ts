export interface ServicioReservaItem {
  id: string;
  reserva_id: string;
  producto_id: string;
  producto_nombre: string | null;
  categoria: string | null;
  dia_numero: number;
  cantidad: number;
  precio_unitario: string;
  total: string;
  es_adicional: boolean;
  estado: string;
  fecha_servicio: string;
  inserted_at: string;
}

export interface ServicioPorDia {
  dia: number;
  servicios: ServicioReservaItem[];
}
