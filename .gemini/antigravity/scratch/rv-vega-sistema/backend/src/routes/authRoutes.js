import { Router } from 'express';
import { login, getProfile, listUsers } from '../controllers/authController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.post('/login', login);
router.get('/me', authenticateToken, getProfile);
router.get('/usuarios', authenticateToken, listUsers);

export default router;
