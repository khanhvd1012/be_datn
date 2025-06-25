import { Router } from "express";
import { createVariant, deleteVariant, getAllVariants, getVariantById, updateVariant } from "../controllers/variant_CTL";
import { validateVariant } from "../validators/variant_VLD";
import authMiddleware from "../middleware/auth_MID";
<<<<<<< HEAD
// import { checkDuplicateVariant } from "../middleware/variant_MID";
=======
import { checkDuplicateSKU, checkDuplicateColor } from "../middleware/variant_MID";

>>>>>>> 1982ae5b937541c479889b7813204594075a6143

const variantRouter = Router();

// Public routes
variantRouter.get("/", getAllVariants);
variantRouter.get("/:id", getVariantById);

// Protected routes (require authentication)
<<<<<<< HEAD
variantRouter.post("/", authMiddleware, validateVariant, createVariant);
variantRouter.put("/:id", authMiddleware, validateVariant, updateVariant);
=======
variantRouter.post("/create", authMiddleware, validateVariant, checkDuplicateSKU, checkDuplicateColor, createVariant);
variantRouter.put("/:id", authMiddleware, validateVariant, checkDuplicateSKU, checkDuplicateColor, updateVariant);
>>>>>>> 1982ae5b937541c479889b7813204594075a6143
variantRouter.delete("/:id", authMiddleware, deleteVariant);

export default variantRouter;