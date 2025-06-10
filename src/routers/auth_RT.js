import { Router } from "express";
import { register, login, logout } from "../controllers/auth_CTL";
import { checkTokenBlacklist } from "../middleware/checkToken_MID";

const AuthRouter = Router();

AuthRouter.post("/register", register);
AuthRouter.post("/login", login);
AuthRouter.post("/logout", checkTokenBlacklist, logout);

export default AuthRouter;
