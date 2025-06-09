import { Router } from "express";
import brandRouter from "./brand_RT";
import categoryRouter from "./category_RT";
import productRoute from "./product_RT";
import variantRouter from "./variant_RT";
import stockRouter from "./stock_RT";

const router = Router();

router.use("/brands", brandRouter);
router.use("/categories", categoryRouter);
router.use("/products",productRoute);
router.use("/variants", variantRouter);
router.use("/stocks", stockRouter);

export default router;
