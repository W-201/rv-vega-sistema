import { Router } from 'express';
import { 
  getOrdenesProduccion, 
  getCalculoTiemposProduccion,
  getOrdenById, 
  createOrdenProduccion, 
  updateOrdenEstado,
  updateEtapa, 
  addParadaProduccion, 
  addControlCalidad 
} from '../controllers/produccionController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);
router.get('/', getOrdenesProduccion);
router.get('/tiempos', getCalculoTiemposProduccion);
router.get('/:id', getOrdenById);
router.post('/', createOrdenProduccion);
router.patch('/:id/estado', updateOrdenEstado);
router.patch('/etapas/:etapaId', updateEtapa);
router.post('/paradas', addParadaProduccion);
router.post('/calidad', addControlCalidad);

export default router;
