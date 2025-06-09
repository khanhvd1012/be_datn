import { Router } from "express";
import mongoose from "mongoose";
import { createVariant, deleteVariant, getAllVariants, getVariantById, updateStock, updateVariant } from "../controllers/variant_CTL";
import { validateVariant } from "../validators/variant_VLD";

const variantRouter = Router();

variantRouter.get("/", getAllVariants);
variantRouter.get("/:id", getVariantById);
variantRouter.post("/", validateVariant, createVariant);
variantRouter.put("/:id", validateVariant, updateVariant);
variantRouter.delete("/:id", deleteVariant);
variantRouter.put("/:id/stock", updateStock);

export default variantRouter;