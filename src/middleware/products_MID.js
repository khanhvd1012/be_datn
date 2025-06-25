import mongoose from 'mongoose';
import Product from "../models/product_MD";

export const updateCategoryAndBrandOnProductSave = async function (next) {
    try {
        const product = this;

        // Chỉ thực hiện khi là document mới
        if (!product.isNew) return next();

        // Cập nhật Brand
        if (product.brand) {
            const brandUpdated = await mongoose.model('Brand').findByIdAndUpdate(
                product.brand,
                { $addToSet: { products: product._id } }, // dùng $addToSet để tránh trùng ID
                { new: true }
            );
            if (!brandUpdated) {
                throw new Error('Không tìm thấy brand để cập nhật');
            }
        }

        // Cập nhật Category
        if (product.category) {
            const categoryUpdated = await mongoose.model('Category').findByIdAndUpdate(
                product.category,
                { $addToSet: { products: product._id } },
                { new: true }
            );
            if (!categoryUpdated) {
                throw new Error('Không tìm thấy category để cập nhật');
            }
        }

        next();
    } catch (error) {
        next(new Error(`Lỗi khi cập nhật brand/category: ${error.message}`));
    }
};

export const checkDuplicateProductColors = async (req, res, next) => {
    try {
        const { colors } = req.body;
        
        // Nếu không có colors trong request, cho phép đi tiếp
        if (!colors || !Array.isArray(colors)) {
            return next();
        }

        // Kiểm tra xem có màu nào bị trùng trong mảng colors không
        const uniqueColors = new Set(colors);
        if (uniqueColors.size !== colors.length) {
            return res.status(400).json({
                message: "Các màu trong sản phẩm không được trùng lặp"
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
