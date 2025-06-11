import { Router } from "express";
import { createOder, getOrders, getOrderById, updateOrderStatus, cancelOrder } from "../controllers/oder_CTL";

const orderRouter = Router();

orderRouter.post("/create", createOder);
orderRouter.get("/", getOrders);
orderRouter.get("/:id", getOrderById);
orderRouter.put("/:id/status", updateOrderStatus);
orderRouter.put("/:id/cancel", cancelOrder);

export default orderRouter;
