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

// Protected routes - Chỉ Admin và Employee mới có quyền
brandRouter.post("/", authMiddleware, checkRole(ROLES.ADMIN, ROLES.EMPLOYEE), validateBrand, createBrand);
brandRouter.put("/:id", authMiddleware, checkRole(ROLES.ADMIN, ROLES.EMPLOYEE), validateBrand, updateBrand);
brandRouter.delete("/:id", authMiddleware, checkRole(ROLES.ADMIN, ROLES.EMPLOYEE), deleteBrand);

export default brandRouter;