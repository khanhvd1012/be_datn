import { Router } from "express";
import brandRouter from "./brand_RT";
import categoryRouter from "./category_RT";
import productRoute from "./product_RT";
import dashboardRouter from "./dashboard_RT";

const router = Router();

router.use("/brands", brandRouter);
router.use("/categories", categoryRouter);
router.use("/products",productRoute);
router.use("/dashboard", dashboardRouter);

export default router;
