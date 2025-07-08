import { Router } from "express";
import { register, login, logout, getProfile, updateProfile, getShippingAddresses, setDefaultAddress, deleteAddress, getAllUsers } from "../controllers/auth_CTL";
import { validateRegister } from "../validators/auth_VLD";
import authMiddleware from "../middleware/auth_MID";
import upload from "../middleware/upload_MID";

const AuthRouter = Router();

AuthRouter.post("/register", validateRegister, register);
AuthRouter.post("/login", login);
AuthRouter.post("/logout", authMiddleware, logout);
AuthRouter.get("/profile", authMiddleware, getProfile);
AuthRouter.get("/user", authMiddleware, getAllUsers);
AuthRouter.put("/profile/:id", authMiddleware, upload.single("image"),updateProfile);
AuthRouter.get("/shipping-addresses", authMiddleware, getShippingAddresses);
AuthRouter.put("/shipping-addresses/:address_id/default", authMiddleware, setDefaultAddress);
AuthRouter.delete("/shipping-addresses/:address_id", authMiddleware, deleteAddress);

export default AuthRouter;
