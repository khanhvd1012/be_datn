import { Router } from "express";
import { createVoucher, getAllVouchers, getOneVoucher, updateVoucher, deleteVoucher } from "../controllers/voucher_CTL";
import { validateVoucher } from "../validators/voucher_VLD";
import authMiddleware from "../middleware/auth_MID";

const voucherRouter = Router();

// Public routes
voucherRouter.get("/", getAllVouchers);
voucherRouter.get("/:id", getOneVoucher);

// Protected routes (require authentication)
voucherRouter.post("/", authMiddleware, validateVoucher, createVoucher);
voucherRouter.put("/:id", authMiddleware, validateVoucher, updateVoucher);
voucherRouter.delete("/:id", authMiddleware, deleteVoucher);

export default voucherRouter;