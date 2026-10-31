import React, { useState, useEffect } from 'react';
import {
    ShoppingBag, Hammer, TrendingUp, AlertTriangle,
    ArrowUpRight, Bot, FileText, FileSpreadsheet
} from 'lucide-react';
import { api } from '../services/api';
import { useTheme } from '../context/ThemeContext';
// Librerías para Gráficos (OE4)
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
// Librerías para Exportación (OE4)
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import LoadingScreen from '../components/LoadingScreen';

export default function Dashboard({ setActiveTab }) {
    const { isDark } = useTheme();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    const [error, setError] = useState('');
    const [updatedAt, setUpdatedAt] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        let cancelled = false;
        async function loadData() {
            setLoading(true);
            setError('');
            try {
                const [bi, pedidos, ops] = await Promise.all([api.get('/bi/dashboard'), api.get('/pedidos'), api.get('/produccion')]);
                if (!Array.isArray(pedidos) || !Array.isArray(ops)) throw new Error('Respuesta inválida');
                if (!cancelled) { setData({ bi, pedidos, ops }); setUpdatedAt(new Date()); }
            } catch (err) {
                if (!cancelled) setError('No se pudo cargar el resumen. Comprueba tu conexión e inténtalo de nuevo.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        loadData();
        return () => { cancelled = true; };
    }, [refreshKey]);

    // --- LÓGICA OE4: EXPORTACIÓN A EXCEL ---
    const handleExportarExcel = () => {
        if (!data) return;
        const pedidosExcel = data.pedidos.map(p => ({
            'Código': p.codigo_pedido,
            'Cliente': p.cliente_nombre,
            'Suministro Insumos': p.suministro_insumos || 'Cliente los trae',
            'Estado': p.estado,
            'Prioridad': p.prioridad,
            'Fecha Entrega': p.fecha_entrega_prometida,
            'Total (S/)': p.total
        }));

        const ws = XLSX.utils.json_to_sheet(pedidosExcel);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Pedidos_Gerenciales");
        XLSX.writeFile(wb, `Dashboard_Gerencial_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    // --- LÓGICA OE4: EXPORTACIÓN A PDF ---
    const handleExportarPDF = () => {
        if (!data) return;
        const doc = new jsPDF();

        doc.setFontSize(18);
        doc.text('Reporte Gerencial de Producción y Pedidos', 14, 20);

        doc.setFontSize(11);
        doc.text(`Fecha de emisión: ${new Date().toLocaleDateString('es-PE')}`, 14, 28);
        doc.text(`OEE Global: ${data.bi?.oee?.global == null ? 'Sin datos' : data.bi.oee.global + '%'}`, 14, 34);

        const tableColumn = ["Código", "Cliente", "Insumos", "Estado", "Prioridad", "Total (S/)"];
        const tableRows = data.pedidos.map(p => [
            p.codigo_pedido,
            p.cliente_nombre,
            p.suministro_insumos || 'Cliente los trae',
            p.estado,
            p.prioridad,
            `S/ ${p.total}`
        ]);

        autoTable(doc, {
            startY: 40,
            head: [tableColumn],
            body: tableRows,
            theme: 'grid',
            headStyles: { fillColor: [30, 58, 138] }
        });

        doc.save(`Reporte_Gerencial_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    if (loading) {
        return (
            <div className="p-4 sm:p-6 lg:p-8">
                <LoadingScreen fullScreen={false} message="Cargando indicadores ejecutivos y operaciones de planta..." />
            </div>
        );
    }

    if (error) return <div className="p-4 sm:p-8"><div role="alert" className="rounded-xl border border-red-300 dark:border-red-800 p-5 space-y-3"><p>{error}</p><button onClick={() => setRefreshKey(v => v + 1)} className="px-4 py-2 rounded-lg bg-blue-600 text-white">Reintentar</button></div></div>;

    const percent = value => value == null ? 'Sin datos' : value + '%';
    const oee = data?.bi?.oee;
    const kpis = data?.bi?.resumen_kpis;
    // Compare calendar days in Peru; date-only delivery values must not shift timezone.
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const dayNumber = value => {
        const match = String(value ?? '').match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (!match) return null;
        const date = new Date(Date.UTC(+match[1], +match[2] - 1, +match[3]));
        return date.toISOString().slice(0, 10) === match[0] ? date.getTime() / 86400000 : null;
    };
    const todayNumber = dayNumber(today);
    const abiertos = data.pedidos.filter(p => !['Entregado', 'Cancelado', 'Anulado'].includes(p.estado));
    const pendientes = abiertos.map(p => ({ ...p, dias: dayNumber(p.fecha_entrega_prometida) == null ? null : dayNumber(p.fecha_entrega_prometida) - todayNumber }))
        .sort((a, b) => (a.dias ?? Infinity) - (b.dias ?? Infinity));
    const vencidos = pendientes.filter(p => p.dias != null && p.dias < 0);
    const proximos = pendientes.filter(p => p.dias != null && p.dias >= 0 && p.dias <= 7);
    const pedidosRecientes = pendientes.slice(0, 5);
    const bloqueadas = data.ops.filter(o => o.estado === 'Pendiente de Materiales');
    const opsActivas = (data?.ops || []).filter(o => o.estado === 'En Proceso' || o.estado === 'Planificada' || o.estado === 'Pendiente de Materiales');

    // Datos procesados para gráficos (OE4)
    const pedidosPorEstado = [
        { name: 'Entregado', value: data?.pedidos.filter(p => p.estado === 'Entregado').length || 0, color: '#10b981' },
        { name: 'En Producción', value: data?.pedidos.filter(p => p.estado === 'En Producción').length || 0, color: '#3b82f6' },
        { name: 'Planificación', value: data?.pedidos.filter(p => p.estado === 'En Planificación').length || 0, color: '#8b5cf6' },
        { name: 'Pendiente', value: data?.pedidos.filter(p => p.estado === 'Pendiente').length || 0, color: '#f59e0b' }
    ].filter(d => d.value > 0);

    const tooltipStyle = {
        backgroundColor: isDark ? '#0f172a' : '#ffffff',
        borderColor: isDark ? '#334155' : '#e2e8f0',
        color: isDark ? '#f8fafc' : '#0f172a',
        borderRadius: '8px',
        boxShadow: isDark ? '0 10px 15px -3px rgba(0, 0, 0, 0.5)' : '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        fontSize: '12px'
    };

    const tooltipItemStyle = {
        color: isDark ? '#f8fafc' : '#0f172a'
    };

    const tooltipLabelStyle = {
        color: isDark ? '#f8fafc' : '#0f172a',
        fontWeight: 'bold'
    };

    const CustomPieTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const item = payload[0];
            const color = item.payload?.color || item.color || '#3b82f6';
            return (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-lg shadow-xl text-xs flex items-center gap-2.5 pointer-events-none">
                    <span className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0" style={{ backgroundColor: color }} />
                    <span className="font-medium text-slate-700 dark:text-slate-300">{item.name}:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{item.value}</span>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">

            <section aria-labelledby="dashboard-ai-title" className="relative overflow-hidden rounded-2xl border border-blue-200 dark:border-blue-900 bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950 p-5 sm:p-7 shadow-sm">
                <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-20 h-60 w-60 rounded-full bg-blue-200/30 dark:bg-blue-500/10 blur-3xl" />
                <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="flex items-start gap-4 min-w-0">
                        <div className="shrink-0 flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20"><Bot aria-hidden="true" className="h-7 w-7" /></div>
                        <div className="min-w-0 space-y-2">
                            <p className="text-xs font-semibold tracking-widest uppercase text-blue-700 dark:text-blue-300">Copiloto de planta · RV Vega</p>
                            <h2 id="dashboard-ai-title" className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Tu operación, con una visión más clara</h2>
                            <p className="max-w-xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">Consulta tus pedidos, revisa la producción y explora las necesidades de insumos con tu asistente de IA.</p>
                        </div>
                    </div>
                    <button type="button" onClick={() => setActiveTab('ai')} className="shrink-0 flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900">
                        Abrir asistente <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
                    </button>
                </div>
                <div className="relative mt-5 flex flex-wrap gap-2 border-t border-blue-100 dark:border-slate-700/70 pt-4" aria-label="Temas que puedes consultar">
                    {['Pedidos y entregas', 'Avance de producción', 'Insumos y compras'].map(topic => <span key={topic} className="rounded-full border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">{topic}</span>)}
                </div>
            </section>

            {/* Top Header con Botones de Exportación (OE4) */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Resumen de operaciones</h1>

                <div className="flex flex-wrap items-center gap-2">
                    <button onClick={() => setRefreshKey(v => v + 1)} className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold">Actualizar</button>
                    <button
                        onClick={handleExportarExcel}
                        className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                    >
                        <FileSpreadsheet className="w-4 h-4" />
                        Exportar Excel
                    </button>
                    <button
                        onClick={handleExportarPDF}
                        className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                    >
                        <FileText className="w-4 h-4" />
                        Exportar PDF
                    </button>
                </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">Actualizado: {updatedAt?.toLocaleTimeString('es-PE', { timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit' })} · Horario de Perú</p>
            <section aria-labelledby="attention-title" className="space-y-3">
                <h2 id="attention-title" className="text-lg font-bold">Qué requiere atención</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                    {[
                        { label: 'Pedidos vencidos', value: vencidos.length, detail: 'Entrega prometida anterior a hoy', tab: 'pedidos', filter: 'vencidos' },
                        { label: 'Entregas próximas', value: proximos.length, detail: 'Desde hoy hasta los próximos 7 días', tab: 'pedidos', filter: 'proximos' },
                        { label: 'Órdenes sin materiales', value: bloqueadas.length, detail: 'Pendientes de materiales', tab: 'produccion', filter: 'materiales' },
                        { label: 'Insumos bajo mínimo', value: kpis?.materiales_en_alerta ?? 'Sin datos', detail: 'Revisar existencias en inventario', tab: 'inventario', filter: 'stock' }
                    ].map(item => <button key={item.label} onClick={() => setActiveTab(item.tab, item.filter)} className="text-left p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500 space-y-2">
                        <span className="block text-sm font-semibold">{item.label}</span>
                        <span className="block text-3xl font-bold">{item.value}</span>
                        <span className="block text-xs text-slate-500 dark:text-slate-400">{item.detail}</span>
                        <span className="block text-sm text-blue-600 dark:text-blue-400">Abrir {item.tab === 'pedidos' ? 'pedidos' : item.tab === 'produccion' ? 'producción' : 'inventario'} →</span>
                    </button>)}
                </div>
                {pendientes.some(p => p.dias == null) && <p className="text-sm text-amber-700 dark:text-amber-400">Hay pedidos sin una fecha de entrega válida; no se incluyen en los conteos de vencimientos.</p>}
            </section>

            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition">
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                        <span className="text-xs font-semibold uppercase tracking-wider">OEE Eficiencia Global</span>
                        <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold text-slate-900 dark:text-white">{percent(oee?.global)}</span>
                        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/50 px-1.5 py-0.5 rounded">
                            {oee?.clasificacion?.split(' ')[0] || 'Sin clasificación'}
                        </span>
                    </div>
                    <div className="mt-3 flex justify-between text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-2">
                        <span>Disp: {percent(oee?.disponibilidad)}</span>
                        <span>Rend: {percent(oee?.rendimiento)}</span>
                        <span>Cal: {percent(oee?.calidad)}</span>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition">
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                        <span className="text-xs font-semibold uppercase tracking-wider">Órdenes en Taller</span>
                        <Hammer className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold text-slate-900 dark:text-white">{opsActivas.length}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">en fabricación</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-3 border-t border-slate-100 dark:border-slate-800 pt-2 truncate">
                        {opsActivas[0] ? `${opsActivas[0].codigo_op} en proceso (${opsActivas[0].porcentaje_avance}%)` : 'Sin órdenes activas'}
                    </p>
                </div>

                <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition">
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                        <span className="text-xs font-semibold uppercase tracking-wider">Cartera de Pedidos</span>
                        <ShoppingBag className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold text-slate-900 dark:text-white">{data.pedidos.length}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">pedidos totales</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-3 border-t border-slate-100 dark:border-slate-800 pt-2">
                        Generando flujo de trabajo activo
                    </p>
                </div>

                <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition">
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                        <span className="text-xs font-semibold uppercase tracking-wider">Insumos Críticos</span>
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold text-amber-600 dark:text-amber-400">{kpis?.materiales_en_alerta ?? 'Sin datos'}</span>
                        <span className="text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/50 px-1.5 py-0.5 rounded">
                            Bajo Stock Mínimo
                        </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-3 border-t border-slate-100 dark:border-slate-800 pt-2">
                        {kpis?.materiales_en_alerta == null ? 'Información no disponible' : kpis.materiales_en_alerta > 0 ? 'Revisar necesidades de reposición' : 'Sin alertas de stock'}
                    </p>
                </div>
            </div>

            {/* Two Column Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                            <Hammer className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            Órdenes en taller · primeras 5
                        </h3>
                        <button onClick={() => setActiveTab('produccion')} className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer">
                            Ver Todas →
                        </button>
                    </div>

                    <div className="space-y-3">
                        {opsActivas.length === 0 ? (
                            <div className="text-center py-4 text-sm text-slate-400">No hay órdenes en proceso</div>
                        ) : (
                            opsActivas.slice(0, 5).map((op) => (
                                <div key={op.id} className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-xs text-slate-900 dark:text-white">{op.codigo_op}</span>
                                            <span className="text-[11px] text-slate-500 dark:text-slate-400">({op.cliente_nombre})</span>
                                        </div>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${op.prioridad === 'Urgente' ? 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/50' : 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50'
                                            }`}>
                                            {op.prioridad}
                                        </span>
                                    </div>

                                    <div className="space-y-1">
                                        <div className="flex justify-between text-xs text-slate-600 dark:text-slate-300">
                                            <span>Avance General</span>
                                            <span className="font-bold">{op.porcentaje_avance}%</span>
                                        </div>
                                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                                            <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${op.porcentaje_avance}%` }}></div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                                        <span>Entrega pactada: {op.fecha_entrega_prometida || op.fecha_fin_programada}</span>
                                        <span>Responsable: {op.responsable_nombre}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                            <ShoppingBag className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            Entregas pendientes · primeras 5
                        </h3>
                        <button onClick={() => setActiveTab('pedidos')} className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer">
                            Gestionar Pedidos →
                        </button>
                    </div>

                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {pedidosRecientes.length === 0 ? (
                            <div className="text-center py-4 text-sm text-slate-400">No hay entregas pendientes</div>
                        ) : (
                            pedidosRecientes.map((p) => (
                                <div key={p.id} className="py-2.5 flex flex-wrap gap-3 items-center justify-between text-xs hover:bg-slate-50/50 dark:hover:bg-slate-800/30 px-1 rounded transition">
                                    <div>
                                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                            <span>{p.codigo_pedido}</span>
                                            <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded border ${
                                                p.suministro_insumos === 'Empresa suministra'
                                                    ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                                                    : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                            }`}>
                                                {p.suministro_insumos === 'Empresa suministra' ? 'Insumos Taller' : 'Insumos Cliente'}
                                            </span>
                                        </div>
                                        <div className="text-slate-500 dark:text-slate-400 text-[11px]">{p.cliente_nombre}</div>
                                        <div className="mt-1 font-medium">{p.dias == null ? 'Sin fecha válida' : p.dias < 0 ? `Vencido hace ${-p.dias} días` : p.dias === 0 ? 'Entrega hoy' : `Entrega en ${p.dias} días`} · {p.fecha_entrega_prometida?.slice(0, 10)}</div>
                                    </div>
                                    <div className="text-right">
                                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold mb-1 ${p.estado === 'Entregado' ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50' :
                                                p.estado === 'En Producción' ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                                            }`}>
                                            {p.estado}
                                        </span>
                                        <div className="text-slate-700 dark:text-slate-200 font-bold">S/ {p.total?.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
            {/* Gráficos Gerenciales (OE4) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-4">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                        Estado de Pedidos
                    </h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pedidosPorEstado}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    labelLine={false}
                                >
                                    {pedidosPorEstado.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <RechartsTooltip content={<CustomPieTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-4">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                        Progreso de Órdenes de Producción (OP)
                    </h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={opsActivas} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke={isDark ? '#334155' : '#f1f5f9'} />
                                <XAxis type="number" domain={[0, 100]} stroke={isDark ? '#94a3b8' : '#64748b'} tick={{ fontSize: 11 }} />
                                <YAxis dataKey="codigo_op" type="category" width={80} tick={{ fontSize: 12 }} stroke={isDark ? '#94a3b8' : '#64748b'} />
                                <RechartsTooltip
                                    cursor={{ fill: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' }}
                                    contentStyle={tooltipStyle}
                                    itemStyle={tooltipItemStyle}
                                    labelStyle={tooltipLabelStyle}
                                />
                                <Bar dataKey="porcentaje_avance" fill="#3b82f6" name="Avance %" radius={[0, 4, 4, 0]} barSize={24} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

        </div>
    );
}