import React, { useState, useEffect } from 'react';
import {
    FileSpreadsheet, CheckCircle2, Users, DollarSign, FileText,
    BarChart3, PieChart as PieChartIcon, TrendingUp, AlertTriangle, Clock
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
    Legend, ResponsiveContainer, PieChart, Pie, Cell, ReferenceLine
} from 'recharts';
import { api } from '../services/api';
// Librerías de exportación
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function Reportes() {
    const [tipoReporte, setTipoReporte] = useState('otif'); // 'otif' | 'costos' | 'operarios'
    const [dataOtif, setDataOtif] = useState(null);
    const [dataCostos, setDataCostos] = useState(null);
    const [dataOperarios, setDataOperarios] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadReportes = async () => {
        try {
            setLoading(true);
            if (tipoReporte === 'otif') {
                const res = await api.get('/reportes/otif');
                setDataOtif(res);
            } else if (tipoReporte === 'costos') {
                const res = await api.get('/reportes/costos');
                setDataCostos(res);
            } else if (tipoReporte === 'operarios') {
                const res = await api.get('/reportes/operarios');
                setDataOperarios(res);
            }
        } catch (err) {
            console.error('Error al cargar reportes:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadReportes();
    }, [tipoReporte]);

    // --- FUNCIÓN EXCEL FUNCIONAL ---
    const exportExcel = () => {
        let data = [];
        let sheetName = "";

        if (tipoReporte === 'otif' && dataOtif?.pedidos) {
            data = dataOtif.pedidos.map(p => ({
                'Código Pedido': p.codigo_pedido,
                'Cliente': p.cliente,
                'Fecha Pactada': p.fecha_pactada,
                'Fecha Real': p.fecha_real,
                'Desviación (Días)': p.dias_desviacion,
                'Cumple OTIF': p.cumple_otif ? 'SÍ' : 'NO',
                'Total (S/)': p.total
            }));
            sheetName = "Reporte_OTIF";
        } else if (tipoReporte === 'costos' && dataCostos?.ordenes) {
            data = dataCostos.ordenes.map(o => ({
                'Código OP': o.codigo_op,
                'Código Pedido': o.codigo_pedido,
                'Cliente': o.cliente,
                'Venta Subtotal (S/)': o.venta_subtotal,
                'Costo Real (S/)': o.costo_real,
                'Margen Bruto (S/)': o.margen_bruto,
                'Margen (%)': `${o.porcentaje_margen}%`
            }));
            sheetName = "Reporte_Costos";
        } else if (tipoReporte === 'operarios' && dataOperarios.length > 0) {
            data = dataOperarios.map(op => ({
                'Operario': op.operario,
                'Fases Asignadas': op.etapas_asignadas,
                'Fases Finalizadas': op.etapas_finalizadas,
                'Horas Estimadas': op.horas_estimadas,
                'Horas Reales': op.horas_reales,
                'Eficiencia (%)': `${op.eficiencia_porcentaje}%`
            }));
            sheetName = "Reporte_Operarios";
        }

        if (data.length === 0) {
            alert('No hay datos disponibles para exportar.');
            return;
        }

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
        XLSX.writeFile(wb, `Reporte_${tipoReporte.toUpperCase()}_RV_Vega_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    // --- FUNCIÓN PDF FUNCIONAL ---
    const exportPDF = () => {
        try {
            const doc = new jsPDF();
            const fechaEmision = new Date().toLocaleDateString('es-PE');

            // Membrete RV Vega
            doc.setFontSize(15);
            doc.setTextColor(30, 58, 138); // Azul corporativo
            doc.text('RV VEGA SERVICIOS GENERALES E.I.R.L.', 14, 18);

            doc.setFontSize(9);
            doc.setTextColor(100, 100, 100);
            doc.text('RUC: 20601284751 | Sistema de Gestión de Producción y Pedidos', 14, 24);

            doc.setFontSize(11);
            doc.setTextColor(0, 0, 0);
            doc.text(`Reporte Oficial: ${tipoReporte.toUpperCase()}`, 14, 34);
            doc.setFontSize(9);
            doc.text(`Fecha de Emisión: ${fechaEmision}`, 14, 40);

            let head = [];
            let body = [];

            if (tipoReporte === 'otif' && dataOtif?.pedidos) {
                head = [["Pedido", "Cliente", "Fecha Pactada", "Fecha Real", "Desv. (Días)", "OTIF", "Total"]];
                body = dataOtif.pedidos.map(p => [
                    p.codigo_pedido, p.cliente, p.fecha_pactada, p.fecha_real, p.dias_desviacion,
                    p.cumple_otif ? 'A TIEMPO' : 'RETRASO', `S/ ${p.total}`
                ]);
            } else if (tipoReporte === 'costos' && dataCostos?.ordenes) {
                head = [["OP", "Pedido", "Cliente", "Venta (S/)", "Costo Real", "Margen Bruto", "Margen %"]];
                body = dataCostos.ordenes.map(o => [
                    o.codigo_op, o.codigo_pedido, o.cliente, `S/ ${o.venta_subtotal}`,
                    `S/ ${o.costo_real}`, `S/ ${o.margen_bruto}`, `${o.porcentaje_margen}%`
                ]);
            } else if (tipoReporte === 'operarios' && dataOperarios.length > 0) {
                head = [["Operario", "Fases Asig.", "Fases Fin.", "Horas Est.", "Horas Reales", "Eficiencia"]];
                body = dataOperarios.map(op => [
                    op.operario, op.etapas_asignadas, op.etapas_finalizadas,
                    op.horas_estimadas, op.horas_reales, `${op.eficiencia_porcentaje}%`
                ]);
            }

            if (body.length === 0) {
                alert('No hay datos suficientes para generar el PDF.');
                return;
            }

            autoTable(doc, {
                startY: 46,
                head: head,
                body: body,
                theme: 'grid',
                headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                styles: { fontSize: 8, cellPadding: 3 }
            });

            doc.save(`Reporte_${tipoReporte.toUpperCase()}_RV_Vega_${new Date().toISOString().split('T')[0]}.pdf`);
        } catch (err) {
            console.error("Error al generar PDF:", err);
            alert("Hubo un error al generar el archivo PDF.");
        }
    };

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center h-64 text-slate-500 text-xs font-semibold">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    // Datos procesados para gráficos de OTIF
    const otifPieData = dataOtif?.resumen ? [
        { name: 'A Tiempo', value: dataOtif.resumen.a_tiempo, color: '#10b981' },
        { name: 'Con Retraso', value: dataOtif.resumen.con_retraso, color: '#ef4444' }
    ].filter(d => d.value > 0) : [];

    const otifDeviationData = dataOtif?.pedidos ? dataOtif.pedidos.map(p => ({
        codigo: p.codigo_pedido,
        cliente: p.cliente,
        dias: p.dias_desviacion,
        color: p.dias_desviacion <= 0 ? '#10b981' : '#ef4444'
    })) : [];

    // Datos procesados para gráficos de Costos
    const costosChartData = dataCostos?.ordenes ? dataCostos.ordenes.map(o => ({
        op: o.codigo_op,
        cliente: o.cliente,
        venta: o.venta_subtotal,
        costo: o.costo_real,
        margen: o.margen_bruto,
        porcentaje: o.porcentaje_margen
    })) : [];

    // Datos procesados para gráficos de Operarios
    const operariosHorasData = dataOperarios.map(op => ({
        operario: op.operario.split(' ')[0],
        nombreCompleto: op.operario,
        estimadas: op.horas_estimadas,
        reales: op.horas_reales
    }));

    const operariosEficienciaData = dataOperarios.map(op => ({
        operario: op.operario.split(' ')[0],
        nombreCompleto: op.operario,
        eficiencia: op.eficiencia_porcentaje,
        color: op.eficiencia_porcentaje >= 95 ? '#10b981' : '#3b82f6'
    }));

    const totalHorasReales = dataOperarios.reduce((acc, curr) => acc + curr.horas_reales, 0);
    const promEficiencia = dataOperarios.length > 0
        ? Math.round(dataOperarios.reduce((acc, curr) => acc + curr.eficiencia_porcentaje, 0) / dataOperarios.length)
        : 100;

    return (
        <div className="p-8 space-y-6">
            {/* Selector & Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setTipoReporte('otif')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${tipoReporte === 'otif' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                    >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Cumplimiento OTIF</span>
                    </button>
                    <button
                        onClick={() => setTipoReporte('costos')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${tipoReporte === 'costos' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                    >
                        <DollarSign className="w-3.5 h-3.5" />
                        <span>Costos y Márgenes</span>
                    </button>
                    <button
                        onClick={() => setTipoReporte('operarios')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${tipoReporte === 'operarios' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                    >
                        <Users className="w-3.5 h-3.5" />
                        <span>Productividad Operarios</span>
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={exportExcel}
                        className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                    >
                        <FileSpreadsheet className="w-4 h-4" />
                        <span>Exportar Excel</span>
                    </button>
                    <button
                        onClick={exportPDF}
                        className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                    >
                        <FileText className="w-4 h-4" />
                        <span>Descargar PDF</span>
                    </button>
                </div>
            </div>

            {/* ========================================================================= */}
            {/* REPORTE 1: CUMPLIMIENTO OTIF (KPIs + DASHBOARD DE GRÁFICOS + TABLA) */}
            {/* ========================================================================= */}
            {tipoReporte === 'otif' && dataOtif && (
                <div className="space-y-6">
                    {/* Tarjetas KPI */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <span className="text-xs text-slate-500 font-semibold uppercase">Índice OTIF Global</span>
                            <div className="text-2xl font-extrabold text-blue-700 mt-1">{dataOtif.resumen.porcentaje_otif}%</div>
                            <span className="text-[11px] text-slate-500">{dataOtif.resumen.estado_meta}</span>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <span className="text-xs text-slate-500 font-semibold uppercase">Entregados a Tiempo</span>
                            <div className="text-2xl font-extrabold text-emerald-600 mt-1">{dataOtif.resumen.a_tiempo} pedidos</div>
                            <span className="text-[11px] text-slate-500">Sin demoras pactadas</span>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <span className="text-xs text-slate-500 font-semibold uppercase">Entregas con Retraso</span>
                            <div className="text-2xl font-extrabold text-red-600 mt-1">{dataOtif.resumen.con_retraso} pedidos</div>
                            <span className="text-[11px] text-slate-500">Requieren plan de contingencia</span>
                        </div>
                    </div>

                    {/* Dashboard de Gráficos Vinculados a API (Requerimiento 3.6.2) */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Gráfico 1: Proporción OTIF */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
                            <div className="border-b border-slate-100 pb-2">
                                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                                    <PieChartIcon className="w-4 h-4 text-blue-600" />
                                    Tasa de Cumplimiento de Entregas (OTIF)
                                </h3>
                                <p className="text-[11px] text-slate-500">Distribución de pedidos a tiempo vs pedidos con demora</p>
                            </div>
                            <div className="h-64 w-full flex items-center justify-center">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={otifPieData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={55}
                                            outerRadius={80}
                                            paddingAngle={4}
                                            dataKey="value"
                                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                            labelLine={false}
                                        >
                                            {otifPieData.map((entry, index) => (
                                                <Cell key={`otif-cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Gráfico 2: Desviación en días por Pedido */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
                            <div className="border-b border-slate-100 pb-2">
                                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                                    <BarChart3 className="w-4 h-4 text-blue-600" />
                                    Desviación de Entrega por Pedido (Días)
                                </h3>
                                <p className="text-[11px] text-slate-500">Días respecto a la fecha pactada (Verde: a tiempo | Rojo: retraso)</p>
                            </div>
                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={otifDeviationData} margin={{ top: 10, right: 20, left: -10, bottom: 10 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis dataKey="codigo" tick={{ fontSize: 10 }} />
                                        <YAxis tick={{ fontSize: 10 }} />
                                        <RechartsTooltip formatter={(val) => [`${val} días`, 'Desviación']} />
                                        <ReferenceLine y={0} stroke="#64748b" strokeDasharray="3 3" />
                                        <Bar dataKey="dias" name="Días de Desviación" radius={[4, 4, 0, 0]}>
                                            {otifDeviationData.map((entry, idx) => (
                                                <Cell key={`bar-${idx}`} fill={entry.color} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Tabla de Datos */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs text-slate-600">
                                <thead className="bg-slate-50 text-slate-700 uppercase font-semibold border-b border-slate-200">
                                    <tr>
                                        <th className="px-5 py-3">Pedido</th>
                                        <th className="px-5 py-3">Cliente</th>
                                        <th className="px-5 py-3">Fecha Pactada</th>
                                        <th className="px-5 py-3">Fecha Entrega Real</th>
                                        <th className="px-5 py-3">Desviación (Días)</th>
                                        <th className="px-5 py-3">Cumplió OTIF</th>
                                        <th className="px-5 py-3 text-right">Monto (S/)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {dataOtif.pedidos.map(p => (
                                        <tr key={p.id} className="hover:bg-slate-50/50">
                                            <td className="px-5 py-3 font-mono font-bold text-blue-700">{p.codigo_pedido}</td>
                                            <td className="px-5 py-3 font-semibold text-slate-900">{p.cliente}</td>
                                            <td className="px-5 py-3">{p.fecha_pactada}</td>
                                            <td className="px-5 py-3">{p.fecha_real}</td>
                                            <td className="px-5 py-3 font-bold">
                                                <span className={p.dias_desviacion > 0 ? 'text-red-600' : 'text-emerald-600'}>
                                                    {p.dias_desviacion > 0 ? `+${p.dias_desviacion} d` : `${p.dias_desviacion} d`}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${p.cumple_otif ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                                                    }`}>
                                                    {p.cumple_otif ? 'A TIEMPO' : 'RETRASO'}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3 text-right font-bold text-slate-900">
                                                S/ {Number(p.total).toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* REPORTE 2: COSTOS Y MÁRGENES (KPIs + DASHBOARD DE GRÁFICOS + TABLA) */}
            {/* ========================================================================= */}
            {tipoReporte === 'costos' && dataCostos && (
                <div className="space-y-6">
                    {/* Tarjetas KPI */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <span className="text-xs text-slate-500 font-semibold uppercase">Total Facturado</span>
                            <div className="text-2xl font-extrabold text-slate-900 mt-1">S/ {dataCostos.resumen.total_venta.toLocaleString()}</div>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <span className="text-xs text-slate-500 font-semibold uppercase">Costo de Producción</span>
                            <div className="text-2xl font-extrabold text-blue-700 mt-1">S/ {dataCostos.resumen.total_costo_produccion.toLocaleString()}</div>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <span className="text-xs text-slate-500 font-semibold uppercase">Margen Bruto Global</span>
                            <div className="text-2xl font-extrabold text-emerald-600 mt-1">
                                S/ {dataCostos.resumen.margen_global.toLocaleString()} ({dataCostos.resumen.margen_porcentaje_promedio}%)
                            </div>
                        </div>
                    </div>

                    {/* Dashboard de Gráficos de Costos (Requerimiento 3.6.2) */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Gráfico 1: Comparativa Venta vs Costo vs Margen por OP */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
                            <div className="border-b border-slate-100 pb-2">
                                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                                    <BarChart3 className="w-4 h-4 text-blue-600" />
                                    Desglose Financiero por Orden de Producción (S/)
                                </h3>
                                <p className="text-[11px] text-slate-500">Comparativa directa de Ventas, Costos y Margen Bruto</p>
                            </div>
                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={costosChartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis dataKey="op" tick={{ fontSize: 10 }} />
                                        <YAxis tick={{ fontSize: 10 }} />
                                        <RechartsTooltip formatter={(val) => [`S/ ${Number(val).toLocaleString()}`]} />
                                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                                        <Bar dataKey="venta" name="Venta (S/)" fill="#2563eb" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="costo" name="Costo Real (S/)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="margen" name="Margen Bruto (S/)" fill="#10b981" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Gráfico 2: Margen Porcentual (%) por OP */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
                            <div className="border-b border-slate-100 pb-2">
                                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                                    Margen Porcentual (%) por OP
                                </h3>
                                <p className="text-[11px] text-slate-500">Rentabilidad operativa frente al umbral industrial estándar (30%)</p>
                            </div>
                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={costosChartData} margin={{ top: 10, right: 20, left: -10, bottom: 10 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis dataKey="op" tick={{ fontSize: 10 }} />
                                        <YAxis unit="%" tick={{ fontSize: 10 }} />
                                        <RechartsTooltip formatter={(val) => [`${val}%`, 'Margen']} />
                                        <ReferenceLine y={30} label={{ value: 'Meta (30%)', fill: '#10b981', fontSize: 10 }} stroke="#10b981" strokeDasharray="3 3" />
                                        <Bar dataKey="porcentaje" name="Margen %" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Tabla de Datos */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs text-slate-600">
                                <thead className="bg-slate-50 text-slate-700 uppercase font-semibold border-b border-slate-200">
                                    <tr>
                                        <th className="px-5 py-3">OP</th>
                                        <th className="px-5 py-3">Pedido / Cliente</th>
                                        <th className="px-5 py-3">Venta (S/)</th>
                                        <th className="px-5 py-3">Costo Real (S/)</th>
                                        <th className="px-5 py-3">Margen Bruto (S/)</th>
                                        <th className="px-5 py-3 text-right">Margen (%)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {dataCostos.ordenes.map(o => (
                                        <tr key={o.codigo_op} className="hover:bg-slate-50/50">
                                            <td className="px-5 py-3 font-mono font-bold text-blue-700">{o.codigo_op}</td>
                                            <td className="px-5 py-3">
                                                <div className="font-semibold text-slate-900">{o.cliente}</div>
                                                <div className="text-[11px] text-slate-400">{o.codigo_pedido}</div>
                                            </td>
                                            <td className="px-5 py-3 font-bold text-slate-800">S/ {Number(o.venta_subtotal).toFixed(2)}</td>
                                            <td className="px-5 py-3 text-slate-700">S/ {Number(o.costo_real).toFixed(2)}</td>
                                            <td className="px-5 py-3 font-bold text-emerald-600">S/ {Number(o.margen_bruto).toFixed(2)}</td>
                                            <td className="px-5 py-3 text-right font-bold text-slate-900">{o.porcentaje_margen}%</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* REPORTE 3: PRODUCTIVIDAD OPERARIOS (KPIs + DASHBOARD DE GRÁFICOS + TABLA) */}
            {/* ========================================================================= */}
            {tipoReporte === 'operarios' && (
                <div className="space-y-6">
                    {/* Tarjetas KPI de Productividad */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <span className="text-xs text-slate-500 font-semibold uppercase">Personal en Taller</span>
                            <div className="text-2xl font-extrabold text-blue-700 mt-1">{dataOperarios.length} operarios</div>
                            <span className="text-[11px] text-slate-500">Técnicos calificados evaluados</span>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <span className="text-xs text-slate-500 font-semibold uppercase">Eficiencia Promedio</span>
                            <div className="text-2xl font-extrabold text-emerald-600 mt-1">{promEficiencia}%</div>
                            <span className="text-[11px] text-slate-500">Horas estándar vs horas reales</span>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <span className="text-xs text-slate-500 font-semibold uppercase">Horas Invertidas</span>
                            <div className="text-2xl font-extrabold text-slate-900 mt-1">{totalHorasReales} h</div>
                            <span className="text-[11px] text-slate-500">Tiempo de trabajo registrado</span>
                        </div>
                    </div>

                    {/* Dashboard de Gráficos de Productividad (Requerimiento 3.6.2) */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Gráfico 1: Horas Estimadas vs Reales */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
                            <div className="border-b border-slate-100 pb-2">
                                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                                    <Clock className="w-4 h-4 text-blue-600" />
                                    Horas Estimadas vs Horas Reales por Operario
                                </h3>
                                <p className="text-[11px] text-slate-500">Comparativa de tiempos de ciclo estándar vs dedicación real</p>
                            </div>
                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={operariosHorasData} margin={{ top: 10, right: 20, left: -10, bottom: 10 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis dataKey="operario" tick={{ fontSize: 10 }} />
                                        <YAxis tick={{ fontSize: 10 }} />
                                        <RechartsTooltip formatter={(val, name, item) => [`${val} horas`, name, item.payload.nombreCompleto]} />
                                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                                        <Bar dataKey="estimadas" name="Horas Estimadas" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="reales" name="Horas Reales" fill="#2563eb" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Gráfico 2: Eficiencia Porcentual por Operario */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
                            <div className="border-b border-slate-100 pb-2">
                                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                                    Índice de Eficiencia (%) por Operario
                                </h3>
                                <p className="text-[11px] text-slate-500">Línea de rendimiento estándar industrial (100%)</p>
                            </div>
                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={operariosEficienciaData} margin={{ top: 10, right: 20, left: -10, bottom: 10 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis dataKey="operario" tick={{ fontSize: 10 }} />
                                        <YAxis unit="%" tick={{ fontSize: 10 }} />
                                        <RechartsTooltip formatter={(val, name, item) => [`${val}%`, 'Eficiencia', item.payload.nombreCompleto]} />
                                        <ReferenceLine y={100} label={{ value: 'Meta (100%)', fill: '#10b981', fontSize: 10 }} stroke="#10b981" strokeDasharray="3 3" />
                                        <Bar dataKey="eficiencia" name="Eficiencia %" radius={[4, 4, 0, 0]}>
                                            {operariosEficienciaData.map((entry, idx) => (
                                                <Cell key={`eff-${idx}`} fill={entry.color} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Tabla de Datos */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs text-slate-600">
                                <thead className="bg-slate-50 text-slate-700 uppercase font-semibold border-b border-slate-200">
                                    <tr>
                                        <th className="px-5 py-3">Operario / Técnico</th>
                                        <th className="px-5 py-3">Fases Asignadas</th>
                                        <th className="px-5 py-3">Fases Finalizadas</th>
                                        <th className="px-5 py-3">Horas Estándar</th>
                                        <th className="px-5 py-3">Horas Reales</th>
                                        <th className="px-5 py-3 text-right">Eficiencia (%)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {dataOperarios.map(op => (
                                        <tr key={op.operario} className="hover:bg-slate-50/50">
                                            <td className="px-5 py-3 font-bold text-slate-900">{op.operario}</td>
                                            <td className="px-5 py-3">{op.etapas_asignadas} fases</td>
                                            <td className="px-5 py-3 font-semibold text-emerald-700">{op.etapas_finalizadas} fases</td>
                                            <td className="px-5 py-3">{op.horas_estimadas} h</td>
                                            <td className="px-5 py-3">{op.horas_reales} h</td>
                                            <td className="px-5 py-3 text-right font-extrabold text-blue-700">
                                                <span className={`px-2 py-0.5 rounded ${op.eficiencia_porcentaje >= 95 ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                                                    }`}>
                                                    {op.eficiencia_porcentaje}%
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}