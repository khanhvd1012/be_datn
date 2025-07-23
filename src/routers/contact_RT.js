import { Router } from "express";
import { createContact, getAllContacts } from "../controllers/contact_CTL.js";
import authMiddleware from "../middleware/auth_MID.js";
import { validateContact } from "../validators/contact_VLD.js";

const contactRouter = Router();

// Gửi liên hệ: không bắt buộc phải đăng nhập
contactRouter.post("/", authMiddleware.optional, validateContact, createContact);
contactRouter.get("/", authMiddleware, getAllContacts)

export default contactRouter;
