import brand_MD from "../models/brand_MD";
import category_MD from "../models/category_MD";

export const updateCategoryAndBrandOnProduct = async (req, res, next) => {
    try {
        const products = this;

        if(products.brand){
            await brand_MD.findByIdAndUpdate(products.brand, {
                $push: {
                    products: products._id
                }
            })
        }
        if(products.category){
            await category_MD.findByIdAndUpdate(products.category, {
                $push: {
                    products: products._id
                }
            })
        }
        next();
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "lỗi khi cập nhật danh mục và thương hiệu sản phẩm",
            error: error.message
        })
        next(error);
    }
}