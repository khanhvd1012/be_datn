import variant_MD from "../models/variant_MD";



export const createVariant = async (req, res) => {
    try {
        // Tạo biến thể mới 
        const Variant = await variant_MD.create(req.body);
        res.status(201).json({
            message: 'Variant created successfully',
            data: Variant
        });

        // Tạo bản ghi tồn kho ban đầu
        const stock = await Stock.findById({
            product_variant_id: Variant._id,
            quantity: req.body.initial_stock || 0
        });

        // Ghi lại lịch sử nếu có số lượng ban đầu
        if (req.body.initial_stock) {
            await StockHistory.create({
                stock_id: stock._id,
                quantity: req.body.initial_stock,
                reason: 'Số lượng ban đầu',
            })
        }
        return res.status(201).json({
            message: 'Biến thể đã được tạo thành công',
            data: Variant
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: 'Đã xảy ra lỗi khi tạo biến thể',
            error: error.message
        });
    }
};
export const updateVariant = async (req, res) => {
    try {
        const variantId = await variant_MD.findByIdAndUpdate(req.params.id, req.body, { new: true });

        if (!variantId) {
            return res.status(404).json({ message: 'Biến thể không tồn tại' });
        }

        return res.status(200).json({
            message: 'Biến thể đã được cập nhật thành công',
            data: variantId
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: 'Đã xảy ra lỗi khi cập nhật biến thể',
            error: error.message
        });
    }
}

export const getAllVariants = async (req, res) => {
    try {
        const variant = await variant_MD.find().populate('products');

        // Thêm thông tin kho cho từng biến thể
        const variantsWithStock = await Promise.all(variant.map(async (item) => {
            const stock = await Stock.findOne({ product_variant_id: item._id });
            return {
                ...item.toObject(),
                stock: stock ? stock.quantity : 0
            };
        }));

        return res.status(200).json({
            message: 'Lấy danh sách biến thể thành công',
            data: variantsWithStock
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: 'Đã xảy ra lỗi khi lấy danh sách biến thể',
            error: error.message
        });
    }
}

export const getVariantById = async (req, res) => {
    try {
        const variant = await variant_MD.findById(req.params.id).populate('products');
        if (!variant) {
            return res.status(404).json({ message: 'Biến thể không tồn tại' });
        }

        const stock = await Stock.findOne({ product_variant_id: variant._id });
        return res.status(200).json({
            message: 'Lấy biến thể thành công',
            data: {
                ...variant.toObject(),
                stock: stock ? stock.quantity : 0
            }
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: 'Đã xảy ra lỗi khi lấy biến thể',
            error: error.message
        });
    }
}

export const deleteVariant = async (req, res) => {
    try {
        const variant = await variant_MD.findByIdAndDelete(req.params.id);
        if (!variant) {
            return res.status(404).json({ message: 'Biến thể không tồn tại' });
        }

        // Xóa các bản ghi liên quan trong kho và lịch sử kho nếu cần
        const stock = await Stock.findOneAndDelete({ product_variant_id: variant._id });
        if (stock) {
            await StockHistory.deleteMany({ stock_id: stock._id });
            await stock.remove();
        }
        return res.status(200).json({ message: 'Biến thể đã được xóa thành công' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: 'Đã xảy ra lỗi khi xóa biến thể',
            error: error.message
        });
    }
}

export const updateStock = async (req, res) => {
    try {
        const { quantity_change, reason } = req.body;
        const stock = await Stock.findOne({ product_variant_id: req.params.id });
        if (!stock) {
            return res.status(404).json({ message: 'Biến thể không tồn tại trong kho' });
        }

        if (stock.quantity += quantity_change < 0) {
            return res.status(400).json({ message: 'Số lượng kho không đủ để thực hiện thay đổi' });
        }
        stock.quantity += quantity_change;
        stock.last_updated = new Date();
        await stock.save();

        // Ghi lại lịch sử tồn kho
        await stockHistory.create({
            stock_id: stock._id,
            quantity_change,
            reason: reason || 'Cập nhật tồn kho'
        });

        return res.status(200).json({
            message: 'Cập nhật tồn kho thành công',
            data: stock
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: 'Đã xảy ra lỗi khi cập nhật tồn kho',
            error: error.message
        });
    }
}