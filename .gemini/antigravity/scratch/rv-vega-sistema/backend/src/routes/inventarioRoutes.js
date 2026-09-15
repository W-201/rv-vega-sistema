import { Router } from 'express';
import { getMateriales, getKardex, createMaterial, registrarMovimiento } from '../controllers/inventarioController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);
router.get('/', getMateriales);
router.get('/kardex', getKardex);
router.post('/', createMaterial);
router.post('/movimiento', registrarMovimiento);

export default router;
