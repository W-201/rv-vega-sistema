import { 
  predecirRiesgosProduccion, 
  sugerirComprasInteligentes, 
  responderChatAdvisor, 
  obtenerSugerenciasDinamicas, 
  registrarRequerimientoCompra 
} from '../services/aiService.js';
import { getDb, saveStore } from '../config/db.js';

export async function getPrediccionRiesgos(req, res) {
  try {
    const riesgos = await predecirRiesgosProduccion();
    res.json(riesgos);
  } catch (err) {
    res.status(500).json({ error: 'Error en análisis de riesgos de IA: ' + err.message });
  }
}

export function getSugerenciasCompras(req, res) {
  try {
    const sugerencias = sugerirComprasInteligentes();
    res.json(sugerencias);
  } catch (err) {
    res.status(500).json({ error: 'Error al sugerir compras con IA: ' + err.message });
  }
}

export function getSugerenciasPreguntas(req, res) {
  try {
    const datos = obtenerSugerenciasDinamicas();
    res.json(datos);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener sugerencias dinámicas: ' + err.message });
  }
}

export async function chatAdvisor(req, res) {
  try {
    const { mensaje } = req.body;
    if (!mensaje || !mensaje.trim()) {
      return res.status(400).json({ error: 'El mensaje no puede estar vacío' });
    }

    const respuesta = await responderChatAdvisor(mensaje);

    const db = getDb();
    if (!db.ai_logs) db.ai_logs = [];

    const newLog = {
      id: db.ai_logs.length + 1,
      tipo: 'chat_advisor',
      consulta: mensaje,
      respuesta,
      usuario_id: req.user?.id || 1,
      usuario_nombre: req.user?.nombre || 'Usuario',
      fecha: new Date().toISOString()
    };
    db.ai_logs.push(newLog);
    saveStore();

    res.json({ 
      respuesta, 
      fecha: newLog.fecha,
      hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
  } catch (err) {
    res.status(500).json({ error: 'Error en respuesta de IA: ' + err.message });
  }
}

export function crearRequerimientoCompra(req, res) {
  try {
    const { material_id, cantidad, justificacion } = req.body;
    if (!material_id || !cantidad) {
      return res.status(400).json({ error: 'material_id y cantidad son obligatorios' });
    }

    const reqCreado = registrarRequerimientoCompra(
      material_id, 
      cantidad, 
      justificacion, 
      req.user?.id || 1
    );

    res.status(201).json({
      mensaje: 'Requerimiento de compra registrado con éxito',
      requerimiento: reqCreado,
      aviso_proveedor: reqCreado.aviso_proveedor
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al generar requerimiento: ' + err.message });
  }
}

export function getChatHistorial(req, res) {
  try {
    const db = getDb();
    const logs = (db.ai_logs || []).slice(-20);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: 'Error al recuperar historial: ' + err.message });
  }
}

export function limpiarChatHistorial(req, res) {
  try {
    const db = getDb();
    db.ai_logs = [];
    saveStore();
    res.json({ mensaje: 'Historial de chat limpiado' });
  } catch (err) {
    res.status(500).json({ error: 'Error al limpiar historial: ' + err.message });
  }
}
