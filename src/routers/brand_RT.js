import { Router } from "express";
import { createBrand, getAllBrands, getBrandById, updateBrand, deleteBrand } from "../controllers/brand_CTL";
import { validateBrand } from "../validators/brand_VLD";
import authMiddleware from "../middleware/auth_MID";

const brandRouter = Router();

// Public routes
brandRouter.get("/", getAllBrands);
brandRouter.get("/:id", getBrandById);

// Protected routes (require authentication)
brandRouter.post("/", authMiddleware, validateBrand, createBrand);
brandRouter.put("/:id", authMiddleware, validateBrand, updateBrand);
brandRouter.delete("/:id", authMiddleware, deleteBrand);

export default brandRouter;