import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import { LineChart as ChartIcon, Activity, TrendingUp, AlertOctagon, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { useTheme } from '../context/ThemeContext';

const COLORS = ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#f59e0b'];

export default function BusinessIntelligence() {
  const { isDark } = useTheme();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadBI() {
      try {
        setLoading(true);
        const res = await api.get('/bi/dashboard');
        setData(res);
      } catch (err) {
        console.error('Error cargando BI:', err);
      } finally {
        setLoading(false);
      }
    }
    loadBI();
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-64 text-slate-500 dark:text-slate-400">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const oee = data?.oee;
  const cuellos = data?.cuellos_botella || [];
  const ventas = data?.ventas_mensuales || [];
  const paradas = data?.paradas_produccion || [];

  const tooltipStyle = {
    backgroundColor: isDark ? '#0f172a' : '#ffffff',
    borderColor: isDark ? '#334155' : '#e2e8f0',
    color: isDark ? '#f8fafc' : '#0f172a',
    borderRadius: '8px',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.4)',
    fontSize: '12px'
  };

  const gridStroke = isDark ? '#334155' : '#f1f5f9';
  const axisColor = isDark ? '#94a3b8' : '#64748b';

  return (
    <div className="p-8 space-y-6">
      {/* OEE Highlight Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4 transition">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">OEE - Eficiencia General del Proceso Productivo</h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Cálculo industrial estándar basado en Disponibilidad x Rendimiento x Calidad
            </p>
          </div>
          <div className="text-right">
            <span className="text-3xl font-extrabold text-blue-700 dark:text-blue-400">{oee?.global}%</span>
            <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">{oee?.clasificacion}</div>
          </div>
        </div>

        {/* 3 Pillars */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">1. Disponibilidad</span>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{oee?.disponibilidad}%</div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Tiempo de planta sin paradas no programadas</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">2. Rendimiento</span>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{oee?.rendimiento}%</div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Velocidad estándar vs tiempo real de ciclo</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">3. Calidad</span>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{oee?.calidad}%</div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Producción conforme sin piezas defectuosas ni mermas</p>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Cuellos de Botella (Tiempos Estimados vs Reales por Etapa) */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-3">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-200">
              Análisis de Cuellos de Botella (Horas Estimadas vs Reales)
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Comparativa por estación de trabajo para identificar saturaciones</p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cuellos} margin={{ top: 10, right: 20, left: -10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="etapa" tick={{ fontSize: 10 }} stroke={axisColor} interval={0} angle={-15} textAnchor="end" />
                <YAxis tick={{ fontSize: 10 }} stroke={axisColor} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="horas_estimadas" name="Horas Estimadas" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="horas_reales" name="Horas Reales Invertidas" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Tendencias Mensuales de Ventas y Producción */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-3">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-200">
              Evolución Mensual de Ventas vs Costos de Producción (S/)
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Margen operativo mensual y crecimiento</p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={ventas} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorCostos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="mes" stroke={axisColor} tick={{ fontSize: 11 }} />
                <YAxis stroke={axisColor} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Area type="monotone" dataKey="ventas" name="Ventas (S/)" stroke="#2563eb" fillOpacity={1} fill="url(#colorVentas)" strokeWidth={2} />
                <Area type="monotone" dataKey="costo" name="Costo Producción (S/)" stroke="#f59e0b" fillOpacity={1} fill="url(#colorCostos)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Paradas de Producción por Motivo */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-3">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-200">
              Pareto de Causas de Parada de Planta
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Minutos perdidos por contingencias e incidencias</p>
          </div>
          <div className="h-64 w-full flex items-center justify-center">
            {paradas.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={paradas} layout="vertical" margin={{ top: 10, right: 20, left: 60, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis type="number" stroke={axisColor} tick={{ fontSize: 10 }} />
                  <YAxis dataKey="motivo" type="category" stroke={axisColor} tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="minutos" name="Minutos Perdidos" fill="#ef4444" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <span className="text-xs text-slate-400">No hay paradas registradas este mes</span>
            )}
          </div>
        </div>

        {/* Card 4: Resumen de Eficiencia */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-3 flex flex-col justify-between">
          <div>
            <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-200">
                Diagnóstico de Eficiencia Global
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Principales hallazgos del motor de inteligencia de negocios</p>
            </div>
            <div className="space-y-3 mt-4 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <p>
                  <b className="text-slate-900 dark:text-white">Calidad sobresaliente (98%)</b>: Menos del 2% de merma en el proceso de corte y habilitado de planchas.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <AlertOctagon className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p>
                  <b className="text-slate-900 dark:text-white">Oportunidad en Secado de Pintura</b>: La estación de Acabados acumula los mayores tiempos reales debido a condiciones climáticas.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <p>
                  <b className="text-slate-900 dark:text-white">Margen Bruto promedio del 35.5%</b> en proyectos metalmecánicos y mantenimiento industrial.
                </p>
              </div>
            </div>
          </div>

          <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800/50 text-xs text-blue-900 dark:text-blue-300 font-medium">
            💡 <b>Recomendación BI:</b> La incorporación de asistencia con Inteligencia Artificial permitirá predecir con 48h de anticipación cuellos de botella y desabastecimiento de insumos.
          </div>
        </div>
      </div>
    </div>
  );
}
