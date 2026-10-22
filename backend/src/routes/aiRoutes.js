import { Router } from 'express';
import { 
  getPrediccionRiesgos, 
  getSugerenciasCompras, 
  getSugerenciasPreguntas,
  chatAdvisor,
  crearRequerimientoCompra,
  getRequerimientosCompras,
  marcarRequerimientoImpresoCtrl,
  ingresarCompraAlmacenCtrl,
  getChatHistorial,
  limpiarChatHistorial
} from '../controllers/aiController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

// 3.6.3.2 Algoritmo predictivo de detección de retrasos
router.get('/riesgos', getPrediccionRiesgos);

// 3.6.3.3 Motor de recomendación analítica para compras asistidas
router.get('/sugerencias-compras', getSugerenciasCompras);
router.get('/compras/requerimientos', getRequerimientosCompras);
router.post('/compras/requerimiento', crearRequerimientoCompra);
router.patch('/compras/requerimientos/:id/impreso', marcarRequerimientoImpresoCtrl);
router.post('/compras/requerimientos/:id/ingresar', ingresarCompraAlmacenCtrl);

// 3.6.3.4 Sugerencias dinámicas de preguntas frecuentes (cuellos de botella, OEE, etc.)
router.get('/sugerencias-preguntas', getSugerenciasPreguntas);

// 3.6.3.1 Procesamiento de lenguaje natural del copiloto de planta
router.post('/chat', chatAdvisor);
router.get('/chat/historial', getChatHistorial);
router.delete('/chat/historial', limpiarChatHistorial);

export default router;
