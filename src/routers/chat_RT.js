import express from 'express';
import { employeeReplyMessage } from '../services/geminiService.js';
import { customerSendMessage } from '../controllers/chat_CTL.js';
import authMiddleware from '../middleware/auth_MID.js';
import { ROLES } from '../config/roles.js';
import checkRole from '../middleware/checkRole_MID.js';
const router = express.Router();

// Gửi tin nhắn từ khách hàng (có xác thực)
router.post('/send', authMiddleware, customerSendMessage);
router.post('/reply', authMiddleware, checkRole(ROLES.EMPLOYEE, ROLES.ADMIN), employeeReplyMessage);

export default router;