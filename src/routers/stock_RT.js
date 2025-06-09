import { Router } from "express";
import {getOneStock, getStockHistory, updateStock } from "../controllers/stock_CTL";
import { deleteStockHistory, getAllStockHistory, getStockHistoryById } from "../controllers/stockHistory_CTL";


const stockRouter = Router();

stockRouter.get("/variant/:id", getOneStock);
stockRouter.put("/variant/:id", updateStock);
stockRouter.get("/variant/:id/history", getStockHistory);

stockRouter.get("/history", getAllStockHistory);
stockRouter.get("/history/:id", getStockHistoryById);
stockRouter.delete("/history/:id", deleteStockHistory);

export default stockRouter;