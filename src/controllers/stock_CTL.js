import Stock_MD from "../models/stock_MD";
import variant_MD from "../models/variant_MD";
import stockHistory_MD from "../models/stockHistory_MD";
import Notification from "../models/notification_MD";

// Hằng số cho ngưỡng cảnh báo tồn kho thấp
const LOW_STOCK_THRESHOLD = 5;

export const getAllStock = async (req, res) => {
    try {
        const stock = await Stock_MD.find()
            .populate({
                path: 'product_variant_id',
                populate: [
                    {
                        path: 'product_id',
                        select: 'name'
                    },
                    {
                        path: 'color',
                        select: 'name'
                    },
                    {
                        path: 'size',
                        select: 'size'
                    }
                ],
                select: 'product_id sku color size'
            })
            .sort({ createdAt: -1 });

        // ✅ CHỈ kiểm tra và tạo thông báo low stock khi được gọi từ admin/employee
        // VÀ chỉ tạo 1 lần cho mỗi variant trong 24h
        if (req.user && (req.user.role === 'admin' || req.user.role === 'employee')) {
            const lowStockItems = stock.filter(item => item.quantity <= LOW_STOCK_THRESHOLD && item.quantity > 0);

            if (lowStockItems.length > 0) {
                for (const item of lowStockItems) {
                    const variant = item.product_variant_id;
                    const product = variant.product_id;

                    // ✅ Kiểm tra thông báo đã tồn tại trong 24h cho USER này và VARIANT này
                    const existingNotification = await Notification.findOne({
                        user_id: req.user._id, // ⭐ Quan trọng: kiểm tra theo user_id
                        type: 'low_stock',
                        'data.variant_id': variant._id,
                        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
                    });

                    if (!existingNotification) {
                        await Notification.create({
                            user_id: req.user._id,
                            title: 'Cảnh báo hàng tồn kho thấp',
                            message: `${product.name} - SKU: ${variant.sku} chỉ còn ${item.quantity} sản phẩm trong kho!`,
                            type: 'low_stock',
                            data: {
                                product_id: product._id,
                                variant_id: variant._id,
                                quantity: item.quantity
                            }
                        });
                    }
                }
            }
        }

        // Format lại data để trả về chỉ những thông tin cần thiết
        const formattedStock = stock.map(item => {
            const variant = item.product_variant_id;
            return {
                _id: item._id,
                sku: variant?.sku || 'N/A',
                quantity: item.quantity,
                color: variant?.color?.name || 'N/A',
                size: variant?.size?.size || 'N/A',
                product_name: variant?.product_id?.name || 'N/A',
                product_variant_id: item.product_variant_id,
                last_updated: item.last_updated,
                createdAt: item.createdAt
            };
        });

        res.status(200).json({
            message: 'Lấy tất cả thông tin kho thành công',
            data: formattedStock
        });
    } catch (error) {
        console.error('Lỗi khi lấy tất cả thông tin kho:', error);
        res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
    }
}

export const updateStock = async (req, res) => {
    try {
        const { quantity_change, reason } = req.body;

        const stock = await Stock_MD.findById(req.params.id);
        if (!stock) {
            return res.status(404).json({ message: 'Không tìm thấy thông tin tồn kho' });
        }

        // Lấy thông tin variant và product
        const variant = await variant_MD.findById(stock.product_variant_id).populate('product_id', 'name');
        if (!variant) {
            return res.status(404).json({ message: 'Không tìm thấy biến thể sản phẩm' });
        }

        const product = variant.product_id;
        const oldQuantity = stock.quantity;
        const newQuantity = stock.quantity + parseInt(quantity_change);

        // Không cho phép số lượng âm
        if (newQuantity < 0) {
            return res.status(400).json({ message: 'Số lượng tồn kho không thể âm' });
        }

        // Cập nhật số lượng
        stock.quantity = newQuantity;
        stock.last_updated = new Date();
        await stock.save();

        // Tạo lịch sử tồn kho
        await stockHistory_MD.create({
            stock_id: stock._id,
            quantity_change: quantity_change,
            reason: reason || 'Cập nhật số lượng',
            updated_by: req.user._id
        });

        // CHỈ tạo thông báo low stock khi:
        // 1. Số lượng mới <= ngưỡng cảnh báo
        // 2. Số lượng cũ > ngưỡng cảnh báo (tránh spam khi đã low stock)
        // 3. Số lượng mới > 0 (không cảnh báo khi hết hàng hoàn toàn)
        if (newQuantity <= LOW_STOCK_THRESHOLD && oldQuantity > LOW_STOCK_THRESHOLD && newQuantity > 0) {
            // Tạo thông báo cho tất cả admin và employee
            const User = await import('../models/user_MD').then(m => m.default);
            const adminsAndEmployees = await User.find({ role: { $in: ['admin', 'employee'] } });

            for (const user of adminsAndEmployees) {
                // Kiểm tra xem đã có thông báo tương tự chưa trong 24h
                const existingNotification = await Notification.findOne({
                    user_id: user._id,
                    type: 'low_stock',
                    'data.variant_id': stock.product_variant_id,
                    createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
                });

                if (!existingNotification) {
                    await Notification.create({
                        user_id: user._id,
                        title: 'Cảnh báo hàng tồn kho thấp',
                        message: `${product.name} - SKU: ${variant.sku} chỉ còn ${newQuantity} sản phẩm trong kho!`,
                        type: 'low_stock',
                        data: {
                            product_id: product._id,
                            variant_id: stock.product_variant_id,
                            quantity: newQuantity
                        }
                    });
                }
            }
        }

        // Nếu số lượng tồn kho bằng 0, cập nhật trạng thái thành outOfStock
        if (newQuantity === 0) {
            await variant_MD.findByIdAndUpdate(stock.product_variant_id, { status: 'outOfStock' });
        }

        // Nếu sản phẩm có hàng trở lại, cập nhật trạng thái thành inStock
        if (newQuantity > 0 && oldQuantity === 0) {
            await variant_MD.findByIdAndUpdate(stock.product_variant_id, { status: 'inStock' });
        }

        return res.status(200).json({
            message: 'Cập nhật số lượng tồn kho thành công',
            data: {
                stock,
                variant,
                product
            }
        });
    } catch (error) {
        console.error('Lỗi khi cập nhật số lượng tồn kho:', error);
        return res.status(500).json({
            message: 'Đã xảy ra lỗi khi cập nhật số lượng tồn kho',
            error: error.message
        });
    }
};

export const getOneStockHistory = async (req, res) => {
    try {
        const stock = await Stock_MD.findById(req.params.id);
        if (!stock) {
            return res.status(404).json({ message: 'Không tìm thấy thông tin tồn kho' });
        }

        const history = await stockHistory_MD.find({ stock_id: stock._id })
            .populate('updated_by', 'name role')
            .sort({ createdAt: -1 });

        return res.status(200).json({
            data: {
                current_stock: stock,
                history
            }
        });
    } catch (error) {
        console.error('Lỗi khi lấy lịch sử tồn kho:', error);
        return res.status(500).json({
            message: 'Đã xảy ra lỗi khi lấy lịch sử tồn kho',
            error: error.message
        });
    }
};

export const getAllStockHistory = async (req, res) => {
    try {
        // Lấy tất cả lịch sử kho và sắp xếp theo ngày tạo mới nhất
        const stockHistory = await stockHistory_MD.find()
            .populate('updated_by', 'username role')
            // .populate('stock_id', 'product_variant_id')
            .sort({ createdAt: -1 });

        return res.status(200).json({
            message: 'Lấy lịch sử kho thành công',
            data: stockHistory
        });
    } catch (error) {
        console.error('Lỗi khi lấy lịch sử kho:', error);
        return res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
    }
}

export const deleteStockHistory = async (req, res) => {
    try {
        const stockHistory = await stockHistory_MD.findByIdAndDelete(req.params.id);
        if (!stockHistory) {
            return res.status(404).json({ message: 'Không tìm thấy lịch sử kho' });
        }

        return res.status(200).json({
            message: 'Xóa lịch sử kho thành công',
            data: stockHistory
        });
    } catch (error) {
        console.error('Lỗi khi xóa lịch sử kho:', error);
        return res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
    }
}