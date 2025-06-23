import { Router } from 'express';
import authMiddleware from '../middleware/auth_MID';
import {
    updateRestorePreference,
    updateAllRestorePreferences,
    getRemovedItems,
    updateRestoreExpiry
} from '../controllers/cartRestore_CTL';

const cartRestoreRouter = Router();

// Yêu cầu xác thực cho tất cả các routes
cartRestoreRouter.use(authMiddleware);

// Lấy danh sách sản phẩm đã xóa
cartRestoreRouter.get('/removed-items', getRemovedItems);

// Cập nhật tùy chọn tự động khôi phục cho một sản phẩm
cartRestoreRouter.patch('/:variant_id/auto-restore', updateRestorePreference);

// Cập nhật tùy chọn tự động khôi phục cho tất cả sản phẩm
cartRestoreRouter.patch('/auto-restore-all', updateAllRestorePreferences);

// Cập nhật thời hạn khôi phục cho một sản phẩm
cartRestoreRouter.patch('/:variant_id/expiry', updateRestoreExpiry);

export default cartRestoreRouter; 