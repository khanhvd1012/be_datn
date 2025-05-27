import { Router } from "express";
import brandRouter from "./brand_RT";
import categoryRouter from "./category_RT";
import productRoute from "./product_RT";

const router = Router();

router.use("/brands", brandRouter);
router.use("/categorys", categoryRouter);
router.use("/products",productRoute);

export default router;
