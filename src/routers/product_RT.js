import { Router } from "express";
import { validateProduct } from "../validators/product_VLD";
import { 
    getAllProduct, 
    getOneProduct, 
    createProduct, 
    updateProduct, 
    removeProduct,
    getProductVariants
} from "../controllers/product_CTL";


const productRoute = Router();

productRoute.get("/", getAllProduct);
productRoute.get("/:id", getOneProduct);
productRoute.post("/", validateProduct, createProduct);
productRoute.put("/:id", validateProduct, updateProduct);
productRoute.delete("/:id", removeProduct);
productRoute.get("/:id/variants", getProductVariants);

export default productRoute;