import { Router } from "express";
import { addToCart, getOneCart, updateCartItem, removeFromCart } from "../controllers/cart_CTL";
import authMiddleware from "../middleware/auth_MID";

const cartRouter = Router();

// All cart routes require authentication
cartRouter.get("/", authMiddleware, getOneCart);
cartRouter.post("/", authMiddleware, addToCart);
// Route cập nhật số lượng hàng loạt
cartRouter.put("/bulk", authMiddleware, updateCartItem);
// Route cập nhật số lượng đơn lẻ
cartRouter.put("/:id", authMiddleware, updateCartItem);
cartRouter.delete("/:id", authMiddleware, removeFromCart);

export default cartRouter;