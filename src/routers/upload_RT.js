import express from 'express';
import upload from '../middleware/upload_MID.js';
import { uploadProductImages, uploadVariantImages, deleteImage } from '../controllers/upload_CTL.js';
import authMiddleware from '../middleware/auth_MID.js';

const router = express.Router();

// Routes cho upload ảnh sản phẩm
router.post('/product', 
    authMiddleware, 
    upload.array('images', 10), 
    uploadProductImages
);

// Routes cho upload ảnh biến thể
router.post('/variant', 
    authMiddleware, 
    upload.array('images', 10), 
    uploadVariantImages
);

// Route xóa ảnh
router.delete('/:type/:filename', 
    authMiddleware, 
    deleteImage
);

export default router;
