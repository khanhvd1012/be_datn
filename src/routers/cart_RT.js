import { Router } from "express";
import { getOneCart, addToCart, updateCartItem, removeFromCart } from "../controllers/cart_CTL";

const cartRouter = Router( );

cartRouter.get("/", getOneCart);
cartRouter.post("/", addToCart);
cartRouter.put("/:id", updateCartItem);
cartRouter.delete("/:id", removeFromCart);

export default cartRouter;