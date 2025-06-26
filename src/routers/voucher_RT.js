import { Router } from "express";
import { createVoucher, getAllVouchers, getOneVoucher, updateVoucher, deleteVoucher } from "../controllers/voucher_CTL";
import { validateVoucher } from "../validators/voucher_VLD";
import authMiddleware from "../middleware/auth_MID";
import checkRole from "../middleware/checkRole_MID";
import { ROLES } from "../config/roles";

const voucherRouter = Router();

// Public routes
voucherRouter.get("/", getAllVouchers);
voucherRouter.get("/:id", getOneVoucher);

// Protected routes (require authentication)
voucherRouter.post("/", authMiddleware,checkRole(ROLES.ADMIN, ROLES.EMPLOYEE), validateVoucher, createVoucher);
voucherRouter.put("/:id", authMiddleware,checkRole(ROLES.ADMIN, ROLES.EMPLOYEE), validateVoucher, updateVoucher);
voucherRouter.delete("/:id", authMiddleware,checkRole(ROLES.ADMIN, ROLES.EMPLOYEE), deleteVoucher);

export default voucherRouter;