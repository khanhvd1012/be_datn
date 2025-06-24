import { Router } from 'express';
import { getAll, getById, create, update, remove } from '../controllers/color_CTL.js';
import authMiddleware from '../middleware/auth_MID.js';
import { validateColor } from '../validators/color_VLD.js';

const colorRouter = Router();

// Public routes
colorRouter.get('/', authMiddleware, getAll);
colorRouter.get('/:id', authMiddleware, getById);

// Protected routes (Admin only)
colorRouter.post('/', authMiddleware, validateColor, create);
colorRouter.put('/:id', authMiddleware, validateColor, update);
colorRouter.delete('/:id', authMiddleware, remove);

export default colorRouter;
