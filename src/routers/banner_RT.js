import { Router } from "express";
import authMiddleware from "../middleware/auth_MID";
import checkRole from "../middleware/checkRole_MID";
import { ROLES } from "../config/roles";
import { createBanner, deleteBanner, getAllBanners, getBannerById, toggleBannerStatus, updateBanner } from "../controllers/banner_CTL";
import { validateBanner } from "../validators/banner_VLD";
import upload from "../middleware/upload_MID";

const bannerRouter = Router();

bannerRouter.get("/", getAllBanners);
bannerRouter.get("/:id", getBannerById);
bannerRouter.post("/", upload.single("image"), authMiddleware, checkRole(ROLES.ADMIN, ROLES.EMPLOYEE), validateBanner, createBanner);
bannerRouter.put("/:id", upload.single("image"), authMiddleware, checkRole(ROLES.ADMIN, ROLES.EMPLOYEE), validateBanner, updateBanner);
bannerRouter.delete("/:id", authMiddleware, checkRole(ROLES.ADMIN, ROLES.EMPLOYEE), deleteBanner);
bannerRouter.put("/:id/toggle-status", authMiddleware, checkRole(ROLES.ADMIN, ROLES.EMPLOYEE), toggleBannerStatus);

export default bannerRouter;