import { Router } from "express";
import mongoose from "mongoose";
import { createVariant, deleteVariant, getAllVariants, getVariantById, updateStock, updateVariant } from "../controllers/variant_CTL";
import { validateVariant } from "../validators/variant_VLD";
import authMiddleware from "../middleware/auth_MID";
import { checkDuplicateSKU } from "../middleware/Duplicate_MID";
import { checkDuplicateColor } from "../middleware/variant_MID";


const variantRouter = Router();

// Public routes
variantRouter.get("/", getAllVariants);
variantRouter.get("/:id", getVariantById);

// Protected routes (require authentication)
variantRouter.post("/create", authMiddleware, validateVariant, checkDuplicateSKU, checkDuplicateColor, createVariant);
variantRouter.put("/:id", authMiddleware, validateVariant, checkDuplicateSKU, checkDuplicateColor, updateVariant);
variantRouter.delete("/:id", authMiddleware, deleteVariant);
variantRouter.put("/:id/stock", updateStock);

export default variantRouter;