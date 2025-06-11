import { Router } from "express";
import { addToCart, getOneCart, updateCartItem, removeFromCart } from "../controllers/cart_CTL";
import authMiddleware from "../middleware/auth_MID";

const cartRouter = Router();

// All cart routes require authentication
cartRouter.get("/", authMiddleware, getOneCart);
cartRouter.post("/add", authMiddleware, addToCart);
cartRouter.put("/update/:id", authMiddleware, updateCartItem);
cartRouter.delete("/remove/:id", authMiddleware, removeFromCart);

export default cartRouter;