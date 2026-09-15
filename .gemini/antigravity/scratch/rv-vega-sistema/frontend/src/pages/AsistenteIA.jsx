import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  Send, 
  Sparkles, 
  AlertTriangle, 
  ShoppingCart, 
  ShieldAlert, 
  Lightbulb,
  CheckCircle2,
  Clock,
  ArrowRight
} from 'lucide-react';
import { api } from '../services/api';

export default function AsistenteIA() {
  const [tab, setTab] = useState('chat'); // 'chat' | 'riesgos' | 'compras'
  const [riesgos, setRiesgos] = useState([]);
  const [compras, setCompras] = useState([]);
  const [loading, setLoading] = useState(false);

  // Chat State
  const [mensajes, setMensajes] = useState([
    {
      remitente: 'ia',
      texto: '¡Hola! Soy el Copiloto Inteligente de RV Vega Servicios Generales E.I.R.L. Estoy analizando continuamente los pedidos, tiempos de ciclo en taller e inventarios para ayudarte a maximizar la eficiencia y cumplir tus entregas sin retrasos. ¿En qué te puedo asesorar hoy?',
      fecha: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputMsg, setInputMsg] = useState('');

  const loadAnalisis = async () => {
    try {
      setLoading(true);
      const [dataRiesgos, dataCompras] = await Promise.all([
        api.get('/ai/riesgos'),
        api.get('/ai/sugerencias-compras')
      ]);
      setRiesgos(dataRiesgos);
      setCompras(dataCompras);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalisis();
  }, []);

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!inputMsg.trim()) return;

    const userMessage = inputMsg;
    setInputMsg('');
    setMensajes(prev => [
      ...prev,
      { remitente: 'usuario', texto: userMessage, fecha: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
    ]);

    try {
      const res = await api.post('/ai/chat', { mensaje: userMessage });
      setMensajes(prev => [
        ...prev,
        { remitente: 'ia', texto: res.respuesta, fecha: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
      ]);
    } catch (err) {
      setMensajes(prev => [
        ...prev,
        { remitente: 'ia', texto: '⚠️ Lo siento, ocurrió un problema al conectar con el motor de IA: ' + err.message, fecha: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
      ]);
    }
  };

  const handleQuickPrompt = (prompt) => {
    setInputMsg(prompt);
  };

  return (
    <div className="p-8 space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 rounded-2xl p-6 text-white shadow-xl flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold">Módulo de Asistencia y Análisis mediante IA</h2>
          </div>
          <p className="text-xs text-blue-200 max-w-2xl">
            Herramientas predictivas avanzadas impulsadas por inteligencia artificial para detectar retrasos antes de que ocurran, balancear cargas de trabajo y guiar las decisiones operativas de RV Vega.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex bg-slate-950/60 p-1 rounded-xl border border-white/10 self-start sm:self-auto text-xs">
          <button
            onClick={() => setTab('chat')}
            className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
              tab === 'chat' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>Copiloto de Planta</span>
          </button>
          <button
            onClick={() => setTab('riesgos')}
            className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
              tab === 'riesgos' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Predicción de Retrasos ({riesgos.length})</span>
          </button>
          <button
            onClick={() => setTab('compras')}
            className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
              tab === 'compras' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Compras Asistidas ({compras.length})</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Chat Copiloto */}
      {tab === 'chat' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[580px] overflow-hidden">
          {/* Quick suggestions header */}
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-slate-500 text-[11px] flex items-center gap-1">
              <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
              Preguntas Frecuentes:
            </span>
            <button
              onClick={() => handleQuickPrompt('¿Cuál es el cuello de botella actual en el taller?')}
              className="px-2.5 py-1 rounded-full bg-white hover:bg-blue-50 hover:text-blue-700 border border-slate-200 text-slate-700 text-[11px] transition"
            >
              ¿Cuál es el cuello de botella actual?
            </button>
            <button
              onClick={() => handleQuickPrompt('¿Qué insumos con stock crítico debo comprar hoy?')}
              className="px-2.5 py-1 rounded-full bg-white hover:bg-blue-50 hover:text-blue-700 border border-slate-200 text-slate-700 text-[11px] transition"
            >
              ¿Qué insumos debo comprar hoy?
            </button>
            <button
              onClick={() => handleQuickPrompt('¿Cómo podemos elevar el OEE por encima del 85%?')}
              className="px-2.5 py-1 rounded-full bg-white hover:bg-blue-50 hover:text-blue-700 border border-slate-200 text-slate-700 text-[11px] transition"
            >
              ¿Cómo elevar el OEE de la planta?
            </button>
          </div>

          {/* Messages container */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4">
            {mensajes.map((m, idx) => {
              const isIa = m.remitente === 'ia';
              return (
                <div key={idx} className={`flex gap-3 ${isIa ? 'items-start' : 'items-start flex-row-reverse'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-xs ${
                    isIa ? 'bg-gradient-to-tr from-blue-700 to-indigo-600 shadow-md shadow-blue-500/20' : 'bg-slate-700'
                  }`}>
                    {isIa ? <Bot className="w-4 h-4" /> : 'Tú'}
                  </div>
                  <div className={`max-w-2xl rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                    isIa
                      ? 'bg-slate-100 text-slate-800 border border-slate-200 whitespace-pre-line'
                      : 'bg-blue-600 text-white shadow-sm'
                  }`}>
                    <div>{m.texto}</div>
                    <div className={`text-[10px] mt-1.5 ${isIa ? 'text-slate-400' : 'text-blue-200'}`}>
                      {m.fecha}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Input field */}
          <form onSubmit={handleSendMessage} className="p-4 bg-slate-50 border-t border-slate-200 flex gap-2">
            <input
              type="text"
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              placeholder="Pregunta sobre la producción, estados de pedidos o recomendaciones de planta..."
              className="flex-1 px-4 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
            <button
              type="submit"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>Enviar</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}

      {/* Tab 2: Predicción de Riesgos */}
      {tab === 'riesgos' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {riesgos.map((r, idx) => (
              <div key={idx} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-extrabold text-sm text-blue-700">{r.codigo_op}</span>
                    <span className="text-xs bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded">
                      Pedido: {r.codigo_pedido}
                    </span>
                    <span className="text-xs text-slate-500">({r.cliente})</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-medium">Probabilidad de retraso:</span>
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                      r.nivel_riesgo === 'Crítico' || r.nivel_riesgo === 'Alto'
                        ? 'bg-red-100 text-red-700'
                        : r.nivel_riesgo === 'Medio'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {r.probabilidad_retraso_pct}% - Riesgo {r.nivel_riesgo}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-600">
                  <div>Avance Actual: <span className="font-bold text-slate-900">{r.avance_actual}</span></div>
                  <div>Fecha Prometida: <span className="font-semibold text-slate-900">{r.fecha_prometida}</span></div>
                  <div>Días Restantes: <span className="font-bold text-blue-700">{r.dias_disponibles} días</span></div>
                  <div>Carga de Trabajo: <span className="font-semibold">{r.horas_restantes_estimadas}h pendientes</span></div>
                </div>

                {/* Factores de Riesgo */}
                <div className="space-y-1 text-xs">
                  <span className="font-bold text-slate-700 flex items-center gap-1 text-[11px] uppercase tracking-wider">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    Factores Identificados por la IA:
                  </span>
                  <ul className="list-disc pl-5 text-slate-600 space-y-0.5 text-xs">
                    {r.factores_riesgo?.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                </div>

                {/* Acción Recomendada */}
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2">
                  <Lightbulb className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Acción Correctiva Sugerida: </span>
                    <span>{r.accion_recomendada}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Compras Asistidas */}
      {tab === 'compras' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 text-xs text-slate-600 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <p>
              El modelo evalúa las órdenes en proceso, los consumos promedio y el stock mínimo para calcular el lote óptimo de reposición antes de que ocurran paradas de línea.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {compras.map((c) => (
              <div key={c.material_id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-mono text-xs font-bold text-slate-500">{c.sku}</span>
                    <h3 className="font-bold text-sm text-slate-900">{c.nombre}</h3>
                    <span className="text-[11px] text-slate-400">{c.categoria}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">
                    {c.prioridad}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div>Stock Actual: <b className="text-red-600">{c.stock_actual} {c.unidad_medida}</b></div>
                  <div>Stock Mínimo: <b>{c.stock_minimo} {c.unidad_medida}</b></div>
                  <div>Cantidad Sugerida: <b className="text-blue-700">{c.cantidad_sugerida} {c.unidad_medida}</b></div>
                  <div>Inversión Aprox.: <b className="text-slate-900">S/ {c.inversion_estimada_pen.toFixed(2)}</b></div>
                </div>

                <p className="text-xs text-slate-500">
                  {c.justificacion}
                </p>

                <div className="pt-2 border-t border-slate-100 flex justify-end">
                  <button
                    onClick={() => alert(`Orden de compra generada para ${c.cantidad_sugerida} ${c.unidad_medida} de ${c.nombre}`)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                  >
                    <span>Generar Requerimiento de Compra</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
