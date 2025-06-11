import mongoose from 'mongoose';

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
