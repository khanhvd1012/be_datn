import { Router } from "express";
import mongoose from "mongoose";
import { createVariant, deleteVariant, getAllVariants, getVariantById, updateVariant } from "../controllers/variant_CTL";

const variantRouter = Router();

variantRouter.get("/", getAllVariants);
variantRouter.get("/:id", getVariantById);
variantRouter.post("/", validateVariant, createVariant);
variantRouter.put("/:id", validateVariant, updateVariant);
variantRouter.delete("/:id", deleteVariant);

export default variantRouter;