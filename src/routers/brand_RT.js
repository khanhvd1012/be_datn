import { Router } from "express";
import { createBrand, deleteBrand, getAllBrands, getBrandById, updateBrand } from "../controllers/brand_CTL";
import { validateCheckDuplicateBrand } from "../validators/brand_VLD";


const brandRouter = Router();

// brandRouter.get("/", (req, res) => {
//   res.json({ message: "Brands endpoint" });
// });

brandRouter.get('/', getAllBrands);
brandRouter.get('/:id', getBrandById);
brandRouter.post('/', createBrand, validateCheckDuplicateBrand);
brandRouter.put('/:id', updateBrand , validateCheckDuplicateBrand);
brandRouter.delete('/:id', deleteBrand);

export default brandRouter;