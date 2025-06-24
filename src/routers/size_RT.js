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
sizeRouter.get('/', getAllSizes);
sizeRouter.get('/:id', getSizeById);

// Protected routes (Admin only)
sizeRouter.post('/', validateSize, createSize);
sizeRouter.put('/:id', validateSize, updateSize);
sizeRouter.delete('/:id', deleteSize);

export default sizeRouter;
