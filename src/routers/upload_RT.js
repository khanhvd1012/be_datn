import { Router } from "express";
import upload from "../middleware/upload_MID";
import { uploadImage } from "../controllers/upload_CTL";


const uploadRouter = Router();

uploadRouter.post('/', upload.single('image'), uploadImage);

export default uploadRouter;