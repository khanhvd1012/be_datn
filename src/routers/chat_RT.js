import express from 'express';
import { 
  getMessageUser,
  getMessageAdmin,
  getOneMessageUser,
  postMessageUser,
  postMessageAdmin,
  putMessage
} from '../controllers/chat_CTL.js';
import authMiddleware from '../middleware/auth_MID.js';
import checkRole from '../middleware/checkRole_MID.js';
import { ROLES } from '../config/roles.js';

const router = express.Router();

// Endpoint dành cho USER: Xem lịch sử trò chuyện (phòng chat duy nhất, tạo mới nếu cần)
router.get('/user/history', authMiddleware, getMessageUser);

// Endpoint dành cho ADMIN: Xem danh sách tất cả phòng chat của các user
router.get('/admin/rooms', authMiddleware, checkRole(ROLES.EMPLOYEE, ROLES.ADMIN), getMessageAdmin);

// Endpoint dành cho ADMIN: Xem lịch sử một phòng chat của user
router.get('/admin/rooms/:chatRoomId', authMiddleware, checkRole(ROLES.EMPLOYEE, ROLES.ADMIN), getOneMessageUser);

// Endpoint dành cho USER: Gửi tin nhắn vào phòng chat duy nhất
router.post('/user/send', authMiddleware, postMessageUser);

// Endpoint dành cho ADMIN: Gửi tin nhắn và tham gia phòng chat
router.post('/admin/send/:chatRoomId', authMiddleware, checkRole(ROLES.EMPLOYEE, ROLES.ADMIN), postMessageAdmin);

// Endpoint dành cho ADMIN: Chỉnh sửa tin nhắn trong vòng 1 giờ
router.put('/admin/message', authMiddleware, checkRole(ROLES.EMPLOYEE, ROLES.ADMIN), putMessage);

export default router;