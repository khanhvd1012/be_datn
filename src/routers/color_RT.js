import express from 'express';
import { getAll, getById, create, update, remove } from '../controllers/color_CTL.js';
import { checkPermission } from '../middleware/auth_MID.js';

const router = express.Router();

// Public routes
router.get('/', getAll);
router.get('/:id', getById);

// Protected routes (Admin only)
router.post('/', checkPermission, create);
router.put('/:id', checkPermission, update);
router.delete('/:id', checkPermission, remove);

export default router;
