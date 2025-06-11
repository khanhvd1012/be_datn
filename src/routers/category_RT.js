import { Router } from "express";
import { createCategory, getAllCategories, getCategoryById, updateCategory, deleteCategory } from "../controllers/category_CTL";
import { validateCategory } from "../validators/category_VLD";
import authMiddleware from "../middleware/auth_MID";

const categoryRouter = Router();

// Public routes
categoryRouter.get("/", getAllCategories);
categoryRouter.get("/:id", getCategoryById);

// Protected routes (require authentication)
categoryRouter.post("/create", authMiddleware, validateCategory, createCategory);
categoryRouter.put("/:id", authMiddleware, validateCategory, updateCategory);
categoryRouter.delete("/:id", authMiddleware, deleteCategory);

export default categoryRouter;