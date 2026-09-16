import { Router } from 'express';
import { getPrediccionRiesgos, getSugerenciasCompras, chatAdvisor } from '../controllers/aiController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);
router.get('/riesgos', getPrediccionRiesgos);
router.get('/sugerencias-compras', getSugerenciasCompras);
router.post('/chat', chatAdvisor);

export default router;
