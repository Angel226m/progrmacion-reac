import { useState, useEffect, useCallback } from 'react';
import { queries, servicios } from '../../services/api';
import type { ServicioPorDia, ServicioReservaItem, Reserva } from '../../domain/types';
import { fromPromise, fold, ok, type Result } from '../../domain/result';

interface ServiciosReservaModalProps {
  reserva: Reserva;
  token: string;
  onClose: () => void;
}

type CatalogoItem = { id: string; nombre: string; precio: string };
type CatalogoResponse = { data: { categoria: string; productos: CatalogoItem[] }[] };
interface ModalData {
  readonly serviciosPorDia: ServicioPorDia[];
  readonly catalogo: CatalogoItem[];
}

const DIA_CLASE: Record<string, string> = {
  activo: 'border-blue-500 bg-blue-50 text-blue-700',
  inactivo: 'border-slate-200 bg-white text-slate-500 hover:border-slate-300',
};

const calcularNoches = (entrada: string, salida: string): number =>
  Math.max(Math.ceil((new Date(salida).getTime() - new Date(entrada).getTime()) / 86400000), 1);

const buildModalData = (sr: ServicioPorDia[], cr: CatalogoResponse): ModalData => ({
  serviciosPorDia: sr,
  catalogo: cr.data.flatMap((c) => c.productos),
});

const handleFetchError = (e: unknown): Error => new Error(String(e));

const fetchModalData = async (reservaId: string, token: string): Promise<Result<ModalData, Error>> => {
  const sr = await fromPromise<{ data: ServicioPorDia[] }, Error>(queries.serviciosPorReserva(reservaId, token), handleFetchError);
  const cr = await fromPromise<CatalogoResponse, Error>(queries.listarProductosServicios(token), handleFetchError);
  const onSRSuccess = (srVal: { data: ServicioPorDia[] }): Result<ModalData, Error> =>
    fold<CatalogoResponse, Error, Result<ModalData, Error>>(
      (crVal: CatalogoResponse) => ok(buildModalData(srVal.data, crVal)),
      (e: Error) => ({ ok: false, error: e }),
    )(cr);
  return fold<{ data: ServicioPorDia[] }, Error, Result<ModalData, Error>>(onSRSuccess, (e: Error) => ({ ok: false, error: e }))(sr);
};

const addService = async (
  reservaId: string, diaNumero: number, productoId: string, cantidad: number, token: string,
): Promise<Result<unknown, Error>> =>
  fromPromise(
    servicios.agregar(reservaId, { producto_id: productoId, dia_numero: diaNumero, cantidad }, token),
    (e) => new Error(String(e)),
  );

const sumaTotalServicios = (serviciosPorDia: ServicioPorDia[]): number =>
  serviciosPorDia.reduce(
    (sum: number, d: ServicioPorDia) => sum + d.servicios.reduce((s: number, sv: ServicioReservaItem) => s + parseFloat(sv.total), 0),
    0,
  );

const renderEmptyDay = () => (
  <div className="rounded-xl bg-slate-50 py-8 text-center text-sm text-slate-400">
    Sin servicios asignados a este día
  </div>
);

const renderSpinner = () => (
  <div className="flex justify-center py-12">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
  </div>
);

export default function ServiciosReservaModal({ reserva, token, onClose }: ServiciosReservaModalProps) {
  const [dataResult, setDataResult] = useState<Result<ModalData, Error>>({ ok: false, error: new Error('Cargando...') });
  const [diaActivo, setDiaActivo] = useState(1);
  const [nuevoProductoId, setNuevoProductoId] = useState('');
  const [nuevaCantidad, setNuevaCantidad] = useState(1);
  const [mensaje, setMensaje] = useState<string | null>(null);

  useEffect(() => {
    fetchModalData(reserva.id, token).then(setDataResult);
  }, [reserva.id, token]);

  const handleAgregar = useCallback(async () => {
    setMensaje(null);
    const res = await addService(reserva.id, diaActivo, nuevoProductoId, nuevaCantidad, token);
    fold(
      (_: unknown) => {
        setNuevoProductoId('');
        setNuevaCantidad(1);
        fetchModalData(reserva.id, token).then(setDataResult);
      },
      (err: Error) => setMensaje(err.message),
    )(res);
  }, [reserva.id, diaActivo, nuevoProductoId, nuevaCantidad, token]);

  return fold(
    ({ serviciosPorDia, catalogo }: ModalData) => {
      const noches = calcularNoches(reserva.fecha_entrada, reserva.fecha_salida);
      const totalServicios = sumaTotalServicios(serviciosPorDia);
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-lg font-extrabold text-slate-800">Servicios de Reserva</h2>
                <p className="text-xs text-slate-500">
                  Hab. {reserva.habitacion?.numero ?? '—'} · {reserva.fecha_entrada} → {reserva.fecha_salida}
                </p>
              </div>
              <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1">
                {Array.from({ length: noches }, (_, i) => i + 1).map((dia) => {
                  const delDia = serviciosPorDia.find((d) => d.dia === dia);
                  const count = delDia ? delDia.servicios.reduce((s: number, sv: ServicioReservaItem) => s + sv.cantidad, 0) : 0;
                  const clase = DIA_CLASE[diaActivo === dia ? 'activo' : 'inactivo'];
                  return (
                    <button key={dia} type="button" onClick={() => setDiaActivo(dia)}
                      className={`shrink-0 rounded-xl border-2 px-3.5 py-2 text-xs font-bold transition-all ${clase}`}>
                      Día {dia}{count > 0 ? <span className="ml-1 rounded-full bg-blue-500 px-1.5 text-[9px] text-white">{count}</span> : null}
                    </button>
                  );
                })}
              </div>
              <div className="mb-6">
                <h3 className="mb-3 text-sm font-bold text-slate-700">Servicios del Día {diaActivo}</h3>
                {(() => {
                  const diaData = serviciosPorDia.find((d) => d.dia === diaActivo);
                  return diaData?.servicios.length
                    ? (
                      <div className="space-y-2">
                        {diaData.servicios.map((sv: ServicioReservaItem) => (
                          <div key={sv.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-3">
                            <div className="flex items-center gap-3">
                              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-sm text-blue-600">🛎️</span>
                              <div>
                                <p className="text-sm font-semibold text-slate-800">{sv.producto_nombre ?? 'Servicio'}</p>
                                <p className="text-xs text-slate-400">{sv.cantidad} × S/{sv.precio_unitario}
                                  {sv.es_adicional ? <span className="ml-2 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-medium text-amber-700">Adicional</span> : null}</p>
                              </div>
                            </div>
                            <span className="text-sm font-bold text-slate-800">S/{sv.total}</span>
                          </div>
                        ))}
                      </div>
                    ) : renderEmptyDay();
                })()}
              </div>
              <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-4">
                <h3 className="mb-3 text-sm font-bold text-slate-700">Agregar Servicio Adicional</h3>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <select value={nuevoProductoId} onChange={(e) => setNuevoProductoId(e.target.value)}
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100">
                    <option value="">— Seleccionar servicio —</option>
                    {catalogo.map((p) => (
                      <option key={p.id} value={p.id}>{p.nombre} — S/{p.precio}</option>
                    ))}
                  </select>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setNuevaCantidad((p) => Math.max(1, p - 1))}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-sm font-bold hover:bg-slate-300">−</button>
                    <span className="w-6 text-center text-sm font-extrabold text-slate-800">{nuevaCantidad}</span>
                    <button type="button" onClick={() => setNuevaCantidad((p) => p + 1)}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white hover:bg-blue-700">+</button>
                    <button type="button" disabled={!nuevoProductoId} onClick={handleAgregar}
                      className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-blue-700 disabled:opacity-50">Agregar</button>
                  </div>
                </div>
                <p className="mt-1.5 text-xs text-slate-400">Se agregará al Día {diaActivo} como servicio adicional</p>
              </div>
              {mensaje ? <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">{mensaje}</div> : null}
            </div>
            <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
              <div className="text-sm text-slate-500">Total en servicios: <span className="font-bold text-slate-800">S/{totalServicios.toFixed(2)}</span></div>
              <button onClick={onClose} className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200">Cerrar</button>
            </div>
          </div>
        </div>
      );
    },
    () => (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
        <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">{renderSpinner()}</div>
      </div>
    ),
  )(dataResult);
}
