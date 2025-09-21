import { Router } from 'express';
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
import upload from '../middleware/upload_MID.js';

const Chatrouter = Router()

// Endpoint dành cho USER: Xem lịch sử trò chuyện (phòng chat duy nhất, tạo mới nếu cần)
Chatrouter.get('/user/history', authMiddleware, getMessageUser);

// Endpoint dành cho ADMIN: Xem danh sách tất cả phòng chat của các user
Chatrouter.get('/admin/rooms', authMiddleware, checkRole(ROLES.EMPLOYEE, ROLES.ADMIN), getMessageAdmin);

// Endpoint dành cho ADMIN: Xem lịch sử một phòng chat của user
Chatrouter.get('/admin/rooms/:chatRoomId', authMiddleware, checkRole(ROLES.EMPLOYEE, ROLES.ADMIN), getOneMessageUser);

// Endpoint dành cho USER: Gửi tin nhắn vào phòng chat duy nhất
Chatrouter.post('/user/send', authMiddleware, upload.array("images", 5), postMessageUser);

// Endpoint dành cho ADMIN: Gửi tin nhắn và tham gia phòng chat
Chatrouter.post('/admin/send/:chatRoomId', authMiddleware, checkRole(ROLES.EMPLOYEE, ROLES.ADMIN), postMessageAdmin);

// Endpoint dành cho ADMIN: Chỉnh sửa tin nhắn trong vòng 1 giờ
Chatrouter.put('/admin/message', authMiddleware, checkRole(ROLES.EMPLOYEE, ROLES.ADMIN), putMessage);

export default Chatrouter;