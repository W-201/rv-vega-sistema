import React, { useState, useEffect } from 'react';
import { Hammer, CheckCircle, Clock, AlertTriangle, Play, CheckSquare, ChevronRight, User } from 'lucide-react';
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
                {/* Columna Izquierda: Lista de OPs */}
                <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 space-y-3 transition-colors">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                        <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">Órdenes de Producción</h3>
                        <span className="text-[11px] bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-900/40">
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
                                    className={`p-3.5 rounded-xl border cursor-pointer transition ${isSelected
                                            ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 shadow-sm ring-1 ring-blue-500'
                                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 hover:border-slate-300 dark:hover:border-slate-700'
                                        }`}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-mono font-bold text-xs text-blue-700 dark:text-blue-400">{op.codigo_op}</span>
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                                            op.estado === 'Completada' 
                                                ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/50' 
                                                : 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/50'
                                        }`}>
                                            {op.estado}
                                        </span>
                                    </div>

                                    <p className="font-bold text-slate-900 dark:text-slate-100 text-xs truncate">{op.cliente_nombre}</p>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mb-2">Pedido: {op.codigo_pedido}</p>

                                    <div className="space-y-1">
                                        <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-300">
                                            <span>Avance</span>
                                            <span className="font-bold">{op.porcentaje_avance}%</span>
                                        </div>
                                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                                            <div className="bg-blue-600 dark:bg-blue-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${op.porcentaje_avance}%` }}></div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Columna Derecha: Detalle y Trazabilidad (OE2) */}
                <div className="lg:col-span-8 space-y-4">
                    {selectedOp ? (
                        <div className="space-y-4">

                            {/* Tarjeta de Cabecera */}
                            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-3 transition-colors">
                                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-base font-extrabold text-blue-700 dark:text-blue-400">{selectedOp.codigo_op}</span>
                                            <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                                                {selectedOp.codigo_pedido}
                                            </span>
                                        </div>
                                        <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100">{selectedOp.cliente_nombre}</h2>
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setShowParadaModal(true)}
                                            className="px-2.5 py-1.5 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                                        >
                                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                                            <span>Reportar Parada</span>
                                        </button>
                                        <button
                                            onClick={() => setShowCalidadModal(true)}
                                            className="px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                                        >
                                            <CheckSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                            <span>Control Calidad</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-600 dark:text-slate-300">
                                    <div>Inicio Prog: <span className="font-semibold text-slate-900 dark:text-slate-100">{selectedOp.fecha_inicio_programada}</span></div>
                                    <div>Fin Prog: <span className="font-semibold text-slate-900 dark:text-slate-100">{selectedOp.fecha_fin_programada}</span></div>
                                    <div>Prioridad: <span className="font-bold text-red-600 dark:text-red-400">{selectedOp.prioridad}</span></div>
                                    <div>Responsable: <span className="font-semibold text-slate-900 dark:text-slate-100">{selectedOp.responsable_nombre}</span></div>
                                </div>
                            </div>

                            {/* MÓDULO OE2: TRAZABILIDAD Y FLUJO KANBAN/STEPPER */}
                            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-6 transition-colors">

                                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                    Seguimiento Digital por Etapas
                                </h3>

                                {/* Línea de Tiempo Visual (Stepper) */}
                                <div className="relative py-2">
                                    <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full z-0"></div>
                                    <div className="relative z-10 flex justify-between items-center px-4">
                                        {selectedOp.etapas?.map((etapa, idx) => {
                                            const isFinalizada = etapa.estado === 'Finalizada';
                                            const isEnProceso = etapa.estado === 'En Proceso';
                                            return (
                                                <div key={`step-${etapa.id}`} className="flex flex-col items-center gap-2 bg-white dark:bg-slate-900 px-2 transition-colors">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border-2 transition-colors ${isFinalizada ? 'bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/20' :
                                                            isEnProceso ? 'bg-blue-500 border-blue-500 text-white shadow-md shadow-blue-500/20 animate-pulse' :
                                                                'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-400 dark:text-slate-500'
                                                        }`}>
                                                        {isFinalizada ? <CheckCircle className="w-4 h-4" /> : idx + 1}
                                                    </div>
                                                    <span className={`text-[10px] font-bold text-center w-20 leading-tight ${isFinalizada ? 'text-emerald-700 dark:text-emerald-400' :
                                                            isEnProceso ? 'text-blue-700 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'
                                                        }`}>
                                                        {etapa.nombre_etapa}
                                                    </span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>

                                {/* Lista Detallada de Trazabilidad */}
                                <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                                    {selectedOp.etapas?.map((etapa) => {
                                        const isFinalizada = etapa.estado === 'Finalizada';
                                        const isEnProceso = etapa.estado === 'En Proceso';
                                        return (
                                            <div
                                                key={etapa.id}
                                                className={`p-4 rounded-xl border transition-all ${isFinalizada ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40' :
                                                        isEnProceso ? 'bg-blue-50/40 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700 ring-1 ring-blue-300 dark:ring-blue-600 shadow-sm' :
                                                            'bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
                                                    }`}
                                            >
                                                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">

                                                    <div className="space-y-2 flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">{etapa.nombre_etapa}</h4>
                                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${isFinalizada ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/50' :
                                                                    isEnProceso ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-900/50' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                                                                }`}>
                                                                {etapa.estado}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400">{etapa.descripcion}</p>

                                                        {/* Panel de Trazabilidad Operativa */}
                                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-850 p-2 rounded border border-slate-100 dark:border-slate-750 w-fit mt-1">
                                                            <span className="flex items-center gap-1">
                                                                <User className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                                                                Operario: <b className="text-slate-800 dark:text-slate-200">{etapa.operario_asignado || 'Pendiente de asignación'}</b>
                                                            </span>
                                                            <span className="flex items-center gap-1 border-l border-slate-200 dark:border-slate-700 pl-4">
                                                                Estimado: <b>{etapa.horas_estimadas}h</b>
                                                            </span>
                                                            <span className="flex items-center gap-1 border-l border-slate-200 dark:border-slate-700 pl-4">
                                                                Real: <b className={isFinalizada ? "text-emerald-700 dark:text-emerald-400" : ""}>{etapa.horas_reales}h</b>
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Controles de Etapa */}
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        {!isFinalizada && !isEnProceso && (
                                                            <button
                                                                onClick={() => handleUpdateEtapa(etapa.id, 'En Proceso', etapa.horas_reales)}
                                                                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                                                            >
                                                                <Play className="w-3.5 h-3.5 fill-current" />
                                                                <span>Iniciar Etapa</span>
                                                            </button>
                                                        )}

                                                        {isEnProceso && (
                                                            <button
                                                                onClick={() => {
                                                                    const horas = prompt('Trazabilidad - Ingrese las horas reales invertidas:', etapa.horas_estimadas);
                                                                    if (horas !== null) {
                                                                        handleUpdateEtapa(etapa.id, 'Finalizada', parseFloat(horas) || etapa.horas_estimadas);
                                                                    }
                                                                }}
                                                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-blue-500/20 transition cursor-pointer animate-pulse"
                                                            >
                                                                <CheckCircle className="w-4 h-4" />
                                                                <span>Finalizar {etapa.nombre_etapa}</span>
                                                            </button>
                                                        )}

                                                        {isFinalizada && (
                                                            <span className="text-xs text-emerald-700 dark:text-emerald-300 font-bold flex items-center gap-1.5 bg-emerald-100/50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800/50">
                                                                <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                                                Etapa Completada
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
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 text-center text-slate-400 dark:text-slate-500 h-full flex flex-col items-center justify-center min-h-[400px] transition-colors">
                            <Clock className="w-12 h-12 text-slate-200 dark:text-slate-800 mb-3" />
                            <p>Seleccione una orden de producción a la izquierda<br />para realizar el seguimiento por etapas.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal Parada de Producción */}
            {showParadaModal && (
                <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100 dark:border-slate-800 p-6 space-y-4 text-xs transition-colors">
                        <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                            Registrar Parada / Incidencia en Taller
                        </h3>

                        <form onSubmit={handleSaveParada} className="space-y-3">
                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Motivo de la Parada</label>
                                <select
                                    value={paradaForm.motivo}
                                    onChange={(e) => setParadaForm({ ...paradaForm, motivo: e.target.value })}
                                    className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-amber-500"
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
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Tiempo de Parada (Minutos)</label>
                                <input
                                    type="number"
                                    min="1"
                                    required
                                    value={paradaForm.minutos_parada}
                                    onChange={(e) => setParadaForm({ ...paradaForm, minutos_parada: e.target.value })}
                                    className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-amber-500"
                                />
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Descripción / Observación</label>
                                <textarea
                                    rows="2"
                                    value={paradaForm.descripcion}
                                    onChange={(e) => setParadaForm({ ...paradaForm, descripcion: e.target.value })}
                                    placeholder="Detalles de la incidencia..."
                                    className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-amber-500"
                                />
                            </div>

                            <div className="pt-3 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                                <button type="button" onClick={() => setShowParadaModal(false)} className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800">Cancelar</button>
                                <button type="submit" className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg shadow-sm">Guardar Parada</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Control de Calidad */}
            {showCalidadModal && (
                <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100 dark:border-slate-800 p-6 space-y-4 text-xs transition-colors">
                        <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            Inspección de Control de Calidad
                        </h3>

                        <form onSubmit={handleSaveCalidad} className="space-y-3">
                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Resultado de la Inspección</label>
                                <select
                                    value={calidadForm.resultado}
                                    onChange={(e) => setCalidadForm({ ...calidadForm, resultado: e.target.value })}
                                    className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
                                >
                                    <option value="Aprobado">Aprobado (Conforme al 100%)</option>
                                    <option value="Aprobado con Observaciones">Aprobado con Observaciones Menores</option>
                                    <option value="Rechazado">Rechazado (Requiere Reproceso)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Porcentaje Estimado de Merma (%)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="100"
                                    value={calidadForm.merma_porcentaje}
                                    onChange={(e) => setCalidadForm({ ...calidadForm, merma_porcentaje: e.target.value })}
                                    className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Defectos / Hallazgos</label>
                                <textarea
                                    rows="2"
                                    value={calidadForm.defectos_encontrados}
                                    onChange={(e) => setCalidadForm({ ...calidadForm, defectos_encontrados: e.target.value })}
                                    className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>

                            <div className="pt-3 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                                <button type="button" onClick={() => setShowCalidadModal(false)} className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800">Cancelar</button>
                                <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm">Registrar Calidad</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}