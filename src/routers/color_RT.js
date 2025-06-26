import { Router } from 'express';
import { getAll, getById, create, update, remove } from '../controllers/color_CTL.js';
import authMiddleware from '../middleware/auth_MID.js';
import checkRole from "../middleware/checkRole_MID";
import { validateColor } from '../validators/color_VLD.js';
import { ROLES } from '../config/roles.js';

const colorRouter = Router();

// Public routes
colorRouter.get('/', getAll);
colorRouter.get('/:id', getById);

// Protected routes (Admin only)
colorRouter.post('/', validateColor, create);
colorRouter.put('/:id', validateColor, update);
colorRouter.delete('/:id', remove);

export default colorRouter;
