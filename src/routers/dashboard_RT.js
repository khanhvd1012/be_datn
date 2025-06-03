import { Router } from "express";
import { getDashboardStats } from "../controllers/dashboard_CTL";

const dashboardRouter = Router();

dashboardRouter.get("/stats", getDashboardStats);

export default dashboardRouter;
