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
        
        if (!productId || !colorId) {
            res.status(400).json({
                message: "product_id và color_id là bắt buộc"
            });
            return;
        }

        // Kiểm tra xem đã có biến thể nào của sản phẩm này sử dụng màu này chưa
        const query = {
            product_id: productId,
            color_id: colorId
        };

        // Nếu đang update, loại trừ variant hiện tại
        if (req.params.id) {
            query._id = { $ne: req.params.id };
        }

        const existingVariant = await Variant.findOne(query);

        if (existingVariant) {
            res.status(400).json({
                message: "Màu sắc này đã tồn tại trong sản phẩm. Vui lòng chọn màu khác."
            });
            return;
        }

        next();
    } catch (error) {
        res.status(500).json({
            message: "Lỗi khi kiểm tra màu sắc trùng lặp",
            error: error.message
        });
        return;
    }
};

export const checkDuplicateSKU = async (req, res, next) => {
    try {
        const { sku } = req.body;
        
        if (!sku) {
            res.status(400).json({
                message: "SKU là bắt buộc"
            });
            return;
        }

        const trimmedSku = sku.trim();
        // Kiểm tra SKU trùng lặp, không phân biệt chữ hoa/thường
        const query = {
            sku: new RegExp('^' + trimmedSku.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i')
        };

        // Nếu đang update, loại trừ variant hiện tại
        if (req.params.id) {
            query._id = { $ne: req.params.id };
        }

        const existingVariant = await Variant.findOne(query);

        if (existingVariant) {
            res.status(400).json({
                message: "SKU đã tồn tại. Vui lòng sử dụng SKU khác."
            });
            return;
        }

        next();
    } catch (error) {
        res.status(500).json({
            message: "Lỗi khi kiểm tra SKU trùng lặp",
            error: error.message
        });
        return;
    }
};
