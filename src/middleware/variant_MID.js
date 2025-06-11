import mongoose from 'mongoose';

export const updateProductOnVariantSave = async function (next) {
    try {
        const variant = this;

        // Chỉ thực hiện khi là document mới
        if (!variant.isNew) return next();

        // Cập nhật Variant (nếu cần set lại product_id rõ ràng)
        const updated = await mongoose.model('Variant').findByIdAndUpdate(
            variant._id,
            { $set: { product_id: variant.product_id } },
            { new: true }
        );

        if (!updated) {
            throw new Error('Không thể cập nhật thông tin biến thể (Variant)');
        }

        next();
    } catch (error) {
        next(new Error(`Lỗi khi cập nhật biến thể: ${error.message}`));
    }
};
