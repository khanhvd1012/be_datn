import Stock_MD from "../models/stock_MD";
import variant_MD from "../models/variant_MD";
import stockHistory_MD from "../models/stockHistory_MD";
import CartItem from "../models/cartItem_MD";
import Cart from "../models/cart_MD";
import RemovedCartItem from "../models/removedCartItem_MD";
import Notification from "../models/notification_MD";
import User from "../models/auth_MD";

// Hằng số cho ngưỡng cảnh báo tồn kho thấp
const LOW_STOCK_THRESHOLD = 5;

export const getAllStock = async (req, res) => {
    try {
        const stock = await Stock_MD.find()
            .populate({
                path: 'product_variant_id',
                populate: {
                    path: 'product_id',
                    select: 'name'
                },
                select: 'color size product_id'
            });

        // Kiểm tra role của user
        if (req.user && (req.user.role === 'admin' || req.user.role === 'employee')) {
            // Lọc các sản phẩm có tồn kho thấp
            const lowStockItems = stock.filter(item => item.quantity <= LOW_STOCK_THRESHOLD);

            if (lowStockItems.length > 0) {
                // Tạo thông báo cho từng sản phẩm sắp hết hàng
                for (const item of lowStockItems) {
                    const variant = item.product_variant_id;
                    const product = variant.product_id;

                    // Kiểm tra xem đã có thông báo tương tự chưa
                    const existingNotification = await Notification.findOne({
                        type: 'low_stock',
                        'data.variant_id': variant._id,
                        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Trong vòng 24h
                    });

                    if (!existingNotification) {
                        await Notification.create({
                            user_id: req.user._id,
                            title: 'Cảnh báo hàng tồn kho thấp',
                            message: `${product.name} - ${variant.color} size ${variant.size} sắp hết hàng (còn ${item.quantity} sản phẩm)`,
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

        res.status(200).json({
            message: 'Lấy tất cả thông tin kho thành công',
            data: stock
        });
    } catch (error) {
        console.error('Lỗi khi lấy tất cả thông tin kho:', error);
        res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
    }
}

export const updateStock = async (req, res) => {
    try {
        const { quantity_change, reason } = req.body;

        // Tìm stock record
        const stock = await Stock_MD.findOne({ product_variant_id: req.params.id });
        if (!stock) {
            return res.status(404).json({ message: 'Không tìm thấy thông tin tồn kho' });
        }

        // Lấy thông tin variant và product
        const variant = await variant_MD.findById(req.params.id).populate('product_id', 'name');
        if (!variant) {
            return res.status(404).json({ message: 'Không tìm thấy biến thể sản phẩm' });
        }

        const product = variant.product_id;
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
            reason: reason || 'Cập nhật số lượng'
        });

        // Kiểm tra và tạo thông báo nếu tồn kho thấp
        if (newQuantity <= LOW_STOCK_THRESHOLD && newQuantity > 0) {
            // Tạo thông báo cho admin và employee
            const adminsAndEmployees = await User.find({ role: { $in: ['admin', 'employee'] } });

            for (const user of adminsAndEmployees) {
                // Kiểm tra xem đã có thông báo tương tự chưa
                const existingNotification = await Notification.findOne({
                    user_id: user._id,
                    type: 'low_stock',
                    'data.variant_id': req.params.id,
                    createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Trong vòng 24h
                });

                if (!existingNotification) {
                    await Notification.create({
                        user_id: user._id,
                        title: 'Cảnh báo hàng tồn kho thấp',
                        message: `SKU: ${variant.sku} chỉ còn ${newQuantity} sản phẩm trong kho!`,
                        type: 'low_stock',
                        data: {
                            product_id: product._id,
                            variant_id: req.params.id,
                            quantity: newQuantity
                        }
                    });
                }
            }
        }

        // Nếu số lượng tồn kho bằng 0, xóa sản phẩm khỏi giỏ hàng của tất cả khách hàng
        if (newQuantity === 0) {
            // cập nhật trạng thái biến thể thành outOfStock
            await variant_MD.findByIdAndUpdate(req.params.id, { status: 'outOfStock' });

            const cartItems = await CartItem.find({ variant_id: req.params.id });
            for (const item of cartItems) {
                const cart = await Cart.findById(item.cart_id);

                // Lưu thông tin cart item bị xóa
                const removedItem = await RemovedCartItem.create({
                    user_id: cart.user_id,
                    variant_id: req.params.id,
                    product_id: product._id,
                    quantity: item.quantity,
                    restore_expiry: restore_days ? new Date(Date.now() + restore_days * 24 * 60 * 60 * 1000) : null
                });

                // Tạo thông báo cho người dùng
                await Notification.create({
                    user_id: cart.user_id,
                    title: 'Sản phẩm trong giỏ hàng đã hết',
                    message: `${product.name} - ${variant.color} size ${variant.size} đã hết hàng và đã được xóa khỏi giỏ hàng của bạn. Bạn sẽ nhận được thông báo khi sản phẩm có hàng trở lại.`,
                    type: 'back_in_stock',
                    data: {
                        product_id: product._id,
                        variant_id: req.params.id
                    }
                });

                // Xóa cart item và cập nhật giỏ hàng
                await CartItem.findByIdAndDelete(item._id);
                await Cart.updateOne(
                    { _id: item.cart_id },
                    { $pull: { cart_items: item._id } }
                );
            }
        }

        // Nếu sản phẩm có hàng trở lại, gửi thông báo cho những người dùng đã bị xóa khỏi giỏ hàng
        if (newQuantity > 0) {
            // cập nhật trạng thái biến thể thành inStock
            await variant_MD.findByIdAndUpdate(req.params.id, { status: 'inStock' });

            const removedItems = await RemovedCartItem.find({
                variant_id: req.params.id,
                notification_sent: { restored: false }
            });

            // Khôi phục sản phẩm vào giỏ hàng và gửi thông báo
            for (const removedItem of removedItems) {
                // Tạo thông báo cho người dùng
                await Notification.create({
                    user_id: removedItem.user_id,
                    title: 'Sản phẩm đã có hàng trở lại',
                    message: `${product.name} - ${variant.color} size ${variant.size} đã có hàng trở lại! Nhanh tay đặt hàng ngay!`,
                    type: 'back_in_stock',
                    data: {
                        product_id: product._id,
                        variant_id: req.params.id,
                        quantity: newQuantity
                    }
                });

                // Cập nhật trạng thái đã gửi thông báo
                removedItem.notification_sent.restored = true;
                await removedItem.save();
            }
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

// lấy lịch sử tồn kho của 1 biến thể
export const getOneStockHistory = async (req, res) => {
    try {
        const stock = await Stock_MD.findOne({ product_variant_id: req.params.id });
        if (!stock) {
            return res.status(404).json({ message: 'Không tìm thấy thông tin tồn kho' });
        }

        const history = await stockHistory_MD.find({ stock_id: stock._id })
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

// lấy lịch sử tồn kho của tất cả biến thể
export const getAllStockHistory = async (req, res) => {
    try {
        // Lấy tất cả lịch sử kho và sắp xếp theo ngày tạo mới nhất
        const stockHistory = await stockHistory_MD.find()
        // .populate('stock_id', 'product_variant_id')
        // .sort({ createdAt: -1 });

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
        // Kiểm tra xem có truyền ID lịch sử kho không
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

