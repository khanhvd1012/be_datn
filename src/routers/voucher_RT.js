import { Router } from "express";
import { createVoucher, getAllVouchers, getVoucherByCode, updateVoucher, deleteVoucher, applyVoucher } from "../controllers/voucher_CTL";

const voucherRouter = Router();

voucherRouter.post("/create", createVoucher);
voucherRouter.get("/", getAllVouchers);
voucherRouter.get("/:code", getVoucherByCode);
voucherRouter.put("/:id", updateVoucher);
voucherRouter.delete("/:id", deleteVoucher);
voucherRouter.post("/apply", applyVoucher);

export default voucherRouter;