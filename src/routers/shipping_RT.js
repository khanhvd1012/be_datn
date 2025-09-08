import { Router } from "express";
import { getShippingFee, getGhnProvinces, getGhnDistricts, getGhnWards } from "../controllers/shipping_CTL";
import authMiddleware from "../middleware/auth_MID";

const shippingRouter = Router();

// Auth: cho phép cả khách lẫn user đã đăng nhập tính phí
shippingRouter.post("/fee", authMiddleware, getShippingFee);
shippingRouter.post("/provinces", authMiddleware, getGhnProvinces);
shippingRouter.post("/districts", authMiddleware, getGhnDistricts);
shippingRouter.post("/wards", authMiddleware, getGhnWards);

export default shippingRouter;
