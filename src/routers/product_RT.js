import { Router } from "express";
import { validateProduct } from "../validators/product_VLD";
import {
    getAllProduct,
    getOneProduct,
    createProduct,
    updateProduct,
    removeProduct,
    getProductVariants
} from "../controllers/product_CTL";
import authMiddleware from "../middleware/auth_MID";
import { checkDuplicateProductColors } from "../middleware/products_MID";

const productRouter = Router();

// Public routes
productRouter.get("/", getAllProduct);
productRouter.get("/:id", getOneProduct);

// Protected routes (require authentication)
productRouter.post("/", validateProduct, checkDuplicateProductColors, createProduct);
productRouter.put("/:id", validateProduct, checkDuplicateProductColors, updateProduct);
productRouter.delete("/:id", removeProduct);
productRouter.get("/:id/variants", getProductVariants);

export default productRouter;