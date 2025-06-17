import mongoose from "mongoose";
import Cart_MD from "../models/cart_MD.js";
import CartItem_MD from "../models/cartItem_MD.js";
import Order_MD from "../models/order_MD.js";
import OrderItem_MD from "../models/orderItem_MD.js";
import Stock_MD from "../models/stock_MD.js";
import StockHistory_MD from "../models/stockHistory_MD.js";

export const createOder = async (req, res) => {
    try {
        // Kiểm tra user authentication
        if (!req.user || !req.user._id) {
            return res.status(401).json({ message: "Vui lòng đăng nhập để tiếp tục" });
        }

        const user_id = req.user._id;
        const { cart_id } = req.body;

        if (!cart_id) {
            return res.status(400).json({ message: "Không tìm thấy giỏ hàng" });
        }

        // Kiểm tra giỏ hàng tồn tại và thuộc về user
        const cart = await Cart_MD.findOne({ _id: cart_id })
            .populate({
                path: 'cart_items',
                populate: [
                    {
                        path: 'product_id',
                        select: 'name'
                    },
                    {
                        path: 'variant_id',
                        select: 'price'
                    }
                ]
            });

        if (!cart) {
            return res.status(404).json({ message: "Giỏ hàng không tồn tại" });
        }

        if (!cart.cart_items || cart.cart_items.length === 0) {
            return res.status(400).json({ message: "Giỏ hàng trống" });
        }

        // Kiểm tra số lượng tồn kho trước khi tạo đơn
        for (const item of cart.cart_items) {
            const stock = await Stock_MD.findOne({ product_variant_id: item.variant_id._id });

            if (!stock || stock.quantity < item.quantity) {
                return res.status(400).json({
                    message: `Sản phẩm ${item.product_id.name} không đủ số lượng trong kho`,
                    tonKho: stock ? stock.quantity : 0,
                    yeuCau: item.quantity
                });
            }
        }

        let total_price = 0;

        for (const item of cart.cart_items) {
            const price = item.variant_id?.price || 0;
            total_price += price * item.quantity;
        }

        const order = await Order_MD.create({
            user_id,
            cart_id,
            shipped_address: req.body.shipped_address,
            payment_method: req.body.payment_method,
        })

        const orderItemData = [];

        for (const item of cart.cart_items) {
            const orderItem = {
                order_id: order._id,
                product_id: item.product_id._id,
                variant_id: item.variant_id._id,
                quantity: item.quantity,
                price: item.variant_id.price,
            }

            orderItemData.push(orderItem);

            const stock = await Stock_MD.findOneAndUpdate(
                { product_variant_id: item.variant_id._id },
                { $inc: { quantity: -item.quantity } },
                { new: true }
            );

            await StockHistory_MD.create({
                stock_id: stock._id,
                quantity_change: -item.quantity,
                reason: `Order #${order._id}`,
                note: `Khách hàng ${req.user.username} đã mua ${item.quantity} sản phẩm`
            })

        }

        const orderItems = await OrderItem_MD.insertMany(orderItemData);

        await CartItem_MD.deleteMany({ cart_id });
        await Cart_MD.findByIdAndUpdate(cart_id, { cart_items: [] });

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

export const getOrderById = async (req, res) => {
    try {
        const order = await Order_MD.findById(req.params.id)
            .populate("user_id", "username email")
            .populate({
                path: "items",
                populate:
                {
                    path: "product_id variant_id",
                    select: "name price size color"
                }
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

export const updateOrderStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const order = await Order_MD.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );

        if (!order) {
            return res.status(404).json({
                message: "Không tìm thấy đơn hàng"
            });
        }

        return res.status(200).json(order);
    } catch (error) {
        return res.status(500).json({
            message: "Lỗi khi cập nhật trạng thái đơn hàng",
            error: error.message
        });
    }
}

export const cancelOrder = async (req, res) => {
    try {
        if (!req.user || !req.user._id) {
            return res.status(401).json({ message: "Vui lòng đăng nhập để tiếp tục" });
        }

        const orderId = req.params.id;
        const user_id = req.user._id;

        const order = await Order_MD.findById(orderId);

        if (!order) {
            return res.status(404).json({ message: "Đơn hàng không tồn tại" });
        }

        if (!req.user.isAdmin && order.user_id.toString() !== user_id.toString()) {
            return res.status(403).json({ message: "Bạn không có quyền hủy đơn hàng" });
        }

        const nonCancelableStatus = ["delivered", "cancelled"];
        if (nonCancelableStatus.includes(order.status)) {
            return res.status(400).json({ message: "Không thể hủy đơn hàng trong trạng thái hiện tại" });
        }

        const orderItems = await OrderItem_MD.find({ order_id: orderId });

        if (orderItems && orderItems.length > 0) {
            for (const item of orderItems) {
                const stock = await Stock_MD.findOneAndUpdate(
                    { product_variant_id: item.variant_id },
                    { $inc: { quantity: item.quantity } },
                    { new: true }
                );
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


        order.status = "cancelled";
        order.cancelled_reason = req.body.cancelled_reason || "user";
        order.cancelled_at = new Date();
        order.cancelled_by = user_id;
        await order.save();

        return res.status(200).json({ message: "Đơn hàng đã được hủy thành công" });
    } catch (error) {
        console.error("Lỗi khi hủy đơn hàng:", error);
        return res.status(500).json({
            message: "Đã xảy ra lỗi khi hủy đơn hàng",
            error: error.message
        });
    }
}