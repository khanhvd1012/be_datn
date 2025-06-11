import { Router } from "express";
import { createVoucher, getAllVouchers, getVoucherByCode, updateVoucher, deleteVoucher, applyVoucher } from "../controllers/voucher_CTL";
import { validateVoucher } from "../validators/voucher_VLD";
import authMiddleware from "../middleware/auth_MID";

/**
 * Router xử lý các request liên quan đến voucher
 * Bao gồm các route:
 * - GET /: Lấy danh sách tất cả voucher
 * - GET /check/:code: Kiểm tra voucher theo mã code
 * - POST /create: Tạo voucher mới (yêu cầu xác thực)
 * - PUT /:id: Cập nhật voucher (yêu cầu xác thực)
 * - DELETE /:id: Xóa voucher (yêu cầu xác thực)
 * - POST /apply: Áp dụng voucher cho đơn hàng (yêu cầu xác thực)
 */
const voucherRouter = Router();

// Public routes
voucherRouter.get("/", getAllVouchers);
voucherRouter.get("/check/:code", getVoucherByCode);

// Protected routes (require authentication)
voucherRouter.post("/create", authMiddleware, validateVoucher, createVoucher);
voucherRouter.put("/:id", authMiddleware, validateVoucher, updateVoucher);
voucherRouter.delete("/:id", authMiddleware, deleteVoucher);
voucherRouter.post("/apply", authMiddleware, applyVoucher);

export default voucherRouter;