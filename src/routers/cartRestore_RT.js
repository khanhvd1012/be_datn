import { Router } from 'express';
import authMiddleware from '../middleware/auth_MID';
import {
    toggleAutoRestore,
    getAutoRestoreSettings,
    getOutOfStockItems
} from '../controllers/cartRestore_CTL';


const cartRestoreRouter = Router();

cartRestoreRouter.use(authMiddleware);

// Lấy cài đặt hiện tại của user
cartRestoreRouter.get('/settings', getAutoRestoreSettings);
// Bật/tắt tính năng tự động khôi phục sản phẩm khi có hàng trở lại
cartRestoreRouter.post('/toggle-auto-restore', toggleAutoRestore);
// Lấy danh sách sản phẩm bị xóa do hết hàng
cartRestoreRouter.get('/', getOutOfStockItems);

export default cartRestoreRouter; 