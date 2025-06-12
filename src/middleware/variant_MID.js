import mongoose from 'mongoose';
import Variant from "../models/variant_MD";

export const updateProductOnVariantSave = async function (next) {
    try {
        const variant = this;

        // Update product with total quantity
        await mongoose.model('Products').findByIdAndUpdate(
            variant.product_id,
            { 
                $inc: { totalQuantity: variant.quantity },
                $set: { status: variant.quantity > 0 ? 'inStock' : 'outOfStock' }
            }
        );

        // Update Size references
        await mongoose.model('Sizes').updateMany(
            { _id: { $in: variant.sizes } },
            { $addToSet: { products: variant.product_id } }
        );

        next();
    } catch (error) {
        next(new Error(`Lỗi khi cập nhật biến thể: ${error.message}`));
    }
};

export const checkDuplicateColor = async (req, res, next) => {
    try {
        const productId = req.body.product_id;
        const colorId = req.body.color_id;
        
        // Kiểm tra xem đã có biến thể nào của sản phẩm này sử dụng màu này chưa
        const existingVariant = await Variant.findOne({
            product_id: productId,
            color_id: colorId
        });

        if (existingVariant) {
            return res.status(400).json({
                message: "Màu sắc này đã tồn tại trong sản phẩm. Vui lòng chọn màu khác."
            });
        }

        next();
    } catch (error) {
        return res.status(500).json({
            message: "Lỗi khi kiểm tra màu sắc trùng lặp",
            error: error.message
        });
    }
};
