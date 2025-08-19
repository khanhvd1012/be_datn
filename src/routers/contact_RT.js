import { Router } from "express";
import { createContact, deleteContact, getAllContacts } from "../controllers/contact_CTL.js";
import authMiddleware from "../middleware/auth_MID.js";
import { validateContact } from "../validators/contact_VLD.js";
import checkRole from "../middleware/checkRole_MID.js";
import { ROLES } from "../config/roles.js";

const contactRouter = Router();

// Gửi liên hệ: không bắt buộc phải đăng nhập
contactRouter.post("/", authMiddleware.optional, validateContact, createContact);
contactRouter.get("/", authMiddleware, getAllContacts)
contactRouter.delete("/:id", authMiddleware, checkRole(ROLES.ADMIN, ROLES.EMPLOYEE), deleteContact);

export default contactRouter;
