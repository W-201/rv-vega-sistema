import React, { useState, useEffect } from 'react';
import { 
  Users, 
  ShoppingBag, 
  Hammer, 
  Boxes, 
  TrendingUp, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowUpRight,
  Bot
} from 'lucide-react';
import { api } from '../services/api';

export default function Dashboard({ setActiveTab }) {
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

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-64 text-slate-500">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const oee = data?.bi?.oee;
  const kpis = data?.bi?.resumen_kpis;
  const pedidosRecientes = (data?.pedidos || []).slice(0, 5);
  const opsActivas = (data?.ops || []).filter(o => o.estado === 'En Proceso' || o.estado === 'Planificada');

  return (
    <div className="p-8 space-y-6">
      {/* Top Banner IA */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-amber-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-amber-300">Asistente Inteligente RV Vega</span>
          </div>
          <h2 className="text-lg font-bold">Optimización de Eficiencia Productiva</h2>
          <p className="text-xs text-blue-200 max-w-xl">
            Monitoreo activo de 5 pedidos, 3 órdenes de taller y alertas de stock de insumos críticos. La tasa de entregas OTIF se sitúa en 91.4%.
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
        {/* Card 1: OEE */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">OEE Eficiencia Global</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{oee?.global || 83.6}%</span>
            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
              {oee?.clasificacion?.split(' ')[0] || 'Aceptable'}
            </span>
          </div>
          <div className="mt-3 flex justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2">
            <span>Disp: {oee?.disponibilidad}%</span>
            <span>Rend: {oee?.rendimiento}%</span>
            <span>Cal: {oee?.calidad}%</span>
          </div>
        </div>

        {/* Card 2: Órdenes en Proceso */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Órdenes en Taller</span>
            <Hammer className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{kpis?.ops_activas || 1}</span>
            <span className="text-xs text-slate-500">en fabricación</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-3 border-t border-slate-100 pt-2">
            OP-2026-003 en fase de Tratamiento y Pintura (70%)
          </p>
        </div>

        {/* Card 3: Total Pedidos */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Cartera de Pedidos</span>
            <ShoppingBag className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{kpis?.total_pedidos || 5}</span>
            <span className="text-xs text-slate-500">pedidos totales</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-3 border-t border-slate-100 pt-2">
            2 entregados, 1 en producción, 2 en cola
          </p>
        </div>

        {/* Card 4: Alertas de Insumos */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Insumos Críticos</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-600">{kpis?.materiales_en_alerta || 2}</span>
            <span className="text-xs font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
              Bajo Stock Mínimo
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-3 border-t border-slate-100 pt-2">
            Alambre MIG y Esmalte Poliuretano
          </p>
        </div>
      </div>

      {/* Two Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Órdenes de Producción en Curso */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Hammer className="w-4 h-4 text-blue-600" />
              Órdenes de Producción en Taller
            </h3>
            <button
              onClick={() => setActiveTab('produccion')}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
            >
              Ver Todas →
            </button>
          </div>

          <div className="space-y-3">
            {opsActivas.map((op) => (
              <div key={op.id} className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900">{op.codigo_op}</span>
                    <span className="text-[11px] text-slate-500">({op.cliente_nombre})</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    op.prioridad === 'Urgente' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {op.prioridad}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>Avance General</span>
                    <span className="font-bold">{op.porcentaje_avance}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${op.porcentaje_avance}%` }}
                    ></div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                  <span>Entrega pactada: {op.fecha_entrega_prometida || op.fecha_fin_programada}</span>
                  <span>Responsable: {op.responsable_nombre}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Últimos Pedidos Registrados */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-indigo-600" />
              Pedidos Recientes
            </h3>
            <button
              onClick={() => setActiveTab('pedidos')}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
            >
              Gestionar Pedidos →
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {pedidosRecientes.map((p) => (
              <div key={p.id} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-slate-900">{p.codigo_pedido}</div>
                  <div className="text-slate-500 text-[11px]">{p.cliente_nombre}</div>
                </div>
                <div className="text-right">
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold mb-1 ${
                    p.estado === 'Entregado'
                      ? 'bg-emerald-100 text-emerald-700'
                      : p.estado === 'En Producción'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-slate-100 text-slate-700'
                  }`}>
                    {p.estado}
                  </span>
                  <div className="text-slate-700 font-bold">S/ {p.total?.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
