import { Router } from "express";
import { createVariant, deleteVariant, getAllVariants, getVariantById, updateVariant } from "../controllers/variant_CTL";
import { validateVariant } from "../validators/variant_VLD";
import authMiddleware from "../middleware/auth_MID";
import checkRole from "../middleware/checkRole_MID";
import { ROLES } from "../config/roles";
import upload from "../middleware/upload_MID";

const variantRouter = Router();

// Public routes
variantRouter.get("/", getAllVariants);
variantRouter.get("/:id", getVariantById);

// Protected routes (require authentication)
variantRouter.post("/",
    authMiddleware,
    checkRole(ROLES.ADMIN, ROLES.EMPLOYEE),
    upload.array("images", 5),
    validateVariant,
    createVariant);
variantRouter.put("/:id",
    authMiddleware,
    checkRole(ROLES.ADMIN, ROLES.EMPLOYEE),
    upload.array("images", 5),
    validateVariant,
    updateVariant);
variantRouter.delete("/:id", authMiddleware, checkRole(ROLES.ADMIN, ROLES.EMPLOYEE), deleteVariant);

export default variantRouter;