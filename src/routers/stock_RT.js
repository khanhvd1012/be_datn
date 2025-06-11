import { Router } from "express";
import {getOneStock, getStockHistory, updateStock } from "../controllers/stock_CTL";
import { deleteStockHistory, getAllStockHistory, getStockHistoryById } from "../controllers/stockHistory_CTL";
import authMiddleware from "../middleware/auth_MID";


const stockRouter = Router();

stockRouter.get("/variant/:id", authMiddleware, getOneStock);
stockRouter.put("/variant/:id", authMiddleware, updateStock);
stockRouter.get("/variant/:id/history", authMiddleware, getStockHistory);

stockRouter.get("/history", authMiddleware, getAllStockHistory);
stockRouter.get("/history/:id", authMiddleware, getStockHistoryById);
stockRouter.delete("/history/:id", authMiddleware, deleteStockHistory);

export default stockRouter;