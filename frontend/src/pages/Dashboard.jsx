import React, { useState, useEffect } from 'react';
import {
    Users, ShoppingBag, Hammer, Boxes, TrendingUp, Clock, AlertTriangle,
    ArrowUpRight, Bot, Download, FileText, FileSpreadsheet
} from 'lucide-react';
import { api } from '../services/api';
import { useTheme } from '../context/ThemeContext';
// Librerías para Gráficos (OE4)
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
// Librerías para Exportación (OE4)
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function Dashboard({ setActiveTab }) {
    const { isDark } = useTheme();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            try {
                const bi = await api.get('/bi/dashboard');
                const pedidos = await api.get('/pedidos');
                const ops = await api.get('/produccion');
                setData({ bi, pedidos, ops });
            } catch (err) {
                console.error('Error cargando datos del dashboard:', err);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, []);

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
        doc.text(`OEE Global: ${data.bi?.oee?.global || 83.6}%`, 14, 34);

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
            <div className="p-8 flex items-center justify-center h-64 text-slate-500 dark:text-slate-400">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    const oee = data?.bi?.oee;
    const kpis = data?.bi?.resumen_kpis;
    const pedidosRecientes = (data?.pedidos || []).slice(0, 5);
    const opsActivas = (data?.ops || []).filter(o => o.estado === 'En Proceso' || o.estado === 'Planificada');

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
        <div className="p-8 space-y-6">

            {/* Top Header con Botones de Exportación (OE4) */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard Gerencial</h1>

                <div className="flex items-center gap-2">
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

            {/* Top Banner IA */}
            <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 dark:from-blue-950 dark:via-indigo-950 dark:to-slate-900 rounded-2xl p-6 text-white shadow-lg dark:shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-blue-500/30 dark:border-blue-800/40 transition-colors">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <Bot className="w-5 h-5 text-amber-400" />
                        <span className="text-xs font-bold uppercase tracking-wider text-amber-300">Asistente Inteligente RV Vega</span>
                    </div>
                    <h2 className="text-lg font-bold">Optimización de Eficiencia Productiva</h2>
                    <p className="text-xs text-blue-200 max-w-xl">
                        Monitoreo activo de {kpis?.total_pedidos || 5} pedidos, {kpis?.ops_activas || 3} órdenes de taller y alertas de stock de insumos críticos. La tasa de entregas OTIF se sitúa en 91.4%.
                    </p>
                </div>
                <button
                    onClick={() => setActiveTab('ai')}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition shadow-md shadow-amber-500/20 flex items-center gap-1 self-start md:self-auto cursor-pointer"
                >
                    <span>Abrir Copiloto IA</span>
                    <ArrowUpRight className="w-4 h-4" />
                </button>
            </div>

            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition">
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                        <span className="text-xs font-semibold uppercase tracking-wider">OEE Eficiencia Global</span>
                        <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold text-slate-900 dark:text-white">{oee?.global || 83.6}%</span>
                        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/50 px-1.5 py-0.5 rounded">
                            {oee?.clasificacion?.split(' ')[0] || 'Aceptable'}
                        </span>
                    </div>
                    <div className="mt-3 flex justify-between text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-2">
                        <span>Disp: {oee?.disponibilidad || 85}%</span>
                        <span>Rend: {oee?.rendimiento || 90}%</span>
                        <span>Cal: {oee?.calidad || 98}%</span>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition">
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                        <span className="text-xs font-semibold uppercase tracking-wider">Órdenes en Taller</span>
                        <Hammer className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold text-slate-900 dark:text-white">{opsActivas.length || kpis?.ops_activas || 0}</span>
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
                        <span className="text-3xl font-extrabold text-slate-900 dark:text-white">{data?.pedidos?.length || kpis?.total_pedidos || 0}</span>
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
                        <span className="text-3xl font-extrabold text-amber-600 dark:text-amber-400">{kpis?.materiales_en_alerta || 2}</span>
                        <span className="text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/50 px-1.5 py-0.5 rounded">
                            Bajo Stock Mínimo
                        </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-3 border-t border-slate-100 dark:border-slate-800 pt-2">
                        Requiere reabastecimiento urgente
                    </p>
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

            {/* Two Column Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                            <Hammer className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            Órdenes de Producción en Taller
                        </h3>
                        <button onClick={() => setActiveTab('produccion')} className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer">
                            Ver Todas →
                        </button>
                    </div>

                    <div className="space-y-3">
                        {opsActivas.length === 0 ? (
                            <div className="text-center py-4 text-sm text-slate-400">No hay órdenes en proceso</div>
                        ) : (
                            opsActivas.map((op) => (
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
                            Pedidos Recientes
                        </h3>
                        <button onClick={() => setActiveTab('pedidos')} className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer">
                            Gestionar Pedidos →
                        </button>
                    </div>

                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {pedidosRecientes.length === 0 ? (
                            <div className="text-center py-4 text-sm text-slate-400">No hay pedidos registrados</div>
                        ) : (
                            pedidosRecientes.map((p) => (
                                <div key={p.id} className="py-2.5 flex items-center justify-between text-xs hover:bg-slate-50/50 dark:hover:bg-slate-800/30 px-1 rounded transition">
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
        </div>
    );
}