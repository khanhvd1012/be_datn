import { Router } from "express";
import { validateProduct } from "../validators/product_VLD";
import {
    getAllProduct,
    getOneProduct,
    createProduct,
    updateProduct,
    removeProduct,
    getProductVariants,
    getProductBySlug,
    getRelatedProducts,
} from "../controllers/product_CTL";
import authMiddleware from "../middleware/auth_MID";
import checkRole from "../middleware/checkRole_MID";
import { ROLES } from "../config/roles";
import { paginationHandler, sortHandler, searchHandler } from "../middleware/requestHandler_MID";
import { validateObjectId } from "../middleware/requestHandler_MID";

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
productRouter.get("/:slug/related", getRelatedProducts);

// Protected routes - Chỉ Admin và Employee mới có quyền
productRouter.post("/",  
    validateProduct, 
    authMiddleware, 
    checkRole(ROLES.ADMIN, ROLES.EMPLOYEE),
    createProduct
);

productRouter.put("/:id",  
    validateObjectId('id'),
    validateProduct, 
    authMiddleware, 
    checkRole(ROLES.ADMIN, ROLES.EMPLOYEE),
    updateProduct
);

productRouter.delete("/:id",  
    validateObjectId('id'),
    authMiddleware, 
    checkRole(ROLES.ADMIN, ROLES.EMPLOYEE),
    removeProduct
);

export default productRouter;