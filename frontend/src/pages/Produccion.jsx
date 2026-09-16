import React, { useState, useEffect } from 'react';
import { Hammer, CheckCircle, Clock, AlertTriangle, Play, Pause, CheckSquare, Plus, ChevronRight } from 'lucide-react';
import { api } from '../services/api';

export default function Produccion() {
  const [ordenes, setOrdenes] = useState([]);
  const [selectedOp, setSelectedOp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showParadaModal, setShowParadaModal] = useState(false);
  const [showCalidadModal, setShowCalidadModal] = useState(false);

  const [paradaForm, setParadaForm] = useState({ motivo: 'Falta de Material', minutos_parada: 30, descripcion: '' });
  const [calidadForm, setCalidadForm] = useState({ resultado: 'Aprobado', defectos_encontrados: 'Conforme', merma_porcentaje: 0.0 });

  const loadOps = async () => {
    try {
      setLoading(true);
      const data = await api.get('/produccion');
      setOrdenes(data);
      if (data.length > 0 && !selectedOp) {
        setSelectedOp(data[0]);
      } else if (selectedOp) {
        const found = data.find(o => o.id === selectedOp.id);
        if (found) setSelectedOp(found);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOps();
  }, []);

  const handleUpdateEtapa = async (etapaId, nuevoEstado, horasReales) => {
    try {
      await api.patch(`/produccion/etapas/${etapaId}`, {
        estado: nuevoEstado,
        horas_reales: horasReales
      });
      loadOps();
    } catch (err) {
      alert('Error al actualizar etapa: ' + err.message);
    }
  };

  const handleSaveParada = async (e) => {
    e.preventDefault();
    try {
      await api.post('/produccion/paradas', {
        orden_produccion_id: selectedOp.id,
        ...paradaForm
      });
      setShowParadaModal(false);
      setParadaForm({ motivo: 'Falta de Material', minutos_parada: 30, descripcion: '' });
      loadOps();
      alert('Parada de producción registrada correctamente');
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleSaveCalidad = async (e) => {
    e.preventDefault();
    try {
      await api.post('/produccion/calidad', {
        orden_produccion_id: selectedOp.id,
        ...calidadForm
      });
      setShowCalidadModal(false);
      loadOps();
      alert('Inspección de control de calidad registrada');
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: List of Production Orders */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">Órdenes de Producción</h3>
            <span className="text-[11px] bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full">
              {ordenes.length} OPs
            </span>
          </div>

          <div className="space-y-2.5 overflow-y-auto max-h-[calc(100vh-280px)] pr-1">
            {ordenes.map((op) => {
              const isSelected = selectedOp?.id === op.id;
              return (
                <div
                  key={op.id}
                  onClick={() => setSelectedOp(op)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50/50 shadow-sm ring-1 ring-blue-500'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono font-bold text-xs text-blue-700">{op.codigo_op}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      op.estado === 'Completada' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {op.estado}
                    </span>
                  </div>

                  <p className="font-bold text-slate-900 text-xs truncate">{op.cliente_nombre}</p>
                  <p className="text-[11px] text-slate-500 truncate mb-2">Pedido: {op.codigo_pedido}</p>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-600">
                      <span>Avance</span>
                      <span className="font-bold">{op.porcentaje_avance}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${op.porcentaje_avance}%` }}></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: OP Detail and Stages Kanban */}
        <div className="lg:col-span-8 space-y-4">
          {selectedOp ? (
            <div className="space-y-4">
              {/* Header Card */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-base font-extrabold text-blue-700">{selectedOp.codigo_op}</span>
                      <span className="text-xs bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded">
                        {selectedOp.codigo_pedido}
                      </span>
                    </div>
                    <h2 className="font-bold text-sm text-slate-900">{selectedOp.cliente_nombre}</h2>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowParadaModal(true)}
                      className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      <span>Reportar Parada</span>
                    </button>
                    <button
                      onClick={() => setShowCalidadModal(true)}
                      className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                    >
                      <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Control de Calidad</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-600">
                  <div>Inicio Prog: <span className="font-semibold text-slate-900">{selectedOp.fecha_inicio_programada}</span></div>
                  <div>Fin Prog: <span className="font-semibold text-slate-900">{selectedOp.fecha_fin_programada}</span></div>
                  <div>Prioridad: <span className="font-bold text-red-600">{selectedOp.prioridad}</span></div>
                  <div>Responsable: <span className="font-semibold text-slate-900">{selectedOp.responsable_nombre}</span></div>
                </div>
              </div>

              {/* Stages Tracking */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  Ruta de Fabricación y Etapas de Taller
                </h3>

                <div className="space-y-3">
                  {selectedOp.etapas?.map((etapa) => {
                    const isFinalizada = etapa.estado === 'Finalizada';
                    const isEnProceso = etapa.estado === 'En Proceso';
                    return (
                      <div
                        key={etapa.id}
                        className={`p-4 rounded-xl border transition ${
                          isFinalizada
                            ? 'bg-emerald-50/40 border-emerald-200'
                            : isEnProceso
                            ? 'bg-blue-50/50 border-blue-300 ring-1 ring-blue-300'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center">
                                {etapa.numero_fase}
                              </span>
                              <h4 className="font-bold text-sm text-slate-900">{etapa.nombre_etapa}</h4>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                isFinalizada
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : isEnProceso
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}>
                                {etapa.estado}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500">{etapa.descripcion}</p>
                            <div className="flex items-center gap-4 text-[11px] text-slate-600 pt-1">
                              <span>Operario: <b>{etapa.operario_asignado || 'Sin asignar'}</b></span>
                              <span>Estimado: <b>{etapa.horas_estimadas}h</b></span>
                              <span>Real registrado: <b>{etapa.horas_reales}h</b></span>
                            </div>
                          </div>

                          {/* Quick Stage Controls */}
                          <div className="flex items-center gap-2 self-end sm:self-center">
                            {!isFinalizada && !isEnProceso && (
                              <button
                                onClick={() => handleUpdateEtapa(etapa.id, 'En Proceso', etapa.horas_reales)}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                              >
                                <Play className="w-3.5 h-3.5" />
                                <span>Iniciar</span>
                              </button>
                            )}

                            {isEnProceso && (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    const horas = prompt('Horas reales invertidas:', etapa.horas_estimadas);
                                    if (horas !== null) {
                                      handleUpdateEtapa(etapa.id, 'Finalizada', parseFloat(horas) || etapa.horas_estimadas);
                                    }
                                  }}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  <span>Finalizar Etapa</span>
                                </button>
                              </div>
                            )}

                            {isFinalizada && (
                              <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                                <CheckCircle className="w-4 h-4 text-emerald-600" />
                                Completada
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400">
              Seleccione una orden de producción para ver sus etapas.
            </div>
          )}
        </div>
      </div>

      {/* Modal Parada de Producción */}
      {showParadaModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100 p-6 space-y-4 text-xs">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Registrar Parada / Incidencia en Taller
            </h3>

            <form onSubmit={handleSaveParada} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Motivo de la Parada</label>
                <select
                  value={paradaForm.motivo}
                  onChange={(e) => setParadaForm({ ...paradaForm, motivo: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                >
                  <option value="Falta de Material">Falta de Material / Espera Insumo</option>
                  <option value="Falla de Máquina">Falla de Máquina / Equipo</option>
                  <option value="Corte de Fluido Eléctrico">Corte de Fluido Eléctrico</option>
                  <option value="Reproceso">Reproceso / Corrección de Pieza</option>
                  <option value="Humedad Ambiental">Humedad Ambiental / Secado</option>
                  <option value="Otro">Otro Motivo</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tiempo de Parada (Minutos)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={paradaForm.minutos_parada}
                  onChange={(e) => setParadaForm({ ...paradaForm, minutos_parada: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Descripción / Observación</label>
                <textarea
                  rows="2"
                  value={paradaForm.descripcion}
                  onChange={(e) => setParadaForm({ ...paradaForm, descripcion: e.target.value })}
                  placeholder="Detalles de la incidencia..."
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button type="button" onClick={() => setShowParadaModal(false)} className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg">Guardar Parada</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Control de Calidad */}
      {showCalidadModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100 p-6 space-y-4 text-xs">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-emerald-600" />
              Inspección de Control de Calidad
            </h3>

            <form onSubmit={handleSaveCalidad} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Resultado de la Inspección</label>
                <select
                  value={calidadForm.resultado}
                  onChange={(e) => setCalidadForm({ ...calidadForm, resultado: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                >
                  <option value="Aprobado">Aprobado (Conforme al 100%)</option>
                  <option value="Aprobado con Observaciones">Aprobado con Observaciones Menores</option>
                  <option value="Rechazado">Rechazado (Requiere Reproceso)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Porcentaje Estimado de Merma (%)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={calidadForm.merma_porcentaje}
                  onChange={(e) => setCalidadForm({ ...calidadForm, merma_porcentaje: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Defectos / Hallazgos</label>
                <textarea
                  rows="2"
                  value={calidadForm.defectos_encontrados}
                  onChange={(e) => setCalidadForm({ ...calidadForm, defectos_encontrados: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button type="button" onClick={() => setShowCalidadModal(false)} className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg">Registrar Calidad</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
