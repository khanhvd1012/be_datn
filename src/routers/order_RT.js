import { Router } from "express";
import authMiddleware from "../middleware/auth_MID";
import { createOrder, getOrders, getOrderById, updateOrderStatus, cancelOrder } from "../controllers/order_CTL";

const orderRouter = Router();

// All order routes require authentication
orderRouter.post("/create", authMiddleware, createOrder);
orderRouter.get("/", authMiddleware, getOrders);
orderRouter.get("/:id", authMiddleware, getOrderById);
orderRouter.put("/:id/status", authMiddleware, updateOrderStatus);
orderRouter.put("/:id/cancel", authMiddleware, cancelOrder);

export default orderRouter;
