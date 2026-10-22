import React, { useState, useEffect, useRef } from 'react';
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
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Layers,
  CheckCircle,
  Package,
  AlertOctagon,
  HelpCircle,
  Activity,
  ChevronRight,
  Zap,
  Trash2,
  Copy,
  Check,
  Truck,
  Building2,
  FileCheck,
  FileDown,
  FileText,
  PackageCheck,
  Printer,
  X
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { api } from '../services/api';

/**
 * Renderizador de formato enriquecido para las respuestas ejecutivas del Copiloto
 */
function FormattedMessage({ text }) {
  if (!text) return null;

  const lines = text.split('\n');
  const elements = [];
  let inTable = false;
  let tableRows = [];

  const flushTable = (key) => {
    if (tableRows.length > 0) {
      elements.push(
        <div key={`table-${key}`} className="my-2.5 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850">
          <table className="min-w-full text-[11px] divide-y divide-slate-200 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold">
              <tr>
                {tableRows[0].map((th, i) => (
                  <th key={i} className="px-3 py-1.5 text-left">{th}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {tableRows.slice(1).map((row, rIdx) => (
                <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-white dark:bg-slate-850' : 'bg-slate-50/50 dark:bg-slate-800/50'}>
                  {row.map((td, cIdx) => (
                    <td key={cIdx} className="px-3 py-1.5 text-slate-800 dark:text-slate-200">{td}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableRows = [];
    }
    inTable = false;
  };

  const renderInline = (str) => {
    // Reemplaza **texto** por <b>texto</b>
    const parts = [];
    let remaining = str;
    let keyIdx = 0;

    while (remaining.length > 0) {
      const match = remaining.match(/\*\*(.*?)\*\*/);
      if (match) {
        const pre = remaining.slice(0, match.index);
        if (pre) parts.push(<span key={keyIdx++}>{pre}</span>);
        parts.push(<strong key={keyIdx++} className="font-bold text-slate-900 dark:text-slate-100">{match[1]}</strong>);
        remaining = remaining.slice(match.index + match[0].length);
      } else {
        parts.push(<span key={keyIdx++}>{remaining}</span>);
        break;
      }
    }
    return parts;
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    // Detección de tablas markdown (| col | col |)
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      if (!inTable) inTable = true;
      // Descartar línea separadora | :--- | :--- |
      if (!trimmed.includes('---')) {
        const cells = trimmed.split('|').filter((_, i, arr) => i > 0 && i < arr.length - 1).map(c => c.trim());
        tableRows.push(cells);
      }
      return;
    } else if (inTable) {
      flushTable(idx);
    }

    if (trimmed === '---') {
      elements.push(<hr key={idx} className="my-2.5 border-slate-200 dark:border-slate-700" />);
    } else if (trimmed.startsWith('### ')) {
      elements.push(
        <h4 key={idx} className="text-xs font-bold text-blue-900 dark:text-blue-300 mt-2.5 mb-1.5 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>{trimmed.replace('### ', '')}</span>
        </h4>
      );
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
      const content = trimmed.slice(2);
      elements.push(
        <div key={idx} className="flex items-start gap-1.5 ml-1 my-0.5 text-xs text-slate-700 dark:text-slate-300">
          <span className="text-blue-500 dark:text-blue-400 font-bold leading-tight mt-0.5">•</span>
          <div className="flex-1">{renderInline(content)}</div>
        </div>
      );
    } else if (/^\d+\.\s/.test(trimmed)) {
      const dotIndex = trimmed.indexOf('.');
      const num = trimmed.slice(0, dotIndex);
      const content = trimmed.slice(dotIndex + 1).trim();
      elements.push(
        <div key={idx} className="flex items-start gap-1.5 ml-1 my-0.5 text-xs text-slate-700 dark:text-slate-300">
          <span className="text-blue-700 dark:text-blue-400 font-bold text-[11px] leading-tight min-w-[14px]">{num}.</span>
          <div className="flex-1">{renderInline(content)}</div>
        </div>
      );
    } else if (trimmed.startsWith('💡') || trimmed.startsWith('🚨') || trimmed.startsWith('🎯') || trimmed.startsWith('📌')) {
      elements.push(
        <div key={idx} className="p-2.5 my-2 rounded-lg bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-800/60 text-xs text-slate-800 dark:text-slate-200">
          {renderInline(trimmed)}
        </div>
      );
    } else if (trimmed.length > 0) {
      elements.push(
        <p key={idx} className="my-1 text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
          {renderInline(trimmed)}
        </p>
      );
    }
  });

  if (inTable) flushTable('end');

  return <div className="space-y-0.5">{elements}</div>;
}

export default function AsistenteIA() {
  const [tab, setTab] = useState('chat'); // 'chat' | 'riesgos' | 'compras'
  const [riesgos, setRiesgos] = useState([]);
  const [compras, setCompras] = useState([]);
  const [sugerenciasPreguntas, setSugerenciasPreguntas] = useState({ dinamicas: [], categorias: [], preguntas: [] });
  const [filtroSugerencia, setFiltroSugerencia] = useState('Todos');
  const [filtroRiesgo, setFiltroRiesgo] = useState('Todos');
  const [filtroCategoriaCompra, setFiltroCategoriaCompra] = useState('Todos');
  const [loading, setLoading] = useState(false);
  const [sendingChat, setSendingChat] = useState(false);
  const [requisicionEnviada, setRequisicionEnviada] = useState({});
  const [requerimientos, setRequerimientos] = useState([]);
  const [modalVerificarCompra, setModalVerificarCompra] = useState(null);
  const [verificarForm, setVerificarForm] = useState({
    cantidad_recibida: '',
    costo_unitario_real: '',
    numero_factura: '',
    observaciones: ''
  });
  const [guardandoIngreso, setGuardandoIngreso] = useState(false);
  const [procesandoCompraId, setProcesandoCompraId] = useState(null);
  const [mostrarOpciones, setMostrarOpciones] = useState(true);

  // Chat State
  const [mensajes, setMensajes] = useState([
    {
      id: 1,
      remitente: 'ia',
      texto: `### 👋 ¡Hola! Soy el Copiloto de Planta de RV Vega Servicios Generales E.I.R.L.

Estoy monitoreando en tiempo real las operaciones en taller, los 5 pedidos en cartera y los insumos de almacén.

📌 **Puntos Clave Detectados**:
- **Órdenes Activas**: OP-2026-003 (70% avance) en etapa de Tratamiento y Pintura.
- **Alertas de Abastecimiento**: 2 insumos con stock por debajo del mínimo (Alambre MIG y Esmalte Poliuretano).
- **Eficiencia Global (OEE)**: 84.1% (Disponibilidad: 97%, Rendimiento: 90%, Calidad: 96%).

¿En qué área de la planta necesitas soporte o diagnóstico ahora mismo?`,
      hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputMsg, setInputMsg] = useState('');
  const chatEndRef = useRef(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [mensajes, sendingChat]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [dataRiesgos, dataCompras, dataSugerencias, dataRequerimientos] = await Promise.all([
        api.get('/ai/riesgos').catch(() => []),
        api.get('/ai/sugerencias-compras').catch(() => []),
        api.get('/ai/sugerencias-preguntas').catch(() => ({ dinamicas: [], categorias: [], preguntas: [] })),
        api.get('/ai/compras/requerimientos').catch(() => [])
      ]);
      setRiesgos(dataRiesgos || []);
      setCompras(dataCompras || []);
      setSugerenciasPreguntas(dataSugerencias || { dinamicas: [], categorias: [], preguntas: [] });
      setRequerimientos(dataRequerimientos || []);

      const reqMap = {};
      (dataRequerimientos || []).forEach(r => {
        if (!reqMap[r.material_id]) {
          reqMap[r.material_id] = r;
        }
      });
      // También mapear requerimientos activos directos que vengan en las sugerencias
      (dataCompras || []).forEach(c => {
        if (c.requerimiento_activo && !reqMap[c.material_id]) {
          reqMap[c.material_id] = c.requerimiento_activo;
        }
      });
      setRequisicionEnviada(reqMap);
    } catch (err) {
      console.error('Error cargando módulo IA:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSendMessage = async (textToSend) => {
    const query = (textToSend || inputMsg).trim();
    if (!query || sendingChat) return;

    setInputMsg('');
    const userMsg = {
      id: Date.now(),
      remitente: 'usuario',
      texto: query,
      hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMensajes(prev => [...prev, userMsg]);
    setSendingChat(true);

    try {
      const res = await api.post('/ai/chat', { mensaje: query });
      setMensajes(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          remitente: 'ia',
          texto: res.respuesta,
          hora: res.hora || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (err) {
      setMensajes(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          remitente: 'ia',
          texto: '⚠️ Ocurrió una interrupción al consultar el motor de IA: ' + err.message,
          hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setSendingChat(false);
    }
  };

  const handleQuickPrompt = (prompt) => {
    handleSendMessage(prompt);
  };

  const handleDescargarPdfOC = async (item, req) => {
    try {
      const doc = new jsPDF();
      const fechaEmision = new Date().toLocaleDateString('es-PE');
      const horaEmision = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // Membrete Institucional RV Vega
      doc.setFontSize(14);
      doc.setTextColor(30, 58, 138); // Azul institucional
      doc.text('RV VEGA SERVICIOS GENERALES E.I.R.L.', 14, 18);

      doc.setFontSize(8.5);
      doc.setTextColor(90, 90, 90);
      doc.text('RUC: 20601284751 | Fabricación de Estructuras Metálicas, Tolvas y Calderería Industrial', 14, 23);
      doc.text('Parque Industrial Mz. B Lote 12, Villa El Salvador, Lima | Central: (01) 456-7890', 14, 27);

      // Recuadro de Número de Orden
      doc.setDrawColor(30, 58, 138);
      doc.setLineWidth(0.6);
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(125, 12, 71, 18, 2, 2, 'FD');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 58, 138);
      doc.text('ORDEN DE COMPRA / REQUERIMIENTO', 128, 18);
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text(req.codigo_req, 142, 26);

      // Metadatos
      doc.setFontSize(8.5);
      doc.setTextColor(60, 60, 60);
      doc.text(`Fecha y Hora de Emisión: ${fechaEmision} ${horaEmision}`, 14, 35);
      doc.text(`Destino: Almacén Central de Materia Prima / Taller Principal`, 14, 40);
      doc.text(`Estado del Requerimiento: ${req.estado ? req.estado.toUpperCase() : 'PENDIENTE DE COMPRA'}`, 125, 35);

      // Tabla 1: Detalle del Material a Comprar
      const cantComprar = req.cantidad || item.cantidad_sugerida;
      const costoUnit = req.costo_unitario || item.costo_unitario;
      const totalEstimado = req.costo_estimado || (cantComprar * costoUnit);

      const headDetalle = [["SKU", "Descripción del Material / Insumo", "Categoría", "Cant. a Comprar", "Und.", "Costo Unit. Ref.", "Total Estimado"]];
      const bodyDetalle = [[
        item.sku || req.material_sku,
        item.nombre || req.material_nombre,
        item.categoria || req.categoria || 'Materia Prima',
        String(cantComprar),
        item.unidad_medida || req.unidad_medida,
        `S/ ${Number(costoUnit).toFixed(2)}`,
        `S/ ${Number(totalEstimado).toFixed(2)}`
      ]];

      autoTable(doc, {
        startY: 45,
        head: headDetalle,
        body: bodyDetalle,
        theme: 'grid',
        headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: 'bold', fontSize: 8 },
        styles: { fontSize: 8.5, cellPadding: 3.5 }
      });

      // Tabla 2: Diagnóstico de Almacén y Control de Stock
      const yDiagnostico = doc.lastAutoTable.finalY + 6;
      doc.setFontSize(9);
      doc.setTextColor(30, 58, 138);
      doc.text('1. DIAGNÓSTICO DE STOCK Y FALTANTE EN ALMACÉN', 14, yDiagnostico);

      const stockActualVal = item.stock_actual !== undefined ? item.stock_actual : req.stock_actual_al_solicitar;
      const stockMinVal = item.stock_minimo !== undefined ? item.stock_minimo : req.stock_minimo;
      const deficitVal = item.deficit !== undefined ? item.deficit : (req.deficit_al_solicitar || Math.max(0, stockMinVal - stockActualVal));

      const headStock = [["Stock Actual en Planta", "Stock Mínimo de Seguridad", "Déficit Faltante", "Ubicación Almacén", "Criticidad"]];
      const bodyStock = [[
        `${stockActualVal} ${item.unidad_medida || req.unidad_medida}`,
        `${stockMinVal} ${item.unidad_medida || req.unidad_medida}`,
        `${deficitVal} ${item.unidad_medida || req.unidad_medida}`,
        item.ubicacion_almacen || 'Almacén Central',
        item.prioridad || 'Alta (Bajo Mínimo)'
      ]];

      autoTable(doc, {
        startY: yDiagnostico + 3,
        head: headStock,
        body: bodyStock,
        theme: 'grid',
        headStyles: { fillColor: [71, 85, 105], textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
        styles: { fontSize: 8, cellPadding: 3 }
      });

      // Sección 2: Justificación Analítica y Órdenes
      const yJust = doc.lastAutoTable.finalY + 6;
      doc.setFontSize(9);
      doc.setTextColor(30, 58, 138);
      doc.text('2. SUSTENTO TÉCNICO Y PRODUCCIÓN AFECTADA', 14, yJust);

      doc.setFontSize(8);
      doc.setTextColor(60, 60, 60);
      const justTexto = req.justificacion || item.justificacion || 'Reabastecimiento de insumos para cubrir la demanda y prevenir paradas en taller.';
      const lineasJust = doc.splitTextToSize(`Justificación del requerimiento: ${justTexto}`, 182);
      doc.text(lineasJust, 14, yJust + 5);

      const yAfectadas = yJust + 5 + (lineasJust.length * 4) + 2;
      const ordenesTxt = item.ordenes_afectadas?.length > 0
        ? `Órdenes de Producción en taller potencialmente impactadas: ${item.ordenes_afectadas.join(', ')}`
        : 'Órdenes de Producción en taller potencialmente impactadas: Producción continua de planta';
      doc.text(ordenesTxt, 14, yAfectadas);

      // Cuadro de Control de Compras
      const yInst = yAfectadas + 6;
      doc.setDrawColor(203, 213, 225);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, yInst, 182, 16, 1.5, 1.5, 'FD');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text('PROCEDIMIENTO DE CONTROL Y RECEPCIÓN:', 17, yInst + 4.5);
      doc.text('1. El encargado de compras gestionará la adquisición del material indicado para taller.', 17, yInst + 8.5);
      doc.text('2. Al ingresar el insumo al taller, almacén debe verificar cantidades físicas y registrar el ingreso en el sistema con el N° de Factura.', 17, yInst + 12.5);

      // Firmas
      const yFirmas = yInst + 28;
      doc.setDrawColor(148, 163, 184);
      doc.setLineWidth(0.5);
      doc.line(25, yFirmas, 85, yFirmas);
      doc.line(125, yFirmas, 185, yFirmas);

      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text('Encargado de Compras / Logística', 32, yFirmas + 5);
      doc.text('Firma y Fecha de Gestión', 36, yFirmas + 9);

      doc.text('Aprobado: Gerencia de Operaciones', 131, yFirmas + 5);
      doc.text('Ing. Roberto Vega - RV Vega E.I.R.L.', 130, yFirmas + 9);

      // Descargar archivo PDF
      doc.save(`Orden_Compra_${req.codigo_req}_RV_Vega.pdf`);

      // Marcar en backend como impreso
      if (req.id) {
        await api.patch(`/ai/compras/requerimientos/${req.id}/impreso`);
        await loadData();
      }
    } catch (err) {
      console.error("Error al generar PDF de la Orden de Compra:", err);
      alert("Error al generar PDF: " + err.message);
    }
  };

  const handleGenerarRequerimiento = async (item) => {
    try {
      setProcesandoCompraId(item.material_id);
      const res = await api.post('/ai/compras/requerimiento', {
        material_id: item.material_id,
        cantidad: item.cantidad_sugerida,
        justificacion: `Requerimiento generado desde el Asistente IA: ${item.justificacion}`
      });

      const nuevaOc = res.requerimiento;
      setRequisicionEnviada(prev => ({
        ...prev,
        [item.material_id]: nuevaOc
      }));

      // Descargar automáticamente el PDF oficial de la Orden de Compra
      await handleDescargarPdfOC(item, nuevaOc);

      await loadData();
    } catch (err) {
      alert('Error al generar Orden de Compra: ' + err.message);
    } finally {
      setProcesandoCompraId(null);
    }
  };

  const abrirModalVerificarCompra = (item, req) => {
    setModalVerificarCompra({ item, req });
    setVerificarForm({
      cantidad_recibida: req.cantidad || item.cantidad_sugerida || 1,
      costo_unitario_real: req.costo_unitario || item.costo_unitario || 0,
      numero_factura: '',
      observaciones: 'Material recibido conforme en almacén central.'
    });
  };

  const handleConfirmarIngresoAlmacen = async (e) => {
    e.preventDefault();
    if (!modalVerificarCompra?.req) return;
    try {
      setGuardandoIngreso(true);
      await api.post(`/ai/compras/requerimientos/${modalVerificarCompra.req.id}/ingresar`, verificarForm);
      alert(`¡Compra verificada con éxito!\nSe ingresaron ${verificarForm.cantidad_recibida} unidades al catálogo de inventario y se registró la entrada en el Kardex.`);
      setModalVerificarCompra(null);
      await loadData();
    } catch (err) {
      alert('Error al verificar e ingresar compra: ' + err.message);
    } finally {
      setGuardandoIngreso(false);
    }
  };

  const handleLimpiarChat = () => {
    if (window.confirm('¿Deseas reiniciar la conversación del Copiloto?')) {
      setMensajes([
        {
          id: Date.now(),
          remitente: 'ia',
          texto: `### 👋 Copiloto de Planta RV Vega reiniciado.\n\nEl sistema se encuentra sincronizado con el estado actual de la producción. ¿En qué orden o indicador deseas enfocarte?`,
          hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }
  };

  // Filtrado de riesgos
  const riesgosFiltrados = riesgos.filter(r => {
    if (filtroRiesgo === 'Todos') return true;
    if (filtroRiesgo === 'Crítico/Alto') return r.nivel_riesgo === 'Crítico' || r.nivel_riesgo === 'Alto';
    return r.nivel_riesgo === filtroRiesgo;
  });

  // Filtrado de compras
  const categoriasCompra = ['Todos', ...new Set(compras.map(c => c.categoria))];
  const comprasFiltradas = compras.filter(c => {
    if (filtroCategoriaCompra === 'Todos') return true;
    return c.categoria === filtroCategoriaCompra;
  });

  // Sugerencias filtradas
  const preguntasFiltradas = (sugerenciasPreguntas.preguntas || []).filter(p => {
    if (filtroSugerencia === 'Todos') return true;
    return p.categoria === filtroSugerencia;
  });

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      
      {/* 3.6.3 Encabezado del Módulo con Identificación de la Especificación */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 rounded-2xl p-6 text-white shadow-xl border border-slate-800 flex flex-col lg:flex-row justify-between lg:items-center gap-5">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/20 text-blue-300 border border-blue-400/30 uppercase tracking-wider">
              3.6.3 Copiloto de Planta y Motor de Diagnósticos (IA)
            </span>
            <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
              <Activity className="w-3 h-3 animate-pulse" />
              Telemetría de Taller Activa
            </span>
          </div>
          <h2 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <span>Sistema Asistente de Operaciones y Analítica Predictiva</span>
          </h2>
          <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
            Plataforma de inteligencia artificial integrada para RV Vega Servicios Generales E.I.R.L. Procesamiento de lenguaje natural, detección predictiva de cuellos de botella y cálculo automatizado de lotes económicos de compra.
          </p>
        </div>

        {/* 3.6.3.5 Panel Visual con Tres Pestañas Operativas */}
        <div className="flex bg-slate-950/80 p-1.5 rounded-xl border border-white/10 self-start lg:self-auto text-xs shadow-inner">
          <button
            onClick={() => setTab('chat')}
            className={`px-3.5 py-2 rounded-lg font-bold transition flex items-center gap-2 cursor-pointer ${
              tab === 'chat' 
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Bot className="w-4 h-4 text-amber-300" />
            <span>Copiloto de Planta</span>
          </button>

          <button
            onClick={() => setTab('riesgos')}
            className={`px-3.5 py-2 rounded-lg font-bold transition flex items-center gap-2 cursor-pointer ${
              tab === 'riesgos' 
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>Predicción de Retrasos</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-red-500/30 text-red-200 border border-red-500/30 font-bold">
              {riesgos.length}
            </span>
          </button>

          <button
            onClick={() => setTab('compras')}
            className={`px-3.5 py-2 rounded-lg font-bold transition flex items-center gap-2 cursor-pointer ${
              tab === 'compras' 
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <ShoppingCart className="w-4 h-4 text-emerald-400" />
            <span>Compras Asistidas</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/30 text-amber-200 border border-amber-500/30 font-bold">
              {compras.length}
            </span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* PESTAÑA 1: COPILOTO DE PLANTA (3.6.3.1 y 3.6.3.4)               */}
      {/* ============================================================== */}
      {tab === 'chat' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-[650px] overflow-hidden transition-colors">
          
          {/* Barra superior de estado */}
          <div className="px-6 py-3.5 bg-slate-900 dark:bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/30">
                <Bot className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <h3 className="font-bold text-xs leading-none">Copiloto Inteligente de Taller</h3>
                <span className="text-[10px] text-blue-300">Modelo PLN contextual para gestión de pedidos y órdenes</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setMostrarOpciones(prev => !prev)}
                className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer text-xs flex items-center gap-1.5 ${
                  mostrarOpciones ? 'bg-blue-600 text-white font-bold' : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
                title="Mostrar u ocultar sugerencias de preguntas"
              >
                <Lightbulb className="w-3.5 h-3.5 text-amber-300" />
                <span className="hidden sm:inline text-[11px]">{mostrarOpciones ? 'Ocultar Opciones' : 'Ver Opciones de Pregunta'}</span>
              </button>

              <button
                onClick={loadData}
                title="Actualizar datos de planta"
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer text-xs flex items-center gap-1"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-400' : ''}`} />
                <span className="hidden sm:inline text-[11px]">Sincronizar</span>
              </button>

              <button
                onClick={handleLimpiarChat}
                title="Limpiar conversación"
                className="p-1.5 text-slate-400 hover:text-red-300 rounded-lg hover:bg-slate-800 transition cursor-pointer text-xs flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[11px]">Reiniciar</span>
              </button>
            </div>
          </div>

          {/* Panel Interactivo de Opciones de Preguntas para el Usuario */}
          {mostrarOpciones && (
            <div className="p-4 bg-slate-900/95 dark:bg-slate-950/95 text-white border-b border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Opciones de Preguntas que puedes hacerle al Copiloto (Haz clic en cualquiera):
                </span>
                <button 
                  onClick={() => setMostrarOpciones(false)}
                  className="text-[11px] text-slate-400 hover:text-white"
                >
                  ✕ Cerrar
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {/* 1. Ventas y Cartera */}
                <div className="bg-slate-800/90 dark:bg-slate-900/90 p-3 rounded-xl border border-slate-700 dark:border-slate-800 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-blue-400 font-bold text-[11px]">
                    <ShoppingCart className="w-3.5 h-3.5" />
                    <span>Ventas y Cartera</span>
                  </div>
                  <div className="space-y-1">
                    {[
                      '¿Qué ventas y pedidos se registraron en el sistema?',
                      '¿Cuáles son los pedidos con mayor facturación en soles?',
                      '¿Qué clientes tienen pedidos pendientes de entrega?'
                    ].map((q, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendMessage(q)}
                        className="w-full text-left p-1.5 rounded-lg bg-slate-900/80 hover:bg-blue-600/30 hover:text-blue-200 text-slate-300 text-[10px] leading-snug transition flex items-center justify-between group cursor-pointer border border-transparent hover:border-blue-500/40"
                      >
                        <span className="line-clamp-2">{q}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-400 flex-shrink-0 ml-1" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Operaciones y Taller */}
                <div className="bg-slate-800/90 dark:bg-slate-900/90 p-3 rounded-xl border border-slate-700 dark:border-slate-800 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-amber-400 font-bold text-[11px]">
                    <Activity className="w-3.5 h-3.5" />
                    <span>Producción y Taller</span>
                  </div>
                  <div className="space-y-1">
                    {[
                      '¿Cuál es el principal cuello de botella actual en el taller?',
                      '¿Cuál es el estado de avance de la orden OP-2026-003?',
                      '¿Cómo está distribuida la carga de trabajo de los operarios?'
                    ].map((q, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendMessage(q)}
                        className="w-full text-left p-1.5 rounded-lg bg-slate-900/80 hover:bg-amber-600/30 hover:text-amber-200 text-slate-300 text-[10px] leading-snug transition flex items-center justify-between group cursor-pointer border border-transparent hover:border-amber-500/40"
                      >
                        <span className="line-clamp-2">{q}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 flex-shrink-0 ml-1" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Inventario y Compras */}
                <div className="bg-slate-800/90 dark:bg-slate-900/90 p-3 rounded-xl border border-slate-700 dark:border-slate-800 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-red-400 font-bold text-[11px]">
                    <Package className="w-3.5 h-3.5" />
                    <span>Insumos y Almacén</span>
                  </div>
                  <div className="space-y-1">
                    {[
                      '¿Qué insumos tienen stock por debajo del mínimo de seguridad?',
                      '¿Cuánto cuesta la compra sugerida de insumos críticos?',
                      '¿Qué órdenes corren riesgo por falta de alambre o pintura?'
                    ].map((q, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendMessage(q)}
                        className="w-full text-left p-1.5 rounded-lg bg-slate-900/80 hover:bg-red-600/30 hover:text-red-200 text-slate-300 text-[10px] leading-snug transition flex items-center justify-between group cursor-pointer border border-transparent hover:border-red-500/40"
                      >
                        <span className="line-clamp-2">{q}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-red-400 flex-shrink-0 ml-1" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. OEE y Eficiencia */}
                <div className="bg-slate-800/90 dark:bg-slate-900/90 p-3 rounded-xl border border-slate-700 dark:border-slate-800 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[11px]">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Métricas OEE y OTIF</span>
                  </div>
                  <div className="space-y-1">
                    {[
                      '¿Cuál es el OEE actual de la planta y cómo superamos el 85%?',
                      '¿Cuál es la tasa de cumplimiento de entregas a tiempo (OTIF)?',
                      '¿Qué paradas de planta no programadas se registraron?'
                    ].map((q, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendMessage(q)}
                        className="w-full text-left p-1.5 rounded-lg bg-slate-900/80 hover:bg-emerald-600/30 hover:text-emerald-200 text-slate-300 text-[10px] leading-snug transition flex items-center justify-between group cursor-pointer border border-transparent hover:border-emerald-500/40"
                      >
                        <span className="line-clamp-2">{q}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 flex-shrink-0 ml-1" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3.6.3.4 Sugerencias Dinámicas Rápidas */}
          <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 overflow-x-auto text-[11px] transition-colors">
            <span className="font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1 flex-shrink-0">
              <Zap className="w-3 h-3 text-amber-500" />
              Rápidas:
            </span>
            {[
              '¿Qué ventas y pedidos se registraron en el sistema?',
              '¿Cuál es el cuello de botella actual en el taller?',
              '¿Cuál es el OEE actual de la planta?',
              '¿Qué insumos con stock crítico debo comprar hoy?',
              '¿Cuál es el estado de avance de la orden OP-2026-003?'
            ].map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(p)}
                className="px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-300 border border-slate-200 dark:border-slate-700 text-[10px] whitespace-nowrap transition cursor-pointer font-medium"
              >
                {p}
              </button>
            ))}
          </div>

          {/* Área de Mensajes */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50/40 dark:bg-slate-950/40 transition-colors">
            {mensajes.map((m) => {
              const isIa = m.remitente === 'ia';
              return (
                <div key={m.id} className={`flex gap-3 ${isIa ? 'items-start' : 'items-start flex-row-reverse'}`}>
                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-white font-bold text-xs shadow-sm ${
                    isIa ? 'bg-gradient-to-tr from-slate-900 to-blue-700 text-amber-300' : 'bg-slate-700 dark:bg-slate-600'
                  }`}>
                    {isIa ? <Bot className="w-4 h-4" /> : 'Tú'}
                  </div>

                  {/* Burbuja */}
                  <div className={`max-w-3xl rounded-2xl p-4 text-xs leading-relaxed shadow-sm ${
                    isIa
                      ? 'bg-white dark:bg-slate-850 text-slate-800 dark:text-slate-200 border border-slate-200/90 dark:border-slate-750'
                      : 'bg-blue-600 text-white shadow-blue-500/10'
                  }`}>
                    {isIa ? (
                      <FormattedMessage text={m.texto} />
                    ) : (
                      <div className="whitespace-pre-line font-medium">{m.texto}</div>
                    )}
                    <div className={`text-[10px] mt-2 flex items-center justify-between ${isIa ? 'text-slate-400 dark:text-slate-500' : 'text-blue-200'}`}>
                      <span>{m.hora}</span>
                      {isIa && (
                        <span className="text-[10px] text-blue-600/70 dark:text-blue-400 font-mono">RV Vega Copilot</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {sendingChat && (
              <div className="flex gap-3 items-start">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-slate-900 to-blue-700 text-amber-300 flex items-center justify-center flex-shrink-0 text-xs shadow-sm">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-2xl px-4 py-3 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 shadow-sm">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                  <span className="font-medium text-slate-600 dark:text-slate-300">El Copiloto está evaluando los datos de taller e inventario...</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Formulario de Entrada */}
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} 
            className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex gap-2.5 items-center transition-colors"
          >
            <input
              type="text"
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              placeholder="Pregunta sobre cuellos de botella, OEE, avance de OP-2026-003, insumos o tiempos..."
              disabled={sendingChat}
              className="flex-1 px-4 py-3 text-xs rounded-xl border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition"
            />
            <button
              type="submit"
              disabled={sendingChat || !inputMsg.trim()}
              className="px-5 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 transition flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              <span>Consultar</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}

      {/* ============================================================== */}
      {/* PESTAÑA 2: PREDICCIÓN DE RETRASOS (3.6.3.2)                    */}
      {/* ============================================================== */}
      {tab === 'riesgos' && (
        <div className="space-y-6">
          
          {/* Tarjetas KPI de Resumen de Riesgos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between transition-colors">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase">Órdenes Evaluadas</span>
                <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-0.5">{riesgos.length}</p>
                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">Algoritmo predictivo activo</span>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 rounded-xl">
                <Layers className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between transition-colors">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase">Riesgo Crítico / Alto</span>
                <p className="text-2xl font-extrabold text-red-600 dark:text-red-400 mt-0.5">
                  {riesgos.filter(r => r.nivel_riesgo === 'Crítico' || r.nivel_riesgo === 'Alto').length}
                </p>
                <span className="text-[10px] text-red-600 dark:text-red-400 font-medium">Requieren acción inmediata</span>
              </div>
              <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-xl">
                <AlertOctagon className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between transition-colors">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase">Riesgo Medio</span>
                <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-0.5">
                  {riesgos.filter(r => r.nivel_riesgo === 'Medio').length}
                </p>
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">Holgura ajustada (&lt; 3 días)</span>
              </div>
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between transition-colors">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase">A Tiempo (Riesgo Bajo)</span>
                <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {riesgos.filter(r => r.nivel_riesgo === 'Bajo').length}
                </p>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Flujo estándar conforme</span>
              </div>
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Filtros de Riesgo */}
          <div className="flex items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs transition-colors">
            <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Filtrar Órdenes por Nivel de Riesgo:
            </span>

            <div className="flex gap-1.5">
              {['Todos', 'Crítico/Alto', 'Medio', 'Bajo'].map(filtro => (
                <button
                  key={filtro}
                  onClick={() => setFiltroRiesgo(filtro)}
                  className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                    filtroRiesgo === filtro
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {filtro}
                </button>
              ))}
            </div>
          </div>

          {/* Listado de Tarjetas Predictivas por Orden de Producción */}
          <div className="space-y-4">
            {riesgosFiltrados.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 text-center text-slate-500 dark:text-slate-400 text-xs">
                No se encontraron órdenes con el filtro de riesgo seleccionado.
              </div>
            ) : (
              riesgosFiltrados.map((r) => (
                <div key={r.id || r.codigo_op} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4 hover:border-blue-300 dark:hover:border-blue-500/50 transition">
                  
                  {/* Encabezado de la Tarjeta */}
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-base text-blue-700 dark:text-blue-400">{r.codigo_op}</span>
                        <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold px-2.5 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                          {r.codigo_pedido}
                        </span>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded uppercase border ${
                          r.prioridad === 'Urgente' 
                            ? 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-200 dark:border-red-900/40' 
                            : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-900/40'
                        }`}>
                          Prioridad {r.prioridad}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {r.cliente} <span className="font-mono text-slate-400 dark:text-slate-500 font-normal">({r.cliente_doc || 'RUC'})</span>
                      </p>
                    </div>

                    {/* Badge de Probabilidad de Retraso */}
                    <div className="flex items-center gap-3 self-start sm:self-auto">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Probabilidad de Retraso</span>
                        <span className="font-mono font-extrabold text-sm text-slate-900 dark:text-slate-100">{r.probabilidad_retraso_pct}%</span>
                      </div>
                      <div className={`px-3 py-1.5 rounded-xl font-extrabold text-xs flex items-center gap-1.5 shadow-sm ${
                        r.nivel_riesgo === 'Crítico'
                          ? 'bg-red-600 text-white'
                          : r.nivel_riesgo === 'Alto'
                          ? 'bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-800'
                          : r.nivel_riesgo === 'Medio'
                          ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                          : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                      }`}>
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Riesgo {r.nivel_riesgo}</span>
                      </div>
                    </div>
                  </div>

                  {/* Barra de Avance y Métricas de Taller */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs bg-slate-50 dark:bg-slate-850 p-3.5 rounded-xl border border-slate-200/70 dark:border-slate-800">
                    <div>
                      <span className="text-slate-400 dark:text-slate-500 text-[10px] block">Avance Físico</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-bold text-slate-900 dark:text-slate-100">{r.avance_actual}</span>
                        <div className="w-20 bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                          <div className="bg-blue-600 dark:bg-blue-500 h-full rounded-full" style={{ width: `${r.porcentaje_avance || 0}%` }}></div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-400 dark:text-slate-500 text-[10px] block">Fecha Límite Contractual</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">{r.fecha_prometida}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 dark:text-slate-500 text-[10px] block">Ventana Temporal</span>
                      <span className={`font-bold mt-0.5 block ${r.dias_disponibles < 0 ? 'text-red-600 dark:text-red-400' : 'text-blue-700 dark:text-blue-400'}`}>
                        {r.dias_disponibles < 0 ? `Vencida (-${Math.abs(r.dias_disponibles)} d)` : `${r.dias_disponibles} días disponibles`}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 dark:text-slate-500 text-[10px] block">Carga Restante en Taller</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">
                        {r.horas_restantes_estimadas}h (~{r.dias_habiles_requeridos} días hábiles)
                      </span>
                    </div>
                  </div>

                  {/* Etapa actual y Operario */}
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
                    <div>
                      <span className="text-slate-400 dark:text-slate-500 font-medium">Etapa en Taller: </span>
                      <b className="text-slate-900 dark:text-slate-100">{r.etapa_actual}</b>
                    </div>
                    <div>
                      <span className="text-slate-400 dark:text-slate-500 font-medium">Operario Asignado: </span>
                      <b className="text-slate-900 dark:text-slate-100">{r.operario_etapa}</b>
                    </div>
                  </div>

                  {/* Factores de Riesgo Identificados */}
                  <div className="space-y-1.5 bg-red-50/50 dark:bg-red-950/20 p-3 rounded-xl border border-red-100 dark:border-red-900/40">
                    <span className="font-bold text-red-900 dark:text-red-300 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                      <ShieldAlert className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                      Factores de Retraso Identificados por el Algoritmo Predictivo:
                    </span>
                    <ul className="space-y-1 pl-5 list-disc text-xs text-red-800 dark:text-red-200">
                      {r.factores_riesgo?.map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Plan de Acción Correctiva Recomendado */}
                  <div className="p-3.5 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 rounded-xl text-xs text-blue-950 dark:text-blue-200 space-y-1.5">
                    <div className="font-bold flex items-center gap-1.5 text-blue-900 dark:text-blue-300">
                      <Lightbulb className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                      <span>Acción Operativa Recomendada (Plan de Mitigación):</span>
                    </div>
                    <p className="font-semibold text-slate-900 dark:text-slate-100 pl-5">{r.accion_recomendada}</p>
                    {r.acciones_detalle?.length > 0 && (
                      <ul className="pl-9 list-disc text-slate-700 dark:text-slate-300 text-[11px] space-y-0.5">
                        {r.acciones_detalle.map((ad, idx) => (
                          <li key={idx}>{ad}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* PESTAÑA 3: COMPRAS ASISTIDAS E INSUMOS (3.6.3.3)               */}
      {/* ============================================================== */}
      {tab === 'compras' && (
        <div className="space-y-6">

          {/* Tarjetas KPI de Abastecimiento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between transition-colors">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase">Insumos en Alerta</span>
                <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-0.5">{compras.length}</p>
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">Bajo stock de seguridad</span>
              </div>
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl">
                <Package className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between transition-colors">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase">Inversión Estimada Sugerida</span>
                <p className="text-2xl font-extrabold text-blue-700 dark:text-blue-400 mt-0.5">
                  S/ {compras.reduce((sum, c) => sum + (c.inversion_estimada_pen || 0), 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                </p>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Reposición de lotes óptimos</span>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 rounded-xl">
                <ShoppingCart className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between transition-colors">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase">Quiebre Inmediato (0 Stock)</span>
                <p className="text-2xl font-extrabold text-red-600 dark:text-red-400 mt-0.5">
                  {compras.filter(c => c.stock_actual === 0).length}
                </p>
                <span className="text-[10px] text-red-600 dark:text-red-400 font-medium">Línea de producción parada</span>
              </div>
              <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-xl">
                <AlertOctagon className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between transition-colors">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase">Órdenes Protegidas</span>
                <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">{riesgos.length}</p>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Evita paradas no programadas</span>
              </div>
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Banner explicativo del algoritmo EOQ */}
          <div className="bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 rounded-xl p-4 text-xs text-blue-950 dark:text-blue-200 flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <p>
              <b>Motor de Recomendación Analítica:</b> Los lotes de reposición se calculan ponderando el déficit respecto al stock mínimo de seguridad, los consumos promedio y los tiempos de entrega (lead time) de los distribuidores para asegurar 30 días de cobertura continua.
            </p>
          </div>

          {/* Filtros por Categoría */}
          <div className="flex items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs transition-colors">
            <span className="font-bold text-slate-700 dark:text-slate-300">Filtrar por Categoría de Insumo:</span>
            <div className="flex gap-1.5 overflow-x-auto">
              {categoriasCompra.map(cat => (
                <button
                  key={cat}
                  onClick={() => setFiltroCategoriaCompra(cat)}
                  className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                    filtroCategoriaCompra === cat
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Cuadrícula de Insumos Sugeridos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {comprasFiltradas.length === 0 ? (
              <div className="col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 text-center text-slate-500 dark:text-slate-400 text-xs">
                No hay insumos pendientes de compra con el filtro seleccionado.
              </div>
            ) : (
              comprasFiltradas.map((c) => {
                const reqData = requisicionEnviada[c.material_id] || c.requerimiento_activo;
                const estaIngresado = reqData?.estado === 'Ingresado al Sistema';
                const estaImpreso = reqData?.estado?.includes('Impreso');

                return (
                  <div key={c.material_id} className={`bg-white dark:bg-slate-900 rounded-2xl border ${
                    estaIngresado 
                      ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/10' 
                      : reqData 
                        ? 'border-blue-300 dark:border-blue-800' 
                        : 'border-slate-200 dark:border-slate-800'
                  } shadow-sm p-6 space-y-4 hover:border-blue-300 dark:hover:border-blue-500/50 transition flex flex-col justify-between`}>
                    
                    <div className="space-y-3">
                      {/* Cabecera del Insumo */}
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">{c.sku}</span>
                          <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">{c.nombre}</h3>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">{c.categoria} • Ubicación: {c.ubicacion_almacen}</span>
                        </div>
                        {estaIngresado ? (
                          <span className="px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase border bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            <span>Ingresado a Almacén</span>
                          </span>
                        ) : estaImpreso ? (
                          <span className="px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase border bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-800 flex items-center gap-1">
                            <Printer className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                            <span>OC Impresa / En Compra</span>
                          </span>
                        ) : reqData ? (
                          <span className="px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase border bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                            <span>Pendiente de Compra</span>
                          </span>
                        ) : (
                          <span className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase border ${
                            c.prioridad.includes('Inmediata') || c.prioridad.includes('Crítica')
                              ? 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-200 dark:border-red-900/40'
                              : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-900/40'
                          }`}>
                            {c.prioridad}
                          </span>
                        )}
                      </div>

                      {/* Cuadrícula cuantitativa de Stock */}
                      <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-slate-850 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                        <div>Stock Actual: <b className={c.stock_actual <= c.stock_minimo ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-slate-100'}>{c.stock_actual} {c.unidad_medida}</b></div>
                        <div>Stock Mínimo: <b className="text-slate-900 dark:text-slate-100">{c.stock_minimo} {c.unidad_medida}</b></div>
                        <div>Lote a Comprar: <b className="text-blue-700 dark:text-blue-400 font-extrabold">{c.cantidad_sugerida} {c.unidad_medida}</b></div>
                        <div>Inversión Estimada: <b className="text-slate-900 dark:text-slate-100">S/ {c.inversion_estimada_pen.toFixed(2)}</b></div>
                      </div>

                      {/* Estado del Flujo y Déficit */}
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center justify-between gap-1 border-t border-slate-100 dark:border-slate-800 pt-2">
                        <span>Déficit de inventario: <b className="text-red-600 dark:text-red-400 font-bold">{c.deficit} {c.unidad_medida}</b></span>
                        {reqData ? (
                          <span>Orden: <b className="font-mono text-blue-600 dark:text-blue-400 font-bold">{reqData.codigo_req}</b></span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500">Sin orden emitida</span>
                        )}
                      </div>

                      {/* Justificación Analítica */}
                      <div className="p-3 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 rounded-xl text-xs text-amber-950 dark:text-amber-200">
                        <span className="font-bold flex items-center gap-1 text-[11px] text-amber-900 dark:text-amber-300 mb-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                          Justificación del Motor de IA:
                        </span>
                        <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-[11px]">{c.justificacion}</p>
                      </div>
                    </div>

                    {/* Botones de Gestión de Compra */}
                    {estaIngresado ? (
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 w-full pt-3 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-300 font-semibold">
                          <PackageCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span>Recibido: <b>{reqData.cantidad_recibida || reqData.cantidad} {c.unidad_medida}</b> • Doc: <b>{reqData.numero_factura || reqData.codigo_req}</b></span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDescargarPdfOC(c, reqData)}
                          className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                          title="Descargar copia oficial de la Orden de Compra"
                        >
                          <FileDown className="w-3.5 h-3.5 text-slate-500" />
                          <span>Copia PDF</span>
                        </button>
                      </div>
                    ) : reqData ? (
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 w-full pt-3 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-400 dark:text-slate-500">
                            Costo ref: S/ {c.costo_unitario.toFixed(2)} / {c.unidad_medida}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleDescargarPdfOC(c, reqData)}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                            title="Descargar e imprimir la Orden de Compra en PDF"
                          >
                            <FileDown className="w-3.5 h-3.5" />
                            <span>{reqData.impreso ? 'Reimprimir PDF' : 'Descargar PDF'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => abrirModalVerificarCompra(c, reqData)}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-emerald-500/20 transition cursor-pointer"
                            title="Verificar si ya se compró el material e ingresarlo al almacén"
                          >
                            <PackageCheck className="w-4 h-4" />
                            <span>Verificar Compra e Ingresar</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">Costo unit: S/ {c.costo_unitario.toFixed(2)} / {c.unidad_medida}</span>
                        <button
                          type="button"
                          onClick={() => handleGenerarRequerimiento(c)}
                          disabled={procesandoCompraId === c.material_id}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/20 transition cursor-pointer"
                        >
                          {procesandoCompraId === c.material_id ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Generando Orden...</span>
                            </>
                          ) : (
                            <>
                              <FileText className="w-3.5 h-3.5" />
                              <span>Generar Orden de Compra (PDF)</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: VERIFICACIÓN DE COMPRA E INGRESO AL ALMACÉN             */}
      {/* ============================================================== */}
      {modalVerificarCompra && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 transition-all">
            
            {/* Cabecera del Modal */}
            <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 p-6 text-white relative">
              <button
                type="button"
                onClick={() => setModalVerificarCompra(null)}
                className="absolute top-4 right-4 p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 text-emerald-100 text-xs font-semibold uppercase tracking-wider mb-1">
                <PackageCheck className="w-4 h-4 text-emerald-200" />
                <span>Recepción de Materiales • Almacén Central</span>
              </div>
              <h3 className="text-xl font-black flex items-center gap-2">
                <span>Verificar Compra e Ingresar a Almacén</span>
              </h3>
              <p className="text-xs text-emerald-100 mt-1">
                Orden de Compra: <span className="font-mono font-bold text-white">{modalVerificarCompra.req.codigo_req}</span>
              </p>
            </div>

            {/* Formulario de Verificación */}
            <form onSubmit={handleConfirmarIngresoAlmacen} className="p-6 space-y-4 text-xs">
              
              {/* Resumen del Material */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                    {modalVerificarCompra.item.sku || modalVerificarCompra.req.material_sku}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Solicitado: <b className="text-slate-800 dark:text-slate-200">{modalVerificarCompra.req.cantidad} {modalVerificarCompra.item.unidad_medida || modalVerificarCompra.req.unidad_medida}</b>
                  </span>
                </div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  {modalVerificarCompra.item.nombre || modalVerificarCompra.req.material_nombre}
                </h4>
                <p className="text-[11px] text-slate-500">
                  {modalVerificarCompra.item.categoria || modalVerificarCompra.req.categoria} • Ubicación: {modalVerificarCompra.item.ubicacion_almacen || 'Almacén Central'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Cantidad Recibida *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={verificarForm.cantidad_recibida}
                    onChange={(e) => setVerificarForm({ ...verificarForm, cantidad_recibida: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Costo Unitario Real (S/)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={verificarForm.costo_unitario_real}
                    onChange={(e) => setVerificarForm({ ...verificarForm, costo_unitario_real: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  N° Factura / Boleta / Guía de Compra *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. F001-004523 o Guía GR-002-8841"
                  value={verificarForm.numero_factura}
                  onChange={(e) => setVerificarForm({ ...verificarForm, numero_factura: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Observaciones de Recepción / Inspección Física
                </label>
                <textarea
                  rows="2"
                  placeholder="Material conforme, dimensiones verificadas, certificado de calidad recibido..."
                  value={verificarForm.observaciones}
                  onChange={(e) => setVerificarForm({ ...verificarForm, observaciones: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50 rounded-xl text-[11px] text-emerald-900 dark:text-emerald-300 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  Al confirmar, se aumentará automáticamente el <strong>Stock Actual</strong> en el inventario y se registrará un movimiento oficial de <strong>ENTRADA en el Kardex</strong>.
                </span>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalVerificarCompra(null)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoIngreso}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl font-bold shadow-md shadow-emerald-500/20 transition cursor-pointer flex items-center gap-1.5"
                >
                  {guardandoIngreso ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Ingresando a Almacén...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirmar Compra e Ingresar</span>
                    </>
                  )}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
