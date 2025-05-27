import { Router } from "express";
import { createBrand, deleteBrand, getAllBrands, getBrandById, updateBrand } from "../controllers/brand_CTL";
import { validateCheckDuplicateBrand } from "../validators/brand_VLD";


const brandRouter = Router();

brandRouter.get('/', getAllBrands);
brandRouter.get('/:id', getBrandById);
brandRouter.post('/', validateCheckDuplicateBrand, createBrand);
brandRouter.put('/:id', validateCheckDuplicateBrand, updateBrand);
brandRouter.delete('/:id', deleteBrand);  // Fixed typo in :id

export default brandRouter;