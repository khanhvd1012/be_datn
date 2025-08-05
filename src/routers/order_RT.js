import { Router } from "express";
import { createOrder, getOrderById, updateOrderStatus, cancelOrder, getAllOrderUser, getAllOrderAdmin, createVNPAYPayment, zaloPayCallback, buyNowOrder, quickPreview, returnOrderByCustomer } from "../controllers/order_CTL";
import authMiddleware from "../middleware/auth_MID";
import checkRole from "../middleware/checkRole_MID";
import { ROLES } from "../config/roles";

const orderRouter = Router();

// All order routes require authentication
orderRouter.post("/", authMiddleware, createOrder);
orderRouter.get("/", authMiddleware, checkRole(ROLES.ADMIN, ROLES.EMPLOYEE), getAllOrderAdmin);
orderRouter.get("/user", authMiddleware, getAllOrderUser); 
orderRouter.get("/create-payment", authMiddleware, createVNPAYPayment); 
orderRouter.post("/payment/zalopay/callback", zaloPayCallback);
orderRouter.get("/:id", authMiddleware, getOrderById);
orderRouter.put("/:id", authMiddleware, updateOrderStatus);
orderRouter.put("/:id/cancel", authMiddleware, cancelOrder);
orderRouter.post("/buy-now",authMiddleware,buyNowOrder)
orderRouter.put(":id/return",authMiddleware,returnOrderByCustomer)

export default orderRouter;
