import { Router } from 'express';
import {
    createSize,
    getAllSizes,
    getSizeById,
    updateSize,
    deleteSize
} from '../controllers/size_CTL.js';
import { validateSize } from '../validators/size_VLD.js';
import authMiddleware from '../middleware/auth_MID.js';

const sizeRouter = Router();

// Public routes
sizeRouter.get('/', authMiddleware, getAllSizes);
sizeRouter.get('/:id', authMiddleware, getSizeById);

// Protected routes (Admin only)
sizeRouter.post('/', authMiddleware, validateSize, createSize);
sizeRouter.put('/:id', authMiddleware, validateSize, updateSize);
sizeRouter.delete('/:id', authMiddleware, deleteSize);

export default sizeRouter;
