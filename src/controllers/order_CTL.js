import Cart_MD from "../models/cart_MD";
import CartItem_MD from "../models/cartItem_MD";
import Order_MD from "../models/order_MD";
import OrderItem_MD from "../models/orderItem_MD";
import Stock_MD from "../models/stock_MD";
import StockHistory_MD from "../models/stockHistory_MD";
import Variant_MD from "../models/variant_MD";

// tạo đơn hàng
export const createOrder = async (req, res) => {
    try {
        // kiểm tra user authentication
        if (!req.user || !req.user._id) {
            return res.status(401).json({ message: "Vui lòng đăng nhập để tiếp tục" });
        }

        const user_id = req.user._id;
        const { cart_id } = req.body;

        if (!cart_id) {
            return res.status(400).json({ message: "Không tìm thấy giỏ hàng" });
        }

        // kiểm tra giỏ hàng tồn tại và thuộc về user
        const cart = await Cart_MD.findOne({ _id: cart_id })
            .populate({
                path: 'cart_items',
                populate: [
                    {
                        path: 'variant_id',
                        select: 'price color size status product_id',
                        populate: {
                            path: 'product_id',
                            select: 'name'
                        }
                    }
                ]
            });

        if (!cart) {
            return res.status(404).json({ message: "Giỏ hàng không tồn tại" });
        }

        if (!cart.cart_items || cart.cart_items.length === 0) {
            return res.status(400).json({ message: "Giỏ hàng trống" });
        }

        // kiểm tra số lượng tồn kho và trạng thái variant trước khi tạo đơn
        const outOfStockItems = [];
        for (const item of cart.cart_items) {
            // Kiểm tra trạng thái variant
            if (item.variant_id.status === 'outOfStock') {
                outOfStockItems.push(`${item.variant_id.product_id.name} - ${item.variant_id.color} size ${item.variant_id.size} đã hết hàng`);
                continue;
            }

            const stock = await Stock_MD.findOne({ product_variant_id: item.variant_id._id });
            if (!stock || stock.quantity === 0) {
                outOfStockItems.push(`${item.variant_id.product_id.name} - ${item.variant_id.color} size ${item.variant_id.size} đã hết hàng`);
                continue;
            }

            if (stock.quantity < item.quantity) {
                outOfStockItems.push(`${item.variant_id.product_id.name} - ${item.variant_id.color} size ${item.variant_id.size} chỉ còn ${stock.quantity} sản phẩm`);
                continue;
            }
        }

        if (outOfStockItems.length > 0) {
            return res.status(400).json({
                message: "Một số sản phẩm trong giỏ hàng đã hết hàng hoặc không đủ số lượng",
                outOfStockItems
            });
        }

        // tính tổng số tiền của đơn hàng
        let total_price = 0;

        for (const item of cart.cart_items) {
            const price = item.variant_id?.price || 0;
            total_price += price * item.quantity;
        }

        // tạo đơn hàng
        const order = await Order_MD.create({
            user_id,
            cart_id,
            shipping_address: req.body.shipping_address,
            payment_method: req.body.payment_method,
            total_price: total_price
        });

        // tạo đơn hàng item
        const orderItemData = [];

        for (const item of cart.cart_items) {
            const orderItem = {
                order_id: order._id,
                product_id: item.variant_id.product_id._id,
                variant_id: item.variant_id._id,
                quantity: item.quantity,
                price: item.variant_id.price,
            }

            orderItemData.push(orderItem);

            // cập nhật số lượng tồn kho
            // const stock = await Stock_MD.findOneAndUpdate(
            //     { product_variant_id: item.variant_id. },
            //     { $inc: { quantity: -item.quantity }             //     { new: true }
            // );

          / // Cập nhật trạng thái variant nếu hết hàng
            if (stock.quantity === 0) {
         //     awaiariant_MD.findByIdAndUpdate(
            //         item.iant_id._id,
            //         { sta: 'outOfStock' }
            //     );
            //
            // tạo lịch sử tồn kho
         await StockHistory_MD.create({
             stock_id: stock._id               quantity_change: -item.quantity,
                reason: `Order #${order._id}`,
                note: `Khách hàng ${req.user.username} đã mua ${item.quantity} sản phẩm`
            })

        }

        // tạo đơn hàng item
        const orderItems = await OrderItem_MD.insertMany(orderItemData);

        // xóa giỏ hàng
        await CartItem_MD.deleteMany({ cart_id });
        await Cart_MD.findByIdAndUpdate(cart_id, { cart_items: [] });

        // trả về đơn hàng
        return res.status(201).json({
            message: "Đơn hàng đã được tạo thành công",
            donHang: {
                ...order.toObject(),
                chiTietDonHang: orderItems,
                tongGoc: total_price,
            }
        })

    } catch (error) {
        console.error("Lỗi khi tạo đơn hàng:", error);
        return res.status(500).json({
            message: "Đã xảy ra lỗi khi tạo đơn hàng",
            error: error.message
        });
    }
}

// lấy tất cả đơn hàng
export const getOrders = async (req, res) => {
    try {
        const orders = await Order_MD.find({ user_id: req.user._id })
            .populate("user_id", "username email")
            .sort({ createdAt: -1 });

        return res.status(200).json(orders);
    } catch (error) {
        console.error("Lỗi khi lấy đơn hàng:", error);
        return res.status(500).json({
            message: "Đã xảy ra lỗi khi lấy đơn hàng",
            error: error.message
        });
    }
}

// lấy đơn hàng theo ID
export const getOrderById = async (req, res) => {
    try {
        const order = await Order_MD.findOne({ _id: req.params.id })
            .populate("user_id", "username email")
            .populate({
                path: "items",
                populate: [
                    {
                        path: "product_id",
                        select: "name"
                    },
                    {
                        path: "variant_id",
                        select: "price color size"
                    }
                ]
            });

        if (!order) {
            return res.status(404).json({ message: "Đơn hàng không tồn tại" });
        }

        return res.status(200).json(order);
    } catch (error) {
        console.error("Lỗi khi lấy đơn hàng:", error);
        return res.status(500).json({
            message: "Đã xảy ra lỗi khi lấy đơn hàng",
            error: error.message
        });
    }
}

// cập nhật trạng thái đơn hàng
export const updateOrderStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const order = await Order_MD.findById(req.params.id);

        if (!order) {
            return res.status(404).json({
                message: "Không tìm thấy đơn hàng"
            });
        }

        // Định nghĩa thứ tự trạng thái
        const statusOrder = {
            'pending': 0,
            'processing': 1,
            'shipped': 2,
            'delivered': 3,
            'canceled': 4
        };

        // Kiểm tra trạng thái mới có hợp lệ không
        if (!statusOrder.hasOwnProperty(status)) {
            return res.status(400).json({
                message: "Trạng thái không hợp lệ"
            });
        }

        // Kiểm tra nếu đơn hàng đã bị hủy
        if (order.status === 'canceled') {
            return res.status(400).json({
                message: "Không thể thay đổi trạng thái của đơn hàng đã hủy"
            });
        }

        // Kiểm tra nếu đơn hàng đã giao
        if (order.status === 'delivered') {
            return res.status(400).json({
                message: "Không thể thay đổi trạng thái của đơn hàng đã giao"
            });
        }

        // Kiểm tra thứ tự trạng thái
        if (statusOrder[status] <= statusOrder[order.status]) {
            return res.status(400).json({
                message: "Không thể chuyển về trạng thái cũ hoặc trạng thái hiện tại"
            });
        }

        // Nếu chuyển sang trạng thái shipped, trừ số lượng trong kho
        if (status === 'shipped') {
            // Lấy danh sách các sản phẩm trong đơn hàng
            const orderItems = await OrderItem_MD.find({ order_id: order._id });

            // Trừ số lượng trong kho cho từng sản phẩm
            for (const item of orderItems) {
                const stock = await Stock_MD.findOne({ product_variant_id: item.variant_id });
                if (stock) {
                    // Tạo lịch sử tồn kho
                    await StockHistory_MD.create({
                        stock_id: stock._id,
                        quantity_change: -item.quantity,
                        reason: `Order #${order._id} shipped`,
                        note: `Đơn hàng chuyển sang trạng thái đang giao hàng`
                    });

                    // Cập nhật số lượng tồn kho
                    stock.quantity -= item.quantity;
                    await stock.save();

                    // Nếu hết hàng, cập nhật trạng thái variant
                    if (stock.quantity === 0) {
                        await Variant_MD.findByIdAndUpdate(
                            item.variant_id,
                            { status: 'outOfStock' }
                        );
                    }
                }
            }
        }

        // Cập nhật trạng thái
        order.status = status;
        await order.save();

        return res.status(200).json(order);
    } catch (error) {
        return res.status(500).json({
            message: "Lỗi khi cập nhật trạng thái đơn hàng",
            error: error.message
        });
    }
}

// hủy đơn hàng
export const cancelOrder = async (req, res) => {
    try {
        if (!req.user || !req.user._id) {
            return res.status(401).json({ message: "Vui lòng đăng nhập để tiếp tục" });
        }

        // lấy ID đơn hàng và ID user
        const orderId = req.params.id;
        const user_id = req.user._id;

        // kiểm tra đơn hàng có tồn tại không
        const order = await Order_MD.findById(orderId);

        if (!order) {
            return res.status(404).json({ message: "Đơn hàng không tồn tại" });
        }

        // kiểm tra user có quyền hủy đơn hàng không
        if (!req.user.isAdmin && order.user_id.toString() !== user_id.toString()) {
            return res.status(403).json({ message: "Bạn không có quyền hủy đơn hàng" });
        }

        // kiểm tra trạng thái đơn hàng có thể hủy không
        const nonCancelableStatus = ["shipped", "delivered", "canceled"];
        if (nonCancelableStatus.includes(order.status)) {
            return res.status(400).json({ message: "Không thể hủy đơn hàng trong trạng thái hiện tại" });
        }

        // lấy đơn hàng item
        const orderItems = await OrderItem_MD.find({ order_id: orderId });

        if (orderItems && orderItems.length > 0) {
            for (const item of orderItems) {
                // cập nhật số lượng tồn kho
                const stock = await Stock_MD.findOneAndUpdate(
                    { product_variant_id: item.variant_id },
                    { $inc: { quantity: item.quantity } },
                    { new: true }
                );
                // tạo lịch sử tồn kho
                if (stock) {
                    await StockHistory_MD.create({
                        stock_id: stock._id,
                        quantity_change: item.quantity,
                        reason: `Order #${orderId}`,
                        note: `Khách hàng ${req.user.username} đã hủy đơn hàng`
                    })
                }
            }
        }

        // cập nhật trạng thái đơn hàng
        order.status = "canceled";
        order.cancel_reason = req.body.cancel_reason || "user";
        order.cancelled_at = new Date();
        order.cancelled_by = user_id;
        await order.save();

        // trả về đơn hàng
        return res.status(200).json({ message: "Đơn hàng đã được hủy thành công" });
    } catch (error) {
        console.error("Lỗi khi hủy đơn hàng:", error);
        return res.status(500).json({
            message: "Đã xảy ra lỗi khi hủy đơn hàng",
            error: error.message
        });
    }
}