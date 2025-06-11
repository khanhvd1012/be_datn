import mongoose from 'mongoose';

export const checkDuplicateSKU = async (req, res, next) => {
    try {
        const { sku } = req.body;
        const { id: variantId } = req.params;

        // Nếu không có SKU thì bỏ qua kiểm tra
        if (!sku) return next();

        const query = { sku };
        if (variantId) {
            query._id = { $ne: variantId }; // Loại trừ variant hiện tại khi cập nhật
        }

        const existing = await mongoose.model('Variant').findOne(query).lean();

        if (existing) {
            return res.status(400).json({
                errors: [{
                    field: 'sku',
                    message: 'Mã SKU đã tồn tại trong hệ thống'
                }]
            });
        }

        next();
    } catch (error) {
        console.error('SKU check error:', error.message);
        return res.status(500).json({
            errors: [{
                field: 'server',
                message: 'Lỗi khi kiểm tra mã SKU'
            }]
        });
    }
};
