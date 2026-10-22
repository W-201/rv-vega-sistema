import { Router } from 'express';
import { getMateriales, getKardex, createMaterial, updateMaterial, deleteMaterial, registrarMovimiento } from '../controllers/inventarioController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);
router.get('/', getMateriales);
router.get('/kardex', getKardex);
router.post('/', createMaterial);
router.put('/:id', updateMaterial);
router.delete('/:id', deleteMaterial);
router.post('/movimiento', registrarMovimiento);

export default router;
