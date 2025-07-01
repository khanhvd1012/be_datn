import { Router } from "express";
import { createVariant, deleteVariant, getAllVariants, getVariantById, updateVariant } from "../controllers/variant_CTL";
import { validateVariant } from "../validators/variant_VLD";
import authMiddleware from "../middleware/auth_MID";
import checkRole from "../middleware/checkRole_MID";
import { ROLES } from "../config/roles";
// import { checkDuplicateVariant } from "../middleware/variant_MID";

const variantRouter = Router();

// Public routes
variantRouter.get("/", getAllVariants);
variantRouter.get("/:id", getVariantById);

// Protected routes (require authentication)
variantRouter.post("/", authMiddleware, checkRole(ROLES.ADMIN, ROLES.EMPLOYEE), validateVariant, createVariant);
variantRouter.put("/:id", authMiddleware, checkRole(ROLES.ADMIN, ROLES.EMPLOYEE), validateVariant, updateVariant);
variantRouter.delete("/:id", authMiddleware, checkRole(ROLES.ADMIN, ROLES.EMPLOYEE), deleteVariant);

export default variantRouter;