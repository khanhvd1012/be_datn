import { Router } from "express";
import { createBrand, getAllBrands, getBrandById, updateBrand, deleteBrand } from "../controllers/brand_CTL";
import { validateBrand } from "../validators/brand_VLD";
import authMiddleware from "../middleware/auth_MID";
import checkRole from "../middleware/checkRole_MID";
import { ROLES } from "../config/roles";

const brandRouter = Router();

// Public routes
brandRouter.get("/", getAllBrands);
brandRouter.get("/:id", getBrandById);

<<<<<<< HEAD
// Protected routes - Chỉ Admin và Employee mới có quyền
brandRouter.post("/", authMiddleware, checkRole(ROLES.ADMIN, ROLES.EMPLOYEE), validateBrand, createBrand);
brandRouter.put("/:id", authMiddleware, checkRole(ROLES.ADMIN, ROLES.EMPLOYEE), validateBrand, updateBrand);
brandRouter.delete("/:id", authMiddleware, checkRole(ROLES.ADMIN, ROLES.EMPLOYEE), deleteBrand);
=======
// Protected routes (require authentication)
brandRouter.post("/", authMiddleware, validateBrand, createBrand);
brandRouter.put("/:id", authMiddleware, validateBrand, updateBrand);
brandRouter.delete("/:id", authMiddleware, deleteBrand);
>>>>>>> 1982ae5b937541c479889b7813204594075a6143

export default brandRouter;