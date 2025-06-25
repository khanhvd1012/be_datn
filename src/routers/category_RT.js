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

<<<<<<< HEAD
// Protected routes - Chỉ Admin và Employee mới có quyền
categoryRouter.post("/", authMiddleware, checkRole(ROLES.ADMIN, ROLES.EMPLOYEE), validateCategory, createCategory);
categoryRouter.put("/:id", authMiddleware, checkRole(ROLES.ADMIN, ROLES.EMPLOYEE), validateCategory, updateCategory);
categoryRouter.delete("/:id", authMiddleware, checkRole(ROLES.ADMIN, ROLES.EMPLOYEE), deleteCategory);
=======
// Protected routes (require authentication)
categoryRouter.post("/", authMiddleware, validateCategory, createCategory);
categoryRouter.put("/:id", authMiddleware, validateCategory, updateCategory);
categoryRouter.delete("/:id", authMiddleware, deleteCategory);
>>>>>>> 1982ae5b937541c479889b7813204594075a6143

export default categoryRouter;