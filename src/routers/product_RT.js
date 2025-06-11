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

const productRouter = Router();

// Public routes
productRouter.get("/", getAllProduct);
productRouter.get("/:id", getOneProduct);

// Protected routes (require authentication)
productRouter.post("/create", authMiddleware, validateProduct, createProduct);
productRouter.put("/:id", authMiddleware, validateProduct, updateProduct);
productRouter.delete("/:id", authMiddleware, removeProduct);
productRouter.get("/:id/variants", getProductVariants);

export default productRouter;