import { Router } from "express";
import { createOrder, getOrders, getOrderById, updateOrderStatus, cancelOrder, getAllOrders } from "../controllers/order_CTL";
import authMiddleware from "../middleware/auth_MID";

const orderRouter = Router();

// All order routes require authentication
orderRouter.post("/", authMiddleware, createOrder);
orderRouter.get("/", authMiddleware, getOrders);
orderRouter.get("/list", authMiddleware, getAllOrders)
orderRouter.get("/:id", authMiddleware, getOrderById);
orderRouter.put("/:id", authMiddleware, updateOrderStatus);
orderRouter.put("/:id/cancel", authMiddleware, cancelOrder);

export default orderRouter;
