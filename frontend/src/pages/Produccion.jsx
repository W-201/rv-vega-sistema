import { useNotifications } from '../context/NotificationContext';
import AsyncForm from '../components/AsyncForm';
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    Hammer, CheckCircle, Clock, AlertTriangle, Play, CheckSquare,
    User, Plus, LayoutGrid, ListChecks, PauseCircle, ArrowRight, Activity,
    Boxes, ShoppingBag, CheckCircle2, RotateCcw, PackageCheck, FileCheck
} from 'lucide-react';
import { api } from '../services/api';

const OPERARIOS_TALLER = [
    'Juan Pérez T.',
    'Marcos Quispe',
    'Raúl Gómez',
    'Carlos Mendoza',
    'Luis Paredes'
];

const COLUMNAS_KANBAN = [
    {
        id: 'Pendiente de Materiales',
        titulo: 'Recepción / Espera de Insumos',
        badgeBg: 'bg-cyan-100 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800/50',
        headerBorder: 'border-t-4 border-t-cyan-500'
    },
    {
        id: 'Planificada',
        titulo: 'Planificada / En Cola',
        badgeBg: 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/50',
        headerBorder: 'border-t-4 border-t-purple-500'
    },
    {
        id: 'En Proceso',
        titulo: 'En Proceso (Taller)',
        badgeBg: 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/50',
        headerBorder: 'border-t-4 border-t-blue-500'
    },
    {
        id: 'Pausada',
        titulo: 'Pausada / Incidencia',
        badgeBg: 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/50',
        headerBorder: 'border-t-4 border-t-amber-500'
    },
    {
        id: 'Completada',
        titulo: 'Completada / Calidad OK',
        badgeBg: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50',
        headerBorder: 'border-t-4 border-t-emerald-500'
    }
];

export default function Produccion({ initialFilter }) {
    const [soloSinMateriales, setSoloSinMateriales] = useState(initialFilter === 'materiales');
    const notify = useNotifications();
    const [ordenes, setOrdenes] = useState([]);
    const [pedidosDisponibles, setPedidosDisponibles] = useState([]);
    const [selectedOp, setSelectedOp] = useState(null);
    const [vistaModo, setVistaModo] = useState('kanban'); // 'kanban' | 'detalle'
    const [loading, setLoading] = useState(true);

    // Modales de formularios de registro de producción (3.4.2.2)
    const [showNuevaOpModal, setShowNuevaOpModal] = useState(false);
    const [showEtapaModal, setShowEtapaModal] = useState(false);
    const [showParadaModal, setShowParadaModal] = useState(false);
    const [showCalidadModal, setShowCalidadModal] = useState(false);
    const [showMaterialModal, setShowMaterialModal] = useState(false);
    const [opParaVerificar, setOpParaVerificar] = useState(null);
    const [materialForm, setMaterialForm] = useState({
        observaciones_materiales: '',
        guia_remision: ''
    });

    const [nuevaOpForm, setNuevaOpForm] = useState({
        pedido_id: '',
        prioridad: 'Media',
        fecha_inicio_programada: new Date().toISOString().split('T')[0],
        fecha_fin_programada: '',
        responsable_id: '1',
        observaciones: '',
        materiales_recibidos: false
    });

    const [etapaActiva, setEtapaActiva] = useState(null);
    const [etapaForm, setEtapaForm] = useState({
        estado: 'Finalizada',
        horas_reales: 0,
        operario_asignado: 'Juan Pérez T.'
    });

    const [paradaForm, setParadaForm] = useState({ motivo: 'Falta de Material', minutos_parada: 30, descripcion: '' });
    const [calidadForm, setCalidadForm] = useState({ resultado: 'Aprobado', defectos_encontrados: 'Conforme', merma_porcentaje: 0.0 });

    const loadOps = async () => {
        try {
            setLoading(true);
            const [dataOps, dataPedidos] = await Promise.all([
                api.get('/produccion'),
                api.get('/pedidos')
            ]);
            setOrdenes(dataOps);

            // Filtrar pedidos que aún no tienen Orden de Producción generada
            const sinOp = dataPedidos.filter(p => !p.codigo_op && p.estado !== 'Entregado' && p.estado !== 'Cancelado');
            setPedidosDisponibles(sinOp);
            if (sinOp.length > 0 && !nuevaOpForm.pedido_id) {
                setNuevaOpForm(prev => ({
                    ...prev,
                    pedido_id: sinOp[0].id,
                    prioridad: sinOp[0].prioridad || 'Media',
                    fecha_fin_programada: sinOp[0].fecha_entrega_prometida || ''
                }));
            }

            if (dataOps.length > 0 && !selectedOp) {
                setSelectedOp(dataOps[0]);
            } else if (selectedOp) {
                const found = dataOps.find(o => o.id === selectedOp.id);
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

    const handleCreateOrdenProduccion = async (e) => {
        e.preventDefault();
        if (!nuevaOpForm.pedido_id) {
            throw new Error('Seleccione un pedido para generar la Orden de Producción.');
            return;
        }
        try {
            const nueva = await api.post('/produccion', nuevaOpForm);
            setShowNuevaOpModal(false);
            await loadOps();
            setSelectedOp(nueva);
            setVistaModo('detalle');
        } catch (err) {
            throw new Error('Error al registrar OP: ' + err.message);
        }
    };

    const handleCambiarEstadoOp = async (opId, nuevoEstado) => {
        try {
            await api.patch(`/produccion/${opId}/estado`, { estado: nuevoEstado });
            loadOps();
        } catch (err) {
            notify('Error al cambiar estado de la OP: ' + err.message, 'error');
        }
    };

    const openModalVerificarInsumos = (op) => {
        setOpParaVerificar(op);
        const sugerido = op.suministro_insumos === 'Empresa suministra'
            ? 'Insumos adquiridos y habilitados en almacén central para producción.'
            : 'Insumos y materias primas recibidos conformes del comprador en taller.';
        setMaterialForm({
            observaciones_materiales: op.observaciones_materiales || sugerido,
            guia_remision: ''
        });
        setShowMaterialModal(true);
    };

    const handleConfirmarMaterialesModal = async (e) => {
        e.preventDefault();
        if (!opParaVerificar) return;
        try {
            await api.patch(`/produccion/${opParaVerificar.id}/estado`, {
                estado: 'Planificada',
                materiales_recibidos: true,
                fecha_recepcion_materiales: new Date().toISOString(),
                observaciones_materiales: materialForm.guia_remision
                    ? `${materialForm.observaciones_materiales} (Guía/Ref: ${materialForm.guia_remision})`
                    : materialForm.observaciones_materiales
            });
            setShowMaterialModal(false);
            setOpParaVerificar(null);
            await loadOps();
        } catch (err) {
            throw new Error('Error al verificar insumos: ' + err.message);
        }
    };

    const handleAprobarInsumosRapido = async (op) => {
        const textoInsumos = op.suministro_insumos === 'Empresa suministra'
            ? `¿Confirmar que los insumos comprados/suministrados por RV Vega para la orden ${op.codigo_op} ya están listos en taller/almacén?`
            : `¿Confirmar que el cliente (${op.cliente_nombre}) ya trajo los insumos y materiales al taller para la orden ${op.codigo_op}?`;
        if (window.confirm(`${textoInsumos}\n\nLa orden avanzará a la columna "Planificada / En Cola".`)) {
            try {
                await api.patch(`/produccion/${op.id}/estado`, {
                    estado: 'Planificada',
                    materiales_recibidos: true,
                    fecha_recepcion_materiales: new Date().toISOString(),
                    observaciones_materiales: op.suministro_insumos === 'Empresa suministra'
                        ? 'Insumos verificados y disponibles en almacén.'
                        : 'Materiales entregados por el cliente en taller.'
                });
                await loadOps();
            } catch (err) {
                notify('Error al verificar insumos: ' + err.message, 'error');
            }
        }
    };

    const handleUpdateEtapaDirecto = async (etapaId, nuevoEstado, horasReales, operario) => {
        try {
            await api.patch(`/produccion/etapas/${etapaId}`, {
                estado: nuevoEstado,
                horas_reales: horasReales,
                operario_asignado: operario
            });
            loadOps();
        } catch (err) {
            notify('Error al actualizar etapa: ' + err.message, 'error');
        }
    };

    const openModalFinalizarEtapa = (etapa) => {
        setEtapaActiva(etapa);
        setEtapaForm({
            estado: 'Finalizada',
            horas_reales: etapa.horas_reales > 0 ? etapa.horas_reales : etapa.horas_estimadas,
            operario_asignado: etapa.operario_asignado || 'Juan Pérez T.'
        });
        setShowEtapaModal(true);
    };

    const handleSaveEtapaModal = async (e) => {
        e.preventDefault();
        if (!etapaActiva) return;
        try {
            await api.patch(`/produccion/etapas/${etapaActiva.id}`, {
                estado: etapaForm.estado,
                horas_reales: parseFloat(etapaForm.horas_reales) || 0,
                operario_asignado: etapaForm.operario_asignado
            });
            setShowEtapaModal(false);
            setEtapaActiva(null);
            loadOps();
        } catch (err) {
            throw new Error('Error al registrar tiempos de etapa: ' + err.message);
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
            notify('Parada de producción registrada correctamente', 'success');
        } catch (err) {
            throw new Error('Error: ' + err.message);
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
            notify('Inspección de control de calidad registrada', 'success');
        } catch (err) {
            throw new Error('Error: ' + err.message);
        }
    };

    // Resumen global de tiempos de producción (3.4.1.3)
    const ordenesVisibles = soloSinMateriales ? ordenes.filter(o => o.estado === 'Pendiente de Materiales') : ordenes;
    const totalHorasEstimadas = Math.round(ordenesVisibles.reduce((acc, o) => acc + Number(o.horas_estimadas_totales || 0), 0) * 10) / 10;
    const totalHorasReales = Math.round(ordenesVisibles.reduce((acc, o) => acc + Number(o.horas_reales_totales || 0), 0) * 10) / 10;
    const totalMinutosParada = ordenesVisibles.reduce((acc, o) => acc + Number(o.minutos_parada_totales || 0), 0);

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
{soloSinMateriales && <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950 p-4 text-sm text-blue-800 dark:text-blue-200"><span>Órdenes pendientes de materiales</span><button type="button" onClick={() => setSoloSinMateriales(false)} className="font-semibold underline px-2 py-1">Quitar filtro</button></div>}
            {/* Barra Superior: Conmutador Tablero Kanban vs Seguimiento por Etapas + Botón Nueva OP */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={() => setVistaModo('kanban')}
                        className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                            vistaModo === 'kanban'
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                    >
                        <LayoutGrid className="w-4 h-4" />
                        <span>Tablero Kanban de Producción</span>
                    </button>
                    <button
                        onClick={() => setVistaModo('detalle')}
                        className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                            vistaModo === 'detalle'
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                    >
                        <ListChecks className="w-4 h-4" />
                        <span>Trazabilidad y Tiempos por OP</span>
                    </button>
                </div>

                <div className="flex items-center gap-3">
                    <div className="hidden xl:flex items-center gap-4 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                        <span>H. Estándar: <b className="text-slate-900 dark:text-white">{totalHorasEstimadas}h</b></span>
                        <span>H. Reales: <b className="text-blue-600 dark:text-blue-400">{totalHorasReales}h</b></span>
                        <span>Paradas: <b className="text-amber-600 dark:text-amber-400">{totalMinutosParada} min</b></span>
                    </div>

                    <button
                        onClick={() => setShowNuevaOpModal(true)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-sm transition cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Registrar Orden de Producción</span>
                    </button>
                </div>
            </div>

            {/* ========================================================================= */}
            {/* VISTA 1: TABLERO KANBAN DE PRODUCCIÓN (REQUERIMIENTO 3.4.2.1)             */}
            {/* ========================================================================= */}
            {vistaModo === 'kanban' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                    {COLUMNAS_KANBAN.map((col) => {
                        const opsColumna = ordenesVisibles.filter(o => o.estado === col.id);
                        return (
                            <div
                                key={col.id}
                                className={`bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 ${col.headerBorder} shadow-sm flex flex-col min-h-[480px] transition-colors`}
                            >
                                {/* Cabecera de Columna Kanban */}
                                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                    <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                        {col.titulo}
                                    </h3>
                                    <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full border ${col.badgeBg}`}>
                                        {opsColumna.length}
                                    </span>
                                </div>

                                {/* Tarjetas Kanban */}
                                <div className="p-3 space-y-3 flex-1 overflow-y-auto">
                                    {opsColumna.length === 0 ? (
                                        <div className="h-40 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center text-center p-4 text-xs text-slate-400 dark:text-slate-600">
                                            Sin órdenes en estado "{col.id}"
                                        </div>
                                    ) : (
                                        opsColumna.map((op) => {
                                            const etapaActual = op.etapas?.find(e => e.estado === 'En Proceso') || op.etapas?.find(e => e.estado === 'Pendiente');
                                            return (
                                                <div
                                                    key={op.id}
                                                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:border-blue-400 dark:hover:border-blue-500 shadow-sm transition space-y-3"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-mono font-bold text-xs text-blue-700 dark:text-blue-400">
                                                            {op.codigo_op}
                                                        </span>
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                                            op.prioridad === 'Urgente'
                                                                ? 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-200 dark:border-red-900/50'
                                                                : op.prioridad === 'Alta'
                                                                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/50'
                                                                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600'
                                                        }`}>
                                                            {op.prioridad}
                                                        </span>
                                                    </div>

                                                    <div>
                                                        <h4 className="font-bold text-xs text-slate-900 dark:text-white line-clamp-1">
                                                            {op.cliente_nombre}
                                                        </h4>
                                                        <div className="flex items-center justify-between gap-1 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                                            <span className="font-mono">Pedido: {op.codigo_pedido}</span>
                                                            <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded border ${
                                                                op.suministro_insumos === 'Empresa suministra'
                                                                    ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                                                                    : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                                            }`} title={op.suministro_insumos === 'Empresa suministra' ? 'Insumos suministrados por la empresa' : 'El cliente trae sus insumos'}>
                                                                {op.suministro_insumos === 'Empresa suministra' ? 'Insumos Taller' : 'Insumos Cliente'}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Bloque de Estado de Insumos o Fase Activa */}
                                                    {op.estado === 'Pendiente de Materiales' ? (
                                                        <div className={`p-2.5 rounded-lg border text-[11px] space-y-1.5 ${
                                                            op.suministro_insumos === 'Empresa suministra'
                                                                ? 'bg-purple-50/70 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800/60'
                                                                : 'bg-cyan-50/70 dark:bg-cyan-950/40 border-cyan-200 dark:border-cyan-800/60'
                                                        }`}>
                                                            <div className="flex items-center justify-between">
                                                                <span className="font-bold flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                                                                    {op.suministro_insumos === 'Empresa suministra' ? (
                                                                        <>
                                                                            <ShoppingBag className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                                                                            <span>Insumos RV Vega</span>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <Boxes className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                                                                            <span>Insumos Cliente</span>
                                                                        </>
                                                                    )}
                                                                </span>
                                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                                                                    op.materiales_recibidos
                                                                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                                                                        : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                                                                }`}>
                                                                    {op.materiales_recibidos ? 'Listo' : 'Pendiente'}
                                                                </span>
                                                            </div>
                                                            <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-snug">
                                                                {op.suministro_insumos === 'Empresa suministra'
                                                                    ? 'Revisar stock o compra de materiales antes de pasar a planificación.'
                                                                    : 'Revisar si el cliente ya trajo los materiales al taller para habilitar el corte.'}
                            </p>
                                                            {op.observaciones_materiales && (
                                                                <div className="text-[10px] text-slate-500 dark:text-slate-400 italic bg-white/70 dark:bg-slate-900/50 p-1 rounded border border-slate-200/60 dark:border-slate-800">
                                                                    Nota: {op.observaciones_materiales}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        etapaActual && op.estado !== 'Completada' && (
                                                            <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 text-[11px]">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-slate-400 dark:text-slate-500 text-[10px] uppercase font-semibold">Fase Activa:</span>
                                                                    {op.estado === 'Planificada' && (
                                                                        <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                                                                            <CheckCircle2 className="w-2.5 h-2.5" /> Insumos OK
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className="font-bold text-slate-800 dark:text-slate-200 truncate">{etapaActual.nombre_etapa}</div>
                                                                <div className="text-slate-500 dark:text-slate-400 text-[10px] mt-0.5">
                                                                    Téc: {etapaActual.operario_asignado}
                                                                </div>
                                                            </div>
                                                        )
                                                    )}

                                                    {/* Barra de Avance y Tiempos (3.4.1.3) */}
                                                    <div className="space-y-1.5">
                                                        <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-300">
                                                            <span>Avance ({op.etapas_finalizadas}/{op.total_etapas} fases)</span>
                                                            <span className="font-bold">{op.porcentaje_avance}%</span>
                                                        </div>
                                                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                                                            <div
                                                                className="bg-blue-600 dark:bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                                                                style={{ width: `${op.porcentaje_avance}%` }}
                                                            />
                                                        </div>
                                                        <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-1">
                                                            <span>Est: <b>{op.horas_estimadas_totales || 0}h</b></span>
                                                            <span>Real: <b>{op.horas_reales_totales || 0}h</b></span>
                                                            <span>Efic: <b className="text-emerald-600 dark:text-emerald-400">{op.eficiencia_tiempo_pct || 100}%</b></span>
                                                        </div>
                                                    </div>

                                                    {/* Acciones rápidas en Tarjeta Kanban */}
                                                    <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between gap-1.5">
                                                        <button
                                                            onClick={() => {
                                                                setSelectedOp(op);
                                                                setVistaModo('detalle');
                                                            }}
                                                            className="px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-blue-600 dark:text-blue-400 border border-slate-200 dark:border-slate-700 rounded text-[11px] font-semibold transition cursor-pointer"
                                                        >
                                                            Gestionar Fases
                                                        </button>

                                                        <div className="flex items-center gap-1">
                                                            {op.estado === 'Pendiente de Materiales' && (
                                                                <>
                                                                    <button
                                                                        onClick={() => openModalVerificarInsumos(op)}
                                                                        className="px-2 py-1 bg-white dark:bg-slate-800 hover:bg-cyan-50 dark:hover:bg-slate-700 text-cyan-700 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800 rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                                                                        title="Registrar guía u observaciones de insumos"
                                                                    >
                                                                        <FileCheck className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
                                                                        <span>Revisar</span>
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleAprobarInsumosRapido(op)}
                                                                        className="px-2 py-1 bg-cyan-600 hover:bg-cyan-700 text-white rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer shadow-sm"
                                                                        title={op.suministro_insumos === 'Empresa suministra'
                                                                            ? 'Confirmar insumos en taller y pasar a Planificada'
                                                                            : 'Confirmar recepción de insumos del cliente y pasar a Planificada'}
                                                                    >
                                                                        <CheckCircle2 className="w-3 h-3" />
                                                                        <span>Aprobar</span>
                                                                    </button>
                                                                </>
                                                            )}
                                                            {op.estado === 'Planificada' && (
                                                                <>
                                                                    <button
                                                                        onClick={() => handleCambiarEstadoOp(op.id, 'Pendiente de Materiales')}
                                                                        className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 rounded text-[10px]"
                                                                        title="Regresar a Espera de Insumos"
                                                                    >
                                                                        <RotateCcw className="w-3 h-3" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleCambiarEstadoOp(op.id, 'En Proceso')}
                                                                        className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                                                                        title="Mover a En Proceso"
                                                                    >
                                                                        <Play className="w-3 h-3" /> Iniciar
                                                                    </button>
                                                                </>
                                                            )}
                                                            {op.estado === 'En Proceso' && (
                                                                <>
                                                                    <button
                                                                        onClick={() => handleCambiarEstadoOp(op.id, 'Pausada')}
                                                                        className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                                                                        title="Pausar OP"
                                                                    >
                                                                        <PauseCircle className="w-3 h-3" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleCambiarEstadoOp(op.id, 'Completada')}
                                                                        className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                                                                        title="Marcar Completada"
                                                                    >
                                                                        <CheckCircle className="w-3 h-3" />
                                                                    </button>
                                                                </>
                                                            )}
                                                            {op.estado === 'Pausada' && (
                                                                <button
                                                                    onClick={() => handleCambiarEstadoOp(op.id, 'En Proceso')}
                                                                    className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                                                                >
                                                                    <ArrowRight className="w-3 h-3" /> Reanudar
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                /* ========================================================================= */
                /* VISTA 2: DETALLE, TIEMPOS DE PRODUCCIÓN Y TRAZABILIDAD POR ETAPAS         */
                /* ========================================================================= */
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Columna Izquierda: Lista de OPs */}
                    <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 space-y-3 transition-colors">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">Órdenes de Producción</h3>
                            <span className="text-[11px] bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-900/40">
                                {ordenesVisibles.length} OPs
                            </span>
                        </div>

                        <div className="space-y-2.5 overflow-y-auto max-h-[calc(100vh-280px)] pr-1">
                            {ordenesVisibles.map((op) => {
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

                    {/* Columna Derecha: Detalle y Trazabilidad */}
                    <div className="lg:col-span-8 space-y-4">
                        {selectedOp ? (
                            <div className="space-y-4">
                                {/* Tarjeta de Cabecera */}
                                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-4 transition-colors">
                                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-base font-extrabold text-blue-700 dark:text-blue-400">{selectedOp.codigo_op}</span>
                                                <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                                                    {selectedOp.codigo_pedido}
                                                </span>
                                                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${
                                                    selectedOp.suministro_insumos === 'Empresa suministra'
                                                        ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                                                        : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                                }`}>
                                                    {selectedOp.suministro_insumos === 'Empresa suministra' ? 'Insumos Taller' : 'Insumos Cliente'}
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

                                    {/* Panel de Cálculo de Tiempos de Producción (Requerimiento 3.4.1.3) */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                                        <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                                            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block">Horas Estimadas</span>
                                            <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200">{selectedOp.horas_estimadas_totales || 0} h</span>
                                        </div>
                                        <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                                            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block">Horas Reales</span>
                                            <span className="text-sm font-extrabold text-blue-600 dark:text-blue-400">{selectedOp.horas_reales_totales || 0} h</span>
                                        </div>
                                        <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                                            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block">Tiempo en Paradas</span>
                                            <span className="text-sm font-extrabold text-amber-600 dark:text-amber-400">{selectedOp.minutos_parada_totales || 0} min</span>
                                        </div>
                                        <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                                            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block">Eficiencia Tiempo</span>
                                            <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">{selectedOp.eficiencia_tiempo_pct || 100}%</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Panel de Estado y Verificación de Insumos / Materiales */}
                                <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-colors ${
                                    selectedOp.materiales_recibidos
                                        ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/50'
                                        : 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/50'
                                }`}>
                                    <div className="flex items-start gap-3">
                                        <div className={`p-2 rounded-lg mt-0.5 ${
                                            selectedOp.materiales_recibidos
                                                ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                                                : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                                        }`}>
                                            {selectedOp.suministro_insumos === 'Empresa suministra' ? <ShoppingBag className="w-5 h-5" /> : <Boxes className="w-5 h-5" />}
                                        </div>
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="font-bold text-xs text-slate-800 dark:text-slate-100">
                                                    {selectedOp.suministro_insumos === 'Empresa suministra' ? 'Insumos suministrados por RV Vega' : 'Insumos aportados por el Cliente'}
                                                </span>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                    selectedOp.materiales_recibidos
                                                        ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300'
                                                        : 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 animate-pulse'
                                                }`}>
                                                    {selectedOp.materiales_recibidos ? '✓ Materiales Recibidos en Taller' : '⏳ Pendiente de Recepción / Compra'}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1">
                                                {selectedOp.observaciones_materiales || (selectedOp.materiales_recibidos ? 'Insumos verificados conformes para inicio de corte y armado.' : 'En espera de llegada de materias primas antes de iniciar fabricación.')}
                                            </p>
                                            {selectedOp.fecha_recepcion_materiales && (
                                                <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                                                    Fecha de recepción/verificación: {new Date(selectedOp.fecha_recepcion_materiales).toLocaleString()}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                                        {!selectedOp.materiales_recibidos ? (
                                            <button
                                                type="button"
                                                onClick={() => openModalVerificarInsumos(selectedOp)}
                                                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg shadow-sm flex items-center gap-1.5 transition cursor-pointer"
                                            >
                                                <PackageCheck className="w-3.5 h-3.5" />
                                                <span>Revisar y Confirmar Insumos</span>
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => openModalVerificarInsumos(selectedOp)}
                                                className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 font-semibold text-xs rounded-lg transition cursor-pointer"
                                            >
                                                Modificar Nota de Insumos
                                            </button>
                                        )}
                                    </div>
                                    {selectedOp.materiales_solicitados && selectedOp.materiales_solicitados.length > 0 && (
                                        <div className="w-full mt-3 pt-3 border-t border-purple-200/80 dark:border-purple-800/60">
                                            <span className="text-[11px] font-bold text-purple-900 dark:text-purple-300 block mb-1.5 flex items-center gap-1.5">
                                                <Boxes className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                                                <span>Materiales asignados para este pedido (Suministrados por Nosotros):</span>
                                            </span>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                                {selectedOp.materiales_solicitados.map((m, idx) => (
                                                    <div key={idx} className="p-2 bg-white dark:bg-[#151e2f] rounded-lg border border-purple-200 dark:border-purple-900/50 shadow-xs flex justify-between items-center text-xs">
                                                        <div>
                                                            <div className="font-semibold text-slate-800 dark:text-slate-100">{m.nombre}</div>
                                                            <div className="text-[10px] text-slate-400 font-mono">{m.codigo_sku}</div>
                                                        </div>
                                                        <span className="font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded border border-purple-200 dark:border-purple-800">
                                                            {m.cantidad} {m.unidad_medida}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Seguimiento Digital por Etapas */}
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
                                                );
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

                                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-slate-600 dark:text-slate-300 bg-white dark:bg-[#151e2f] p-2 rounded border border-slate-100 dark:border-slate-700 w-fit mt-1">
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
                                                                    onClick={() => handleUpdateEtapaDirecto(etapa.id, 'En Proceso', etapa.horas_reales, etapa.operario_asignado)}
                                                                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                                                                >
                                                                    <Play className="w-3.5 h-3.5 fill-current" />
                                                                    <span>Iniciar Etapa</span>
                                                                </button>
                                                            )}

                                                            {isEnProceso && (
                                                                <button
                                                                    onClick={() => openModalFinalizarEtapa(etapa)}
                                                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-blue-500/20 transition cursor-pointer animate-pulse"
                                                                >
                                                                    <CheckCircle className="w-4 h-4" />
                                                                    <span>Registrar Tiempos y Finalizar</span>
                                                                </button>
                                                            )}

                                                            {isFinalizada && (
                                                                <button
                                                                    onClick={() => openModalFinalizarEtapa(etapa)}
                                                                    className="text-xs text-emerald-700 dark:text-emerald-300 font-bold flex items-center gap-1.5 bg-emerald-100/50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-100 cursor-pointer"
                                                                    title="Editar horas registradas"
                                                                >
                                                                    <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                                                    Etapa Completada
                                                                </button>
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
            )}

            {/* ========================================================================= */}
            {/* FORMULARIO MODAL 1: REGISTRAR NUEVA ORDEN DE PRODUCCIÓN (3.4.2.2)         */}
            {/* ========================================================================= */}
            {showNuevaOpModal && createPortal(
                <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm z-[999] flex items-center justify-center p-3 sm:p-4 overflow-hidden">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden border border-slate-100 dark:border-slate-800 transition-colors">
                        <div className="bg-slate-900 dark:bg-slate-950 px-6 py-4 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
                            <h3 className="font-bold text-sm flex items-center gap-2">
                                <Hammer className="w-4 h-4 text-amber-400" />
                                Registrar Nueva Orden de Producción (OP)
                            </h3>
                            <button onClick={() => setShowNuevaOpModal(false)} className="text-slate-400 hover:text-white text-lg cursor-pointer">✕</button>
                        </div>

                        <AsyncForm onSubmit={handleCreateOrdenProduccion} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Pedido Asociado *</label>
                                {pedidosDisponibles.length === 0 ? (
                                    <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-300">
                                        Todos los pedidos actuales ya cuentan con una Orden de Producción asignada. Puede registrar un nuevo pedido en el módulo de Pedidos.
                                    </div>
                                ) : (
                                    <select
                                        required
                                        value={nuevaOpForm.pedido_id}
                                        onChange={(e) => {
                                            const ped = pedidosDisponibles.find(p => String(p.id) === String(e.target.value));
                                            setNuevaOpForm({
                                                ...nuevaOpForm,
                                                pedido_id: e.target.value,
                                                prioridad: ped?.prioridad || 'Media',
                                                fecha_fin_programada: ped?.fecha_entrega_prometida || nuevaOpForm.fecha_fin_programada
                                            });
                                        }}
                                        className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        {pedidosDisponibles.map(p => (
                                            <option key={p.id} value={p.id}>
                                                {p.codigo_pedido} - {p.cliente_nombre} ({p.suministro_insumos === 'Empresa suministra' ? 'Insumos Taller' : 'Insumos Cliente'})
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Fecha Inicio Programada *</label>
                                    <input
                                        type="date"
                                        required
                                        value={nuevaOpForm.fecha_inicio_programada}
                                        onChange={(e) => setNuevaOpForm({ ...nuevaOpForm, fecha_inicio_programada: e.target.value })}
                                        className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Fecha Fin Programada *</label>
                                    <input
                                        type="date"
                                        required
                                        value={nuevaOpForm.fecha_fin_programada}
                                        onChange={(e) => setNuevaOpForm({ ...nuevaOpForm, fecha_fin_programada: e.target.value })}
                                        className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Prioridad de Fabricación</label>
                                    <select
                                        value={nuevaOpForm.prioridad}
                                        onChange={(e) => setNuevaOpForm({ ...nuevaOpForm, prioridad: e.target.value })}
                                        className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="Baja">Baja</option>
                                        <option value="Media">Media</option>
                                        <option value="Alta">Alta</option>
                                        <option value="Urgente">Urgente</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Jefe / Supervisor Responsable</label>
                                    <select
                                        value={nuevaOpForm.responsable_id}
                                        onChange={(e) => setNuevaOpForm({ ...nuevaOpForm, responsable_id: e.target.value })}
                                        className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="1">Ing. Roberto Vega (Administrador / Gerencia)</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Instrucciones / Observaciones de Taller</label>
                                <textarea
                                    rows="2"
                                    value={nuevaOpForm.observaciones}
                                    onChange={(e) => setNuevaOpForm({ ...nuevaOpForm, observaciones: e.target.value })}
                                    placeholder="Especificaciones de soldadura, tolerancias, lote de pintura..."
                                    className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1.5">
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={nuevaOpForm.materiales_recibidos}
                                        onChange={(e) => setNuevaOpForm({ ...nuevaOpForm, materiales_recibidos: e.target.checked })}
                                        className="w-4 h-4 text-blue-600 rounded border-slate-300 dark:border-slate-600 focus:ring-blue-500"
                                    />
                                    <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                                        ¿Los insumos / materias primas ya están disponibles en taller?
                                    </span>
                                </label>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-6">
                                    {nuevaOpForm.materiales_recibidos
                                        ? '✓ Se registrará directamente en "Planificada / En Cola".'
                                        : '⏳ Se colocará primero en "Recepción / Espera de Insumos" hasta revisar que el cliente o compras los haya entregado.'}
                                </p>
                            </div>

                            <div className="pt-3 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                                <button type="button" onClick={() => setShowNuevaOpModal(false)} className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800">Cancelar</button>
                                <button
                                    type="submit"
                                    disabled={pedidosDisponibles.length === 0}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-lg shadow-sm cursor-pointer"
                                >
                                    Generar Orden y 5 Etapas
                                </button>
                            </div>
                        </AsyncForm>
                    </div>
                </div>,
                document.body
            )}

            {/* ========================================================================= */}
            {/* FORMULARIO MODAL 2: REGISTRO DE TIEMPOS Y AVANCE DE ETAPA (3.4.2.2)       */}
            {/* ========================================================================= */}
            {showEtapaModal && etapaActiva && createPortal(
                <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm z-[999] flex items-center justify-center p-3 sm:p-4 overflow-hidden">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md max-h-[92vh] flex flex-col overflow-hidden border border-slate-100 dark:border-slate-800 p-6 space-y-4 text-xs transition-colors">
                        <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            Registro de Producción: {etapaActiva.nombre_etapa}
                        </h3>

                        <AsyncForm onSubmit={handleSaveEtapaModal} className="space-y-3">
                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Estado de la Fase</label>
                                <select
                                    value={etapaForm.estado}
                                    onChange={(e) => setEtapaForm({ ...etapaForm, estado: e.target.value })}
                                    className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="En Proceso">En Proceso</option>
                                    <option value="Finalizada">Finalizada (Completada)</option>
                                    <option value="Detenida">Detenida</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-semibold text-slate-500 dark:text-slate-400 mb-1">Horas Estándar</label>
                                    <input
                                        type="text"
                                        disabled
                                        value={`${etapaActiva.horas_estimadas} horas`}
                                        className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Horas Reales Invertidas *</label>
                                    <input
                                        type="number"
                                        step="0.5"
                                        min="0.5"
                                        required
                                        value={etapaForm.horas_reales}
                                        onChange={(e) => setEtapaForm({ ...etapaForm, horas_reales: e.target.value })}
                                        className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Operario / Técnico Asignado</label>
                                <select
                                    value={etapaForm.operario_asignado}
                                    onChange={(e) => setEtapaForm({ ...etapaForm, operario_asignado: e.target.value })}
                                    className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    {OPERARIOS_TALLER.map(opName => (
                                        <option key={opName} value={opName}>{opName}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="pt-3 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                                <button type="button" onClick={() => setShowEtapaModal(false)} className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800">Cancelar</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm cursor-pointer">Guardar Registro</button>
                            </div>
                        </AsyncForm>
                    </div>
                </div>,
                document.body
            )}

            {/* Modal Parada de Producción */}
            {showParadaModal && createPortal(
                <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm z-[999] flex items-center justify-center p-3 sm:p-4 overflow-hidden">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md max-h-[92vh] flex flex-col overflow-hidden border border-slate-100 dark:border-slate-800 p-6 space-y-4 text-xs transition-colors">
                        <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                            Registrar Parada / Incidencia en Taller
                        </h3>

                        <AsyncForm onSubmit={handleSaveParada} className="space-y-3">
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
                        </AsyncForm>
                    </div>
                </div>,
                document.body
            )}

            {/* Modal Control de Calidad */}
            {showCalidadModal && createPortal(
                <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm z-[999] flex items-center justify-center p-3 sm:p-4 overflow-hidden">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md max-h-[92vh] flex flex-col overflow-hidden border border-slate-100 dark:border-slate-800 p-6 space-y-4 text-xs transition-colors">
                        <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            Inspección de Control de Calidad
                        </h3>

                        <AsyncForm onSubmit={handleSaveCalidad} className="space-y-3">
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
                        </AsyncForm>
                    </div>
                </div>,
                document.body
            )}

            {/* ========================================================================= */}
            {/* FORMULARIO MODAL 4: VERIFICACIÓN Y RECEPCIÓN DE INSUMOS / MATERIALES       */}
            {/* ========================================================================= */}
            {showMaterialModal && opParaVerificar && createPortal(
                <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm z-[999] flex items-center justify-center p-3 sm:p-4 overflow-hidden">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden border border-slate-100 dark:border-slate-800 transition-colors">
                        <div className="bg-slate-900 dark:bg-slate-950 px-6 py-4 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
                            <div className="flex items-center gap-2">
                                <PackageCheck className="w-5 h-5 text-cyan-400" />
                                <div>
                                    <h3 className="font-bold text-sm">Verificación y Recepción de Insumos</h3>
                                    <p className="text-[11px] text-slate-400 font-mono">
                                        {opParaVerificar.codigo_op} — Pedido {opParaVerificar.codigo_pedido}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => { setShowMaterialModal(false); setOpParaVerificar(null); }}
                                className="text-slate-400 hover:text-white text-lg cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        <AsyncForm onSubmit={handleConfirmarMaterialesModal} className="p-6 space-y-4 text-xs">
                            {/* Card con Modo de Suministro */}
                            <div className={`p-3 rounded-xl border flex items-center gap-3 ${
                                opParaVerificar.suministro_insumos === 'Empresa suministra'
                                    ? 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800/50 text-purple-900 dark:text-purple-200'
                                    : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50 text-emerald-900 dark:text-emerald-200'
                            }`}>
                                <div className="p-2 rounded-lg bg-white dark:bg-slate-800 shadow-sm shrink-0">
                                    {opParaVerificar.suministro_insumos === 'Empresa suministra'
                                        ? <ShoppingBag className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                        : <Boxes className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
                                </div>
                                <div className="flex-1">
                                    <span className="text-[10px] font-bold uppercase tracking-wider block opacity-75">
                                        Modalidad de Abastecimiento de Insumos
                                    </span>
                                    <span className="font-bold text-xs">
                                        {opParaVerificar.suministro_insumos === 'Empresa suministra'
                                            ? 'Insumos suministrados por RV Vega (Compra directa o stock disponible en almacén)'
                                            : 'Insumos traídos por el Cliente (El cliente entrega materias primas en taller)'}
                                    </span>
                                </div>
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    {opParaVerificar.suministro_insumos === 'Empresa suministra'
                                        ? 'N° de Orden de Compra / Guía de Almacén'
                                        : 'N° de Guía de Remisión / Ticket de Recepción de Cliente'}
                                </label>
                                <input
                                    type="text"
                                    value={materialForm.guia_remision}
                                    onChange={(e) => setMaterialForm({ ...materialForm, guia_remision: e.target.value })}
                                    placeholder={opParaVerificar.suministro_insumos === 'Empresa suministra' ? 'Ej. OC-2026-088 o Vale Almacén #12' : 'Ej. GR-001-004523'}
                                    className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
                                />
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Observaciones de Inspección y Recepción *
                                </label>
                                <textarea
                                    required
                                    rows="3"
                                    value={materialForm.observaciones_materiales}
                                    onChange={(e) => setMaterialForm({ ...materialForm, observaciones_materiales: e.target.value })}
                                    placeholder="Detalles del material: dimensiones, calidad física, conformidad, cantidad de planchas/perfiles..."
                                    className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-cyan-500"
                                />
                            </div>

                            <div className="p-3 rounded-lg bg-cyan-50/70 dark:bg-cyan-950/20 border border-cyan-200 dark:border-cyan-800/50 text-cyan-800 dark:text-cyan-300 text-[11px] flex items-start gap-2">
                                <FileCheck className="w-4 h-4 shrink-0 mt-0.5 text-cyan-600 dark:text-cyan-400" />
                                <span>
                                    Al validar la recepción, la orden se marcará como <strong>materiales recibidos</strong> y se trasladará automáticamente a la fase <strong>"Planificada / En Cola"</strong> para que los operarios puedan iniciar la producción.
                                </span>
                            </div>

                            <div className="pt-3 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => { setShowMaterialModal(false); setOpParaVerificar(null); }}
                                    className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer"
                                >
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span>Aprobar Materiales y Pasar a Planificada</span>
                                </button>
                            </div>
                        </AsyncForm>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}