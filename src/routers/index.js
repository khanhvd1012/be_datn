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
import reviewRouter from "./review_RT";
import roleRouter from "./role_RT";
import notificationRouter from './notification_RT';
import cartRestoreRouter from './cartRestore_RT';
import colorRouter from "./color_RT";
import sizeRouter from "./size_RT";

const router = Router();

router.use("/auth", authRouter);
router.use("/brands", brandRouter);
router.use("/categories", categoryRouter);
router.use("/products",productRoute);
router.use("/variants", variantRouter);
router.use("/colors", colorRouter);
router.use("/sizes", sizeRouter)
router.use("/stocks", stockRouter);
router.use("/carts", cartRouter);   
router.use("/orders", orderRouter);
router.use("/vouchers", voucherRouter);
router.use("/reviews", reviewRouter);
router.use("/roles", roleRouter);
router.use('/notifications', notificationRouter);
router.use('/cart-restore', cartRestoreRouter);

export default router;
