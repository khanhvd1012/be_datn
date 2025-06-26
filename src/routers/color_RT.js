import { Router } from 'express';
import { getAll, getById, create, update, remove } from '../controllers/color_CTL.js';
import authMiddleware from '../middleware/auth_MID.js';
import checkRole from "../middleware/checkRole_MID";
import { ROLES } from '../config/roles.js';
import { validateColor } from '../validators/color_VLD.js';

const colorRouter = Router();

// Public routes
colorRouter.get('/', getAll);
colorRouter.get('/:id', getById);

// Protected routes (Admin only)
colorRouter.post('/', authMiddleware, checkRole(ROLES.ADMIN, ROLES.EMPLOYEE), validateColor, create);
colorRouter.put('/:id', authMiddleware, checkRole(ROLES.ADMIN, ROLES.EMPLOYEE), validateColor, update);
colorRouter.delete('/:id', authMiddleware, checkRole(ROLES.ADMIN, ROLES.EMPLOYEE), remove);

export default colorRouter;
