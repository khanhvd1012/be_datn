import { Router } from "express";
import authMiddleware from "../middleware/auth_MID";
import { createOder, getOrders, getOrderById, updateOrderStatus, cancelOrder } from "../controllers/order_CTL.js";

const orderRouter = Router();

// All order routes require authentication
<<<<<<< HEAD
orderRouter.post("/", authMiddleware, createOrder);
=======
orderRouter.post("/", authMiddleware, createOder);
>>>>>>> 1982ae5b937541c479889b7813204594075a6143
orderRouter.get("/", authMiddleware, getOrders);
orderRouter.get("/:id", authMiddleware, getOrderById);
orderRouter.put("/:id", authMiddleware, updateOrderStatus);
orderRouter.put("/:id/cancel", authMiddleware, cancelOrder);

export default orderRouter;
