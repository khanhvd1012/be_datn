import { Router } from "express";
import authMiddleware from "../middleware/auth_MID";
import checkRole from "../middleware/checkRole_MID";
import { ROLES } from "../config/roles";
import upload from "../middleware/upload_MID";
import { createNews, deleteNews, getAllNews, getNewsById, updateNews } from "../controllers/news_CTL";
import { validateNews } from "../validators/news_VLD";

const newsRouter = Router();

newsRouter.get("/", getAllNews);
newsRouter.get("/:id", getNewsById);
newsRouter.post("/", upload.array("images", 5), authMiddleware, checkRole(ROLES.ADMIN, ROLES.EMPLOYEE), validateNews, createNews);
newsRouter.put("/:id", upload.array("images", 5), authMiddleware, checkRole(ROLES.ADMIN, ROLES.EMPLOYEE), validateNews, updateNews);
newsRouter.delete("/:id", authMiddleware, checkRole(ROLES.ADMIN, ROLES.EMPLOYEE), deleteNews);

export default newsRouter;