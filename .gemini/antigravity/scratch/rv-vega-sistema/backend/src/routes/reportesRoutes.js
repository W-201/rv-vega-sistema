import { Router } from 'express';
import { getReporteOTIF, getReporteCostos, getReporteOperarios } from '../controllers/reportesController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);
router.get('/otif', getReporteOTIF);
router.get('/costos', getReporteCostos);
router.get('/operarios', getReporteOperarios);

export default router;
