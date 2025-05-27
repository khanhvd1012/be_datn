import { Router } from "express";
import brandRouter from "./brand_RT";
import categoryRouter from "./category_RT";

const router = Router();

router.use("/brands", brandRouter);
router.use("/categorys", categoryRouter);

export default router;
