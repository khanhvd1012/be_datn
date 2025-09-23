import { Router } from "express";
import { createOrder, getOrderById, updateOrderStatus, cancelOrder, getAllOrderUser, getAllOrderAdmin, buyNowOrder, returnOrderByCustomer, getOrderByIdAdmin, requestReturn, confirmReceived, updatePaymentStatus, calculateOrderTotal, } from "../controllers/order_CTL";
import authMiddleware from "../middleware/auth_MID";
import checkRole from "../middleware/checkRole_MID";
import { ROLES } from "../config/roles";
import upload from "../middleware/upload_MID";

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
orderRouter.put("/:id/request-return", authMiddleware, upload.array("images", 5), requestReturn);
orderRouter.put("/:id/update-payment",authMiddleware, checkRole(ROLES.ADMIN, ROLES.EMPLOYEE),updatePaymentStatus)
orderRouter.post("/calculate-voucher",authMiddleware,calculateOrderTotal)
export default orderRouter;