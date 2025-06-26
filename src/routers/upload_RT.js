import { Router } from "express";
import upload from "../middleware/upload_MID";
import { deleteImage, getAllImages, uploadImage } from "../controllers/upload_CTL";


const uploadRouter = Router();

uploadRouter.get('/', getAllImages);
uploadRouter.post('/', upload.array('images', 10), uploadImage);
uploadRouter.delete("/:id", deleteImage); 

export default uploadRouter;