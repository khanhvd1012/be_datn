import { Router } from "express";
import { register, login, logout, getProfile, updateProfile, getShippingAddresses, setDefaultAddress, deleteAddress, getAllUsers, toggleAutoRestore, getAutoRestoreSettings, loginWithGoogle, requestLoginOTP, verifyLoginOTP, forgotPassword, resetPassword, changePassword } from "../controllers/auth_CTL";
import { validateRegister } from "../validators/auth_VLD";
import authMiddleware from "../middleware/auth_MID";
import upload from "../middleware/upload_MID";

const AuthRouter = Router();

AuthRouter.post("/register", validateRegister, register);
AuthRouter.post("/login", login);
AuthRouter.post("/logout", authMiddleware, logout);
AuthRouter.post("/google", loginWithGoogle);
AuthRouter.get("/profile", authMiddleware, getProfile);
AuthRouter.post("/login-otp-request", requestLoginOTP);
AuthRouter.post("/login-otp-verify", verifyLoginOTP);
AuthRouter.post("/forgot-password", forgotPassword);
AuthRouter.post("/reset-password", resetPassword);
AuthRouter.get("/user", authMiddleware, getAllUsers);
AuthRouter.put("/change-password", authMiddleware, changePassword);
AuthRouter.put("/profile/:id", authMiddleware, upload.single("image"),updateProfile);
AuthRouter.get("/shipping-addresses", authMiddleware, getShippingAddresses);
AuthRouter.put("/shipping-addresses/:address_id/default", authMiddleware, setDefaultAddress);
AuthRouter.delete("/shipping-addresses/:address_id", authMiddleware, deleteAddress);
AuthRouter.patch("/auto-restore",authMiddleware,toggleAutoRestore);
AuthRouter.get("/restore",authMiddleware,getAutoRestoreSettings);

export default AuthRouter;
