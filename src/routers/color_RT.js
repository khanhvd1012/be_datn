import { Router } from 'express';
import { getAll, getById, create, update, remove } from '../controllers/color_CTL.js';
import authMiddleware from '../middleware/auth_MID.js';
import checkRole from "../middleware/checkRole_MID";
import { validateColor } from '../validators/color_VLD.js';

const colorRouter = Router();

// Public routes
colorRouter.get('/', authMiddleware, getAll);
colorRouter.get('/:id', authMiddleware, getById);

// Protected routes (Admin only)
colorRouter.post('/', authMiddleware, checkRole(ROLES.ADMIN, ROLES.EMPLOYEE), validateColor, create);
colorRouter.put('/:id', authMiddleware, checkRole(ROLES.ADMIN, ROLES.EMPLOYEE), validateColor, update);
colorRouter.delete('/:id', authMiddleware, checkRole(ROLES.ADMIN, ROLES.EMPLOYEE), remove);

export default colorRouter;
