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
<<<<<<< HEAD
import checkRole from "../middleware/checkRole_MID";
import { ROLES } from "../config/roles";
import { paginationHandler, sortHandler, searchHandler } from "../middleware/requestHandler_MID";
import { validateObjectId } from "../middleware/requestHandler_MID";
import { AppError } from "../middleware/errorHandler_MID";
=======
import { checkDuplicateProductColors } from "../middleware/products_MID";
>>>>>>> 1982ae5b937541c479889b7813204594075a6143

const productRouter = Router();

// Public routes - Có phân trang, sắp xếp và tìm kiếm
productRouter.get("/", 
    paginationHandler, 
    sortHandler, 
    searchHandler, 
    getAllProduct
);

<<<<<<< HEAD
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

// Protected routes - Chỉ Admin và Employee mới có quyền
productRouter.post("/", 
    authMiddleware, 
    checkRole(ROLES.ADMIN, ROLES.EMPLOYEE), 
    validateProduct, 
    createProduct
);

productRouter.put("/:id", 
    authMiddleware, 
    checkRole(ROLES.ADMIN, ROLES.EMPLOYEE), 
    validateObjectId('id'),
    validateProduct, 
    updateProduct
);

productRouter.delete("/:id", 
    authMiddleware, 
    checkRole(ROLES.ADMIN, ROLES.EMPLOYEE), 
    validateObjectId('id'),
    removeProduct
);
=======
// Protected routes (require authentication)
productRouter.post("/", validateProduct, checkDuplicateProductColors, createProduct);
productRouter.put("/:id", validateProduct, checkDuplicateProductColors, updateProduct);
productRouter.delete("/:id", removeProduct);
productRouter.get("/:id/variants", getProductVariants);
>>>>>>> 1982ae5b937541c479889b7813204594075a6143

export default productRouter;