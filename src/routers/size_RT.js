import express from 'express';
import { 
    createSize, 
    getAllSizes, 
    getSizeById, 
    updateSize, 
    deleteSize 
} from '../controllers/size_CTL.js';
import { validateSize } from '../validators/size_VLD.js';
import checkPermission from '../middleware/auth_MID.js';

const router = express.Router();

// Public routes
router.get('/', getAllSizes);
router.get('/:id', getSizeById);

// Protected routes (Admin only)
router.post('/', validateSize, createSize);
router.put('/:id', validateSize, updateSize);
router.delete('/:id', deleteSize);

export default router;
