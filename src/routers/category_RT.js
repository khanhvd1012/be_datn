import { Router } from "express";
import { createCategory, deleteCategory, getAllCategories, getCategoryById, updateCategory } from "../controllers/category_CTL";
import { validateCategory } from "../validators/category_VLD";

const categoryRouter = Router();

categoryRouter.get("/", getAllCategories);
categoryRouter.get("/:id", getCategoryById);
categoryRouter.post("/", validateCategory, createCategory);
categoryRouter.put("/:id", validateCategory, updateCategory);
categoryRouter.delete("/:id", deleteCategory);

export default categoryRouter;