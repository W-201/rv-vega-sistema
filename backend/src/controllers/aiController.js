import { predecirRiesgosProduccion, sugerirComprasInteligentes, responderChatAdvisor } from '../services/aiService.js';
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

export async function chatAdvisor(req, res) {
  try {
    const { mensaje } = req.body;
    if (!mensaje) return res.status(400).json({ error: 'El mensaje no puede estar vacío' });

    const respuesta = await responderChatAdvisor(mensaje);

    const db = getDb();
    const newLog = {
      id: (db.ai_logs?.length || 0) + 1,
      tipo: 'chat_advisor',
      consulta: mensaje,
      respuesta,
      usuario_id: req.user?.id || 1,
      fecha: new Date().toISOString()
    };
    if (!db.ai_logs) db.ai_logs = [];
    db.ai_logs.push(newLog);
    saveStore();

    res.json({ respuesta, fecha: newLog.fecha });
  } catch (err) {
    res.status(500).json({ error: 'Error en respuesta de IA: ' + err.message });
  }
}
