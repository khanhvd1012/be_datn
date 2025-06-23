import { Router } from "express";
import { createCategory, getAllCategories, getCategoryById, updateCategory, deleteCategory } from "../controllers/category_CTL";
import { validateCategory } from "../validators/category_VLD";
import authMiddleware from "../middleware/auth_MID";
import checkRole from "../middleware/checkRole_MID";
import { ROLES } from "../config/roles";

const categoryRouter = Router();

// Public routes
categoryRouter.get("/", getAllCategories);
categoryRouter.get("/:id", getCategoryById);

// Protected routes - Chỉ Admin và Employee mới có quyền
categoryRouter.post("/", authMiddleware, checkRole(ROLES.ADMIN, ROLES.EMPLOYEE), validateCategory, createCategory);
categoryRouter.put("/:id", authMiddleware, checkRole(ROLES.ADMIN, ROLES.EMPLOYEE), validateCategory, updateCategory);
categoryRouter.delete("/:id", authMiddleware, checkRole(ROLES.ADMIN, ROLES.EMPLOYEE), deleteCategory);

export default categoryRouter;