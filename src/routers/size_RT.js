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
import checkRole from '../middleware/checkRole_MID.js';

const sizeRouter = Router();

// Public routes
sizeRouter.get('/', authMiddleware, getAllSizes);
sizeRouter.get('/:id', authMiddleware, getSizeById);

// Protected routes (Admin only)
sizeRouter.post('/', authMiddleware, checkRole(ROLES.ADMIN, ROLES.EMPLOYEE), validateSize, createSize);
sizeRouter.put('/:id', authMiddleware, checkRole(ROLES.ADMIN, ROLES.EMPLOYEE), validateSize, updateSize);
sizeRouter.delete('/:id', authMiddleware, checkRole(ROLES.ADMIN, ROLES.EMPLOYEE), deleteSize);

export default sizeRouter;
