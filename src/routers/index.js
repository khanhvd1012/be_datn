import { Router } from "express";
import brandRouter from "./brand_RT";

const router = Router();

router.use("/brands", brandRouter);

export default router;
