import { Router } from "express";
import { getAllStock, updateStock, getAllStockHistory, deleteStockHistory, getOneStockHistory } from "../controllers/stock_CTL";
import { validateStockUpdate } from "../validators/stock_VLD";
import authMiddleware from "../middleware/auth_MID";
import checkRole from "../middleware/checkRole_MID";
import { ROLES } from "../config/roles";

const stockRouter = Router();

// Protected routes - Chỉ Admin và Employee mới có quyền quản lý kho
stockRouter.get("/", authMiddleware, checkRole(ROLES.ADMIN, ROLES.EMPLOYEE), getAllStock);
stockRouter.put("/:id", authMiddleware, checkRole(ROLES.ADMIN, ROLES.EMPLOYEE), validateStockUpdate, updateStock);
stockRouter.get("/history", authMiddleware, checkRole(ROLES.ADMIN, ROLES.EMPLOYEE), getAllStockHistory);
stockRouter.delete("/history/:id", authMiddleware, checkRole(ROLES.ADMIN, ROLES.EMPLOYEE), deleteStockHistory);
stockRouter.get("/:id", authMiddleware, checkRole(ROLES.ADMIN, ROLES.EMPLOYEE), getOneStockHistory);

export default stockRouter;