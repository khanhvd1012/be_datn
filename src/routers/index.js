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
import uploadRouter from "./upload_RT";
import sizeRouter from "./size_RT";
import colorRouter from "./color_RT";

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
router.use("/reviews", reviewRouter);
router.use("/upload", uploadRouter);
router.use("/sizes", sizeRouter);
router.use("/colors", colorRouter);

export default router;
