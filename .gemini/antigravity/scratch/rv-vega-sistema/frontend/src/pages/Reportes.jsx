import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, Printer, Download, CheckCircle2, TrendingUp, Users, DollarSign } from 'lucide-react';
import { api } from '../services/api';

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
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReportes();
  }, [tipoReporte]);

  const handlePrint = () => {
    window.print();
  };

  const exportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    if (tipoReporte === 'otif' && dataOtif) {
      csvContent += 'Codigo Pedido,Cliente,Fecha Pactada,Fecha Real,Dias Desviacion,Cumple OTIF,Total (S/)\n';
      dataOtif.pedidos.forEach(p => {
        csvContent += `"${p.codigo_pedido}","${p.cliente}","${p.fecha_pactada}","${p.fecha_real}",${p.dias_desviacion},"${p.cumple_otif ? 'SI' : 'NO'}",${p.total}\n`;
      });
    } else if (tipoReporte === 'costos' && dataCostos) {
      csvContent += 'Codigo OP,Codigo Pedido,Cliente,Venta Subtotal,Costo Real,Margen Bruto,Porcentaje Margen\n';
      dataCostos.ordenes.forEach(o => {
        csvContent += `"${o.codigo_op}","${o.codigo_pedido}","${o.cliente}",${o.venta_subtotal},${o.costo_real},${o.margen_bruto},${o.porcentaje_margen}%\n`;
      });
    } else if (tipoReporte === 'operarios') {
      csvContent += 'Operario,Etapas Asignadas,Etapas Finalizadas,Horas Estimadas,Horas Reales,Eficiencia\n';
      dataOperarios.forEach(op => {
        csvContent += `"${op.operario}",${op.etapas_asignadas},${op.etapas_finalizadas},${op.horas_estimadas},${op.horas_reales},${op.eficiencia_porcentaje}%\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `reporte_${tipoReporte}_rv_vega_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-8 space-y-6">
      {/* Printable Report Header */}
      <div className="print-only hidden border-b-2 border-slate-900 pb-4 mb-6">
        <h1 className="text-xl font-bold">RV VEGA SERVICIOS GENERALES E.I.R.L.</h1>
        <p className="text-xs text-slate-500">RUC: 20601284751 | Sistema de Gestión de la Producción y Pedidos</p>
        <p className="text-xs font-semibold mt-1">Reporte Oficial Emitido: {new Date().toLocaleDateString('es-PE')}</p>
      </div>

      {/* Selector & Actions */}
      <div className="no-print flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTipoReporte('otif')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              tipoReporte === 'otif' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Cumplimiento OTIF</span>
          </button>
          <button
            onClick={() => setTipoReporte('costos')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              tipoReporte === 'costos' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Costos y Márgenes</span>
          </button>
          <button
            onClick={() => setTipoReporte('operarios')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              tipoReporte === 'operarios' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Productividad Operarios</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-slate-300 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar CSV / Excel</span>
          </button>
          <button
            onClick={handlePrint}
            className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir Reporte PDF</span>
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
                    <tr key={p.id}>
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
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          p.cumple_otif ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
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
                    <tr key={o.codigo_op}>
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
                  <th className="px-5 py-3">Horas Estándar</th>
                  <th className="px-5 py-3">Horas Reales</th>
                  <th className="px-5 py-3 text-right">Eficiencia (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dataOperarios.map(op => (
                  <tr key={op.operario}>
                    <td className="px-5 py-3 font-bold text-slate-900">{op.operario}</td>
                    <td className="px-5 py-3">{op.etapas_asignadas} fases</td>
                    <td className="px-5 py-3 font-semibold text-emerald-700">{op.etapas_finalizadas} fases</td>
                    <td className="px-5 py-3">{op.horas_estimadas} h</td>
                    <td className="px-5 py-3">{op.horas_reales} h</td>
                    <td className="px-5 py-3 text-right font-extrabold text-blue-700">
                      <span className={`px-2 py-0.5 rounded ${
                        op.eficiencia_porcentaje >= 95 ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
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
