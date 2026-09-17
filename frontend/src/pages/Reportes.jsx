import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, CheckCircle2, Users, DollarSign, FileText } from 'lucide-react';
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

    // --- FUNCIÓN PDF FUNCIONAL Y CORREGIDA ---
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

            // Llamado correcto con la función autoTable importada
            autoTable(doc, {
                startY: 46,
                head: head,
                body: body,
                theme: 'grid',
                headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                styles: { fontSize: 8, cellPadding: 3 }
            });

            // Descargar archivo
            doc.save(`Reporte_${tipoReporte.toUpperCase()}_RV_Vega_${new Date().toISOString().split('T')[0]}.pdf`);
        } catch (err) {
            console.error("Error al generar PDF:", err);
            alert("Hubo un error al generar el archivo PDF. Revisa la consola para más detalles.");
        }
    };

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center h-64 text-slate-500 text-xs font-semibold">
                Cargando reportes gerenciales...
            </div>
        );
    }

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

            {/* Reporte 1: OTIF */}
            {tipoReporte === 'otif' && dataOtif && (
                <div className="space-y-4">
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

            {/* Reporte 2: Costos */}
            {tipoReporte === 'costos' && dataCostos && (
                <div className="space-y-4">
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

            {/* Reporte 3: Operarios */}
            {tipoReporte === 'operarios' && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-slate-600">
                            <thead className="bg-slate-50 text-slate-700 uppercase font-semibold border-b border-slate-200">
                                <tr>
                                    <th className="px-5 py-3">Operario / Técnico</th>
                                    <th className="px-5 py-3">Fases Asignadas</th>
                                    <th className="px-5 py-3">Fases Finalizadas</th>
                                    <th className="px-5 py-3">Horas Estándار</th>
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
            )}
        </div>
    );
}