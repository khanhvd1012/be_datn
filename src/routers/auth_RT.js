import { Router } from "express";
import { register, login, logout, getProfile, updateProfile, getShippingAddresses, setDefaultAddress, deleteAddress } from "../controllers/auth_CTL";
import { validateRegister } from "../validators/auth_VLD";
import authMiddleware from "../middleware/auth_MID";

const AuthRouter = Router();

AuthRouter.post("/register", validateRegister, register);
AuthRouter.post("/login", login);
AuthRouter.post("/logout", authMiddleware, logout);
AuthRouter.get("/profile", authMiddleware, getProfile);
AuthRouter.put("/profile/:id", authMiddleware, updateProfile);
AuthRouter.get("/shipping-addresses", authMiddleware, getShippingAddresses);
AuthRouter.put("/shipping-addresses/:address_id/default", authMiddleware, setDefaultAddress);
AuthRouter.delete("/shipping-addresses/:address_id", authMiddleware, deleteAddress);

export default AuthRouter;
