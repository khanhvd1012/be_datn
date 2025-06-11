import { Router } from "express";
import brandRouter from "./brand_RT";
import categoryRouter from "./category_RT";
import productRoute from "./product_RT";
import variantRouter from "./variant_RT";
import stockRouter from "./stock_RT";
import authRouter from "./auth_RT";
import cartRouter from "./cart_RT";
import orderRouter from "./order_RT";
import voucherRouter from "./voucher_RT";

const router = Router();

router.use("/auth", authRouter);
router.use("/brands", brandRouter);
router.use("/categories", categoryRouter);
router.use("/products",productRoute);
router.use("/variants", variantRouter);
router.use("/stocks", stockRouter);
router.use("/cart", cartRouter);   
router.use("/orders", orderRouter);
router.use("/vouchers", voucherRouter);

export default router;
