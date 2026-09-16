import { Router } from 'express';
import { getBIDashboard } from '../controllers/biController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);
router.get('/dashboard', getBIDashboard);

export default router;
