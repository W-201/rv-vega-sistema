import { Router } from 'express';
import { getPedidos, getPedidoById, createPedido, updatePedidoEstado } from '../controllers/pedidosController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);
router.get('/', getPedidos);
router.get('/:id', getPedidoById);
router.post('/', createPedido);
router.patch('/:id/estado', updatePedidoEstado);

export default router;
