import { Router } from "express";
import { validateProduct } from "../validators/product_VLD";
import {
    getAllProduct,
    getOneProduct,
    createProduct,
    updateProduct,
    removeProduct,
    getProductVariants,
    getProductBySlug
} from "../controllers/product_CTL";
import authMiddleware from "../middleware/auth_MID";
import checkRole from "../middleware/checkRole_MID";
import { ROLES } from "../config/roles";
import { paginationHandler, sortHandler, searchHandler } from "../middleware/requestHandler_MID";
import { validateObjectId } from "../middleware/requestHandler_MID";
import { AppError } from "../middleware/errorHandler_MID";

const productRouter = Router();

// Public routes - Có phân trang, sắp xếp và tìm kiếm
productRouter.get("/", 
    paginationHandler, 
    sortHandler, 
    searchHandler, 
    getAllProduct
);

// Lấy chi tiết sản phẩm - Validate ID
productRouter.get("/:id", 
    validateObjectId('id'),
    getOneProduct
);

// Lấy danh sách biến thể của sản phẩm - Validate ID
productRouter.get("/:id/variants", 
    validateObjectId('id'),
    getProductVariants
);

// Lấy chi tiết sản phẩm theo slug
productRouter.get("/slug/:slug", getProductBySlug);

// Protected routes - Chỉ Admin và Employee mới có quyền
productRouter.post("/",  
    validateProduct, 
    createProduct
);

productRouter.put("/:id",  
    validateObjectId('id'),
    validateProduct, 
    updateProduct
);

productRouter.delete("/:id",  
    validateObjectId('id'),
    removeProduct
);

export default productRouter;