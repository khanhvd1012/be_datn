import { Router } from 'express';
import {
    getAllNotifications,
    getLowStockNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllRead
} from '../controllers/notification_CTL';
import authMiddleware from '../middleware/auth_MID';
import checkRole from '../middleware/checkRole_MID';
import { ROLES } from '../config/roles';

const notificationRouter = Router();

// Middleware xác thực cho tất cả routes
notificationRouter.use(authMiddleware);

// Routes cho tất cả users
notificationRouter.get('/', getAllNotifications);
notificationRouter.put('/:id/read', markAsRead);
notificationRouter.put('/read-all', markAllAsRead);
notificationRouter.delete('/:id', deleteNotification);
notificationRouter.delete('/read/all', deleteAllRead);

// Routes cho admin và employee
notificationRouter.get('/low-stock', checkRole(ROLES.ADMIN, ROLES.EMPLOYEE), getLowStockNotifications);

export default notificationRouter; 