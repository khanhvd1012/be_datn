import { Router } from "express";
import { register, login, logout, getProfile, updateProfile } from "../controllers/auth_CTL";
import { validateRegister } from "../validators/auth_VLD";
import authMiddleware from "../middleware/auth_MID";

const AuthRouter = Router();
    
AuthRouter.post("/register", validateRegister, register);
AuthRouter.post("/login", login);
AuthRouter.post("/logout", authMiddleware, logout);
AuthRouter.get("/profile", authMiddleware, getProfile);
AuthRouter.put("/profile", authMiddleware, updateProfile);

export default AuthRouter;
