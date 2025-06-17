import { Router } from "express";
import authMiddleware from "../middleware/auth_MID";
import { createOder, getOrders, getOrderById, updateOrderStatus, cancelOrder } from "../controllers/order_CTL.js";

const orderRouter = Router();

// All order routes require authentication
orderRouter.post("/", authMiddleware, createOder);
orderRouter.get("/", authMiddleware, getOrders);
orderRouter.get("/:id", authMiddleware, getOrderById);
orderRouter.put("/:id/status", authMiddleware, updateOrderStatus);
orderRouter.put("/:id/cancel", authMiddleware, cancelOrder);

export default orderRouter;
