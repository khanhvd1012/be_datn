import { Router } from "express";
import { createOrder, getOrderById, updateOrderStatus, cancelOrder, getAllOrderUser, getAllOrderAdmin, buyNowOrder, returnOrderByCustomer, getOrderByIdAdmin, requestReturn, confirmReceived, } from "../controllers/order_CTL";
import authMiddleware from "../middleware/auth_MID";
import checkRole from "../middleware/checkRole_MID";
import { ROLES } from "../config/roles";

const orderRouter = Router();

// All order routes require authentication
orderRouter.post("/", authMiddleware, createOrder);
orderRouter.get("/", authMiddleware, checkRole(ROLES.ADMIN, ROLES.EMPLOYEE), getAllOrderAdmin);
orderRouter.get("/user", authMiddleware, getAllOrderUser);
orderRouter.post("/buy-now", authMiddleware, buyNowOrder)
orderRouter.get("/:id", authMiddleware, getOrderById);
orderRouter.put("/:id", authMiddleware, updateOrderStatus);
orderRouter.put("/:id/cancel", authMiddleware, cancelOrder);
orderRouter.put("/:id/return", authMiddleware, returnOrderByCustomer);
orderRouter.get("/:id/admin", authMiddleware, checkRole(ROLES.ADMIN, ROLES.EMPLOYEE), getOrderByIdAdmin);
orderRouter.put("/:id/confirm-received", authMiddleware, confirmReceived);
orderRouter.put("/:id/request-return", authMiddleware, requestReturn);
export default orderRouter;