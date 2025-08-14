import Cart_MD from "../models/cart_MD";
import CartItem_MD from "../models/cartItem_MD";
import Order_MD from "../models/order_MD";
import OrderItem_MD from "../models/orderItem_MD";
import Stock_MD from "../models/stock_MD";
import StockHistory_MD from "../models/stockHistory_MD";
import Variant_MD from "../models/variant_MD";
import Voucher_MD from "../models/voucher_MD";
import User_MD from "../models/auth_MD";
import Notification from "../models/notification_MD";
import moment from 'moment';
import crypto from 'crypto';
import axios from "axios";

// tạo đơn hàng
export const getAllOrderAdmin = async (req, res) => {
    try {
        // Sửa populate: dùng 'items' (virtual field) thay vì 'order_items'
        const orders = await Order_MD.find()
            .populate({
                path: 'items',
                populate: {
                    path: 'variant_id',
                    select: 'sku price color size',
                    populate: {
                        path: 'product_id',
                        select: 'name'
                    }
                }
            })
            .sort({ createdAt: -1 });

        return res.status(200).json({
            message: 'Lấy danh sách đơn hàng thành công',
            data: orders
        });
    } catch (error) {
        console.error('Lỗi khi lấy danh sách đơn hàng:', error);
        return res.status(500).json({
            message: 'Đã xảy ra lỗi khi lấy danh sách đơn hàng',
            error: error.message
        });
    }
};

export const createOrder = async (req, res) => {
    try {
        // kiểm tra user authentication
        if (!req.user || !req.user._id) {
            return res.status(401).json({ message: "Vui lòng đăng nhập để tiếp tục" });
        }

        const user_id = req.user._id;
        const {
            cart_id,
            voucher_code,
            shipping_address_id, // ID của địa chỉ có sẵn trong profile
            shipping_address, // Địa chỉ mới (nếu không dùng địa chỉ có sẵn)
            full_name,
            phone,
            payment_method
        } = req.body;

        if (!cart_id) {
            return res.status(400).json({ message: "Không tìm thấy giỏ hàng" });
        }

        // Lấy thông tin user
        const user = await User_MD.findById(user_id);
        if (!user) {
            return res.status(404).json({ message: "Không tìm thấy thông tin người dùng" });
        }

        let fullShippingAddress = '';

        // Nếu có shipping_address_id, sử dụng địa chỉ có sẵn
        if (shipping_address_id) {
            const existingAddress = user.shipping_addresses.id(shipping_address_id);
            if (!existingAddress) {
                return res.status(404).json({ message: "Không tìm thấy địa chỉ giao hàng đã chọn" });
            }
            fullShippingAddress = `${existingAddress.full_name} - ${existingAddress.phone} - ${existingAddress.address}`;
        }
        // Nếu không có shipping_address_id, yêu cầu thông tin địa chỉ mới
        else {
            if (!shipping_address || !full_name || !phone) {
                return res.status(400).json({ message: "Vui lòng cung cấp đầy đủ thông tin giao hàng" });
            }

            // Kiểm tra xem đây có phải là đơn hàng đầu tiên của user không
            const orderCount = await Order_MD.countDocuments({ user_id });
            const isFirstOrder = orderCount === 0;

            // Cập nhật thông tin cơ bản của user nếu chưa có
            if (!user.full_name) user.full_name = full_name;
            if (!user.phone) user.phone = phone;

            // Tạo địa chỉ giao hàng mới
            const newShippingAddress = {
                full_name,
                phone,
                address: shipping_address,
                is_default: isFirstOrder // Đặt là địa chỉ mặc định nếu là đơn hàng đầu tiên
            };

            // Thêm địa chỉ mới vào danh sách địa chỉ của user
            if (!user.shipping_addresses) {
                user.shipping_addresses = [];
            }
            user.shipping_addresses.push(newShippingAddress);

            // Lưu thông tin user
            await user.save();

            fullShippingAddress = `${full_name} - ${phone} - ${shipping_address}`;
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
        let sub_total = 0;
        for (const item of cart.cart_items) {
            const price = item.variant_id?.price || 0;
            sub_total += price * item.quantity;
        }

        // Xử lý voucher nếu có
        let voucher = null;
        let voucher_discount = 0;
        let total_price = sub_total;

        if (voucher_code) {
            voucher = await Voucher_MD.findOne({
                code: voucher_code.toUpperCase(),
                isActive: true,
                startDate: { $lte: new Date() },
                endDate: { $gte: new Date() },
                $expr: { $lt: ["$usedCount", "$quantity"] }
            });

            if (!voucher) {
                return res.status(400).json({ message: "Mã giảm giá không hợp lệ hoặc đã hết" });
            }

            // Kiểm tra điều kiện áp dụng voucher
            if (sub_total < voucher.minOrderValue) {
                return res.status(400).json({
                    message: `Giá trị đơn hàng tối thiểu để sử dụng voucher là ${voucher.minOrderValue.toLocaleString('vi-VN')}đ`
                });
            }

            // Tính số tiền giảm giá
            if (voucher.type === 'percentage') {
                voucher_discount = (sub_total * voucher.value) / 100;
                if (voucher.maxDiscount) {
                    voucher_discount = Math.min(voucher_discount, voucher.maxDiscount);
                }
            } else { // fixed amount
                voucher_discount = voucher.value;
            }

            total_price = sub_total - voucher_discount;

            // Cập nhật số lượng sử dụng voucher
            voucher.usedCount += 1;
            await voucher.save();
        }

        // tạo đơn hàng
        const order = await Order_MD.create({
            user_id,
            cart_id,
            voucher_id: voucher?._id || null,
            voucher_discount,
            sub_total,
            total_price,
            shipping_address: fullShippingAddress,
            payment_method
        });

        const app_trans_id = `${moment().format('YYMMDD')}_${Math.floor(Math.random() * 1000000)}`;
        order.payment_ref_id = app_trans_id;
        await order.save();

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
        }

        // tạo đơn hàng item
        const orderItems = await OrderItem_MD.insertMany(orderItemData);

        if (payment_method === "ZALOPAY") {
            const zpResult = await createZaloPayPayment(total_price, order._id, app_trans_id);
            if (zpResult.return_code === 1) {
                await CartItem_MD.deleteMany({ cart_id });
                await Cart_MD.findByIdAndUpdate(cart_id, { cart_items: [] });

                return res.status(201).json({
                    redirectUrl: zpResult.order_url,
                    message: "Đơn hàng đã được tạo. Đang chuyển hướng đến ZaloPay.",
                    donHang: {
                        ...order.toObject(),
                        chiTietDonHang: orderItems,
                        tongGoc: sub_total,
                        giamGia: voucher_discount,
                        tongThanhToan: total_price
                    }
                });
            } else {
                return res.status(500).json({ message: "Không thể tạo thanh toán ZaloPay", zpResult });
            }
        }

        const adminAndStaff = await User_MD.find({
            role: { $in: ['admin', 'employee'] }
        });

        for (const adminUser of adminAndStaff) {
            await Notification.create({
                user_id: adminUser._id,
                title: 'Đơn hàng mới',
                message: `Có đơn hàng mới từ khách hàng ${user.username || user.email}`,
                type: 'new_order',
                data: {
                    order_id: order._id,
                    user_id: user_id
                }
            });
        }

        // xóa giỏ hàng
        await CartItem_MD.deleteMany({ cart_id });
        await Cart_MD.findByIdAndUpdate(cart_id, { cart_items: [] });

        // trả về đơn hàng
        return res.status(201).json({
            message: "Đơn hàng đã được tạo thành công",
            donHang: {
                ...order.toObject(),
                chiTietDonHang: orderItems,
                tongGoc: sub_total,
                giamGia: voucher_discount,
                tongThanhToan: total_price
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
export const getAllOrderUser = async (req, res) => {
    // Kiểm tra người dùng đã đăng nhập chưa
    if (!req.user || !req.user._id) {
        return res.status(401).json({
            message: "Bạn cần đăng nhập để xem đơn hàng"
        });
    }
    try {
        // Lấy tất cả đơn hàng của người dùng
        const orders = await Order_MD.find({ user_id: req.user._id })
            .populate("user_id", "username email")
            .populate({
                path: 'items',
                populate: [
                    {
                        path: 'variant_id',
                        select: 'sku price color',
                        populate: [
                            {
                                path: 'product_id',
                                select: 'name'
                            },
                            {
                                path: 'color',
                                select: 'name',
                            }
                        ]
                    }
                ]
            })
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
                        select: "price image",
                        populate: {
                            path: "color",
                            select: "name"
                        }
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

        // Thứ tự trạng thái
        const statusOrder = {
            'pending': 0,
            'processing': 1,
            'shipped': 2,
            'delivered': 3,
            'returned': 4, // mới thêm
            'canceled': 5
        };

        // Kiểm tra trạng thái mới
        if (!statusOrder.hasOwnProperty(status)) {
            return res.status(400).json({
                message: "Trạng thái không hợp lệ"
            });
        }

        // Không thay đổi nếu đã hủy
        if (order.status === 'canceled') {
            return res.status(400).json({
                message: "Không thể thay đổi trạng thái của đơn hàng đã hủy"
            });
        }

        // Không thay đổi nếu đã hoàn hàng
        if (order.status === 'returned') {
            return res.status(400).json({
                message: "Đơn hàng đã được hoàn trước đó"
            });
        }

        // Chỉ cho hoàn hàng khi đã giao
        if (status === 'returned' && order.status !== 'delivered') {
            return res.status(400).json({
                message: "Chỉ có thể hoàn hàng khi đơn hàng đã được giao"
            });
        }

        // Kiểm tra thứ tự trạng thái (trừ khi hoàn hàng)
        if (status !== 'returned' && statusOrder[status] <= statusOrder[order.status]) {
            return res.status(400).json({
                message: "Không thể chuyển về trạng thái cũ hoặc trạng thái hiện tại"
            });
        }

        // Trừ kho nếu chuyển sang shipped hoặc delivered mà chưa shipped
        if ((status === 'shipped' || status === 'delivered') && order.status !== 'shipped') {
            const orderItems = await OrderItem_MD.find({ order_id: order._id });

            for (const item of orderItems) {
                const stock = await Stock_MD.findOne({ product_variant_id: item.variant_id });
                if (stock) {
                    await StockHistory_MD.create({
                        stock_id: stock._id,
                        quantity_change: -item.quantity,
                        updated_by: req.user._id,
                        reason: `Order #${order._id} shipped`,
                        note: `Đơn hàng chuyển sang trạng thái đang giao hàng`
                    });

                    stock.quantity -= item.quantity;
                    await stock.save();

                    if (stock.quantity === 0) {
                        await Variant_MD.findByIdAndUpdate(item.variant_id, { status: 'outOfStock' });
                    }
                }
            }
        }

        // Cộng lại kho nếu chuyển sang hoàn hàng
        if (status === 'returned') {
            const orderItems = await OrderItem_MD.find({ order_id: order._id });

            for (const item of orderItems) {
                const stock = await Stock_MD.findOne({ product_variant_id: item.variant_id });
                if (stock) {
                    await StockHistory_MD.create({
                        stock_id: stock._id,
                        quantity_change: item.quantity,
                        updated_by: req.user._id,
                        reason: `Order #${order._id} returned`,
                        note: `Đơn hàng hoàn trả`
                    });

                    stock.quantity += item.quantity;
                    await stock.save();

                    await Variant_MD.findByIdAndUpdate(item.variant_id, { status: 'inStock' });
                }
            }
        }

        // Cập nhật trạng thái
        order.status = status;
        await order.save();

        // Map trạng thái ra text
        function getStatusText(status) {
            const statusMap = {
                'pending': 'Chờ xử lý',
                'processing': 'Đang xử lý',
                'shipped': 'Đang giao hàng',
                'delivered': 'Đã giao hàng',
                'returned': 'Đã hoàn hàng',
                'canceled': 'Đã hủy'
            };
            return statusMap[status] || status;
        }

        // Gửi thông báo cho khách hàng
        await Notification.create({
            user_id: order.user_id.toString(),
            title: 'Cập nhật trạng thái đơn hàng',
            message: `Đơn hàng #${order._id} của bạn đã chuyển sang trạng thái: ${getStatusText(status)}`,
            type: 'order_status',
            data: {
                order_id: order._id,
                status,
                updated_at: new Date()
            }
        });

        // Gửi thông báo cho admin/nhân viên
        const adminUsers = await User_MD.find({ role: { $in: ['admin', 'employee'] } });

        for (const admin of adminUsers) {
            await Notification.create({
                user_id: admin._id,
                title: 'Cập nhật trạng thái đơn hàng',
                message: `Đơn hàng #${order._id} đã chuyển sang trạng thái: ${getStatusText(status)}`,
                type: 'order_status',
                data: {
                    order_id: order._id,
                    status,
                    updated_by: req.user._id,
                    customer_id: order.user_id
                }
            });
        }

        return res.status(200).json(order);
    } catch (error) {
        return res.status(500).json({
            message: "Lỗi khi cập nhật trạng thái đơn hàng",
            error: error.message
        });
    }
};


// hủy đơn hàng
export const cancelOrder = async (req, res) => {
    try {
        if (!req.user || !req.user._id) {
            return res.status(401).json({ message: "Vui lòng đăng nhập để tiếp tục" });
        }

        const orderId = req.params.id;
        const user_id = req.user._id;
        const isAdmin = req.user.role === 'admin';

        const order = await Order_MD.findById(orderId);

        if (!order) {
            return res.status(404).json({ message: "Đơn hàng không tồn tại" });
        }

        // Admin có thể hủy mọi đơn hàng, user chỉ có thể hủy đơn của mình
        if (!isAdmin && order.user_id.toString() !== user_id.toString()) {
            return res.status(403).json({ message: "Bạn không có quyền hủy đơn hàng này" });
        }

        // Admin có thể hủy đơn ở mọi trạng thái trừ 'delivered' và 'canceled'
        // User chỉ có thể hủy đơn ở trạng thái 'pending' và 'processing'
        const nonCancelableStatus = isAdmin ? ["delivered", "canceled"] : ["shipped", "delivered", "canceled"];
        if (nonCancelableStatus.includes(order.status)) {
            return res.status(400).json({
                message: isAdmin
                    ? "Không thể hủy đơn hàng đã giao hoặc đã hủy"
                    : "Không thể hủy đơn hàng trong trạng thái hiện tại"
            });
        }

        // Hoàn lại số lượng cho kho nếu đơn hàng đã shipped
        if (order.status === 'shipped' && isAdmin) {
            const orderItems = await OrderItem_MD.find({ order_id: orderId });

            for (const item of orderItems) {
                const stock = await Stock_MD.findOneAndUpdate(
                    { product_variant_id: item.variant_id },
                    { $inc: { quantity: item.quantity } },
                    { new: true }
                );

                if (stock) {
                    // Tạo lịch sử tồn kho khi admin hủy
                    await StockHistory_MD.create({
                        stock_id: stock._id,
                        quantity_change: item.quantity,
                        updated_by: req.user._id,
                        reason: `Admin Cancel Order #${orderId}`,
                        note: `Admin ${req.user.username} đã hủy đơn hàng đang giao`
                    });

                    // Kiểm tra và cập nhật trạng thái variant
                    if (stock.quantity > 0) {
                        await Variant_MD.findByIdAndUpdate(
                            item.variant_id,
                            { status: 'inStock' }
                        );
                    }
                }
            }
        }

        // Cập nhật thông tin hủy đơn
        order.status = "canceled";
        order.cancel_reason = req.body.cancel_reason || (isAdmin ? "admin_cancel" : "user_cancel");
        order.cancelled_at = new Date();
        order.cancelled_by = user_id;
        await order.save();

        // Tạo thông báo cho khách hàng
        await Notification.create({
            user_id: order.user_id.toString(), // Đảm bảo convert sang string
            title: 'Đơn hàng đã bị hủy',
            message: isAdmin
                ? `Đơn hàng của bạn đã bị hủy bởi Admin với lý do: ${req.body.cancel_reason || 'Không có lý do'}`
                : `Đơn hàng của bạn đã bị hủy thành công`,
            type: 'order_status',
            data: {
                order_id: orderId,
                status: 'canceled',
                canceled_by: isAdmin ? 'admin' : 'user',
                cancel_reason: req.body.cancel_reason,
                cancelled_at: new Date()
            },
        });

        // Tạo thông báo cho admin và nhân viên về việc hủy đơn hàng (chỉ khi user hủy)
        if (!isAdmin) {
            const adminAndStaffForCancel = await User_MD.find({
                role: { $in: ['admin', 'employee'] }
            });

            for (const adminUser of adminAndStaffForCancel) {
                await Notification.create({
                    user_id: adminUser._id,
                    title: 'Đơn hàng bị hủy',
                    message: `Khách hàng đã hủy đơn hàng #${orderId}. Lý do: ${req.body.cancel_reason || 'Không có lý do'}`,
                    type: 'order_status',
                    data: {
                        order_id: orderId,
                        cancelled_by: 'user',
                        cancel_reason: req.body.cancel_reason,
                        customer_id: order.user_id
                    }
                });
            }
        }

        return res.status(200).json({
            message: "Đơn hàng đã được hủy thành công",
            data: order
        });

    } catch (error) {
        console.error("Lỗi khi hủy đơn hàng:", error);
        return res.status(500).json({
            message: "Đã xảy ra lỗi khi hủy đơn hàng",
            error: error.message
        });
    }
}

const config = {
    app_id: '2554',
    key1: 'sdngKKJmqEMzvh5QQcdD2A9XBSKUNaYn',
    key2: 'trMrHtvjo6myautxDUiAcYsVtaeQ8nhf',
    endpoint: 'https://sb-openapi.zalopay.vn/v2/create'
};

export const createZaloPayPayment = async (amount, orderId, userId) => {
    const embed_data = {
        redirecturl: "http://localhost:5173/checkout/success"
    };
    const items = [];

    const transID = Math.floor(Math.random() * 1000000);
    const app_trans_id = `${moment().format('YYMMDD')}_${transID}`;

    const order = {
        app_id: config.app_id,
        app_trans_id,
        app_user: String(userId),
        app_time: Date.now(),
        amount,
        item: JSON.stringify(items),
        embed_data: JSON.stringify(embed_data),
        description: `Thanh toán đơn hàng #${orderId}`,
        bank_code: "",
        callback_url: "http://localhost:3000/api/orders/payment/zalopay/callback"
    };

    const data =
        config.app_id +
        "|" +
        order.app_trans_id +
        "|" +
        order.app_user +
        "|" +
        order.amount +
        "|" +
        order.app_time +
        "|" +
        order.embed_data +
        "|" +
        order.item;

    order.mac = crypto.createHmac("sha256", config.key1).update(data).digest("hex");

    try {
        const response = await axios.post(config.endpoint, null, { params: order });
        return {
            ...response.data,
            app_trans_id // trả về để lưu vào order
        };
    } catch (error) {
        console.error("ZaloPay Error:", error?.response?.data || error.message);
        return {
            return_code: -1,
            return_message: "Lỗi kết nối ZaloPay"
        };
    }
};

export const zaloPayCallback = async (req, res) => {
    try {
        const { data, mac } = req.body;

        const config = {
            key2: "trMrHtvjo6myautxDUiAcYsVtaeQ8nhf"
        };

        const hash = crypto.createHmac("sha256", config.key2)
            .update(data)
            .digest("hex");

        if (mac !== hash) {
            console.warn("Sai MAC từ callback ZaloPay");
            return res.status(400).json({ return_code: -1, return_message: "Invalid MAC" });
        }

        const callbackData = JSON.parse(data);
        const app_trans_id = callbackData["app_trans_id"];
        const zp_trans_id = callbackData["zp_trans_id"];

        // Tìm đơn hàng theo app_trans_id
        const order = await Order_MD.findOne({ payment_ref_id: app_trans_id });

        if (!order) {
            return res.status(404).json({ return_code: -1, return_message: "Không tìm thấy đơn hàng" });
        }

        // Cập nhật trạng thái thanh toán
        if (order.payment_status !== "paid") {
            order.payment_status = "paid";
            order.transaction_id = zp_trans_id;
            await order.save();
        }

        return res.status(200).json({ return_code: 1, return_message: "Thanh toán thành công" });
    } catch (error) {
        console.error("Lỗi callback ZaloPay:", error);
        return res.status(500).json({ return_code: -1, return_message: "Lỗi server" });
    }
};

export const buyNowOrder = async (req, res) => {
    try {
        if (!req.user || !req.user._id) {
            return res.status(401).json({ message: "Vui lòng đăng nhập để tiếp tục" });
        }

        const user_id = req.user._id;
        const {
            variant_id,
            quantity,
            voucher_code,
            shipping_address_id,
            shipping_address,
            full_name,
            phone,
            payment_method
        } = req.body;

        if (!variant_id || !quantity) {
            return res.status(400).json({ message: "Thiếu thông tin sản phẩm" });
        }

        // Lấy variant và kiểm tra tồn kho
        const variant = await Variant_MD.findById(variant_id).populate('product_id');
        if (!variant || variant.status === 'outOfStock') {
            return res.status(404).json({ message: "Sản phẩm không tồn tại hoặc đã hết hàng" });
        }

        const stock = await Stock_MD.findOne({ product_variant_id: variant_id });
        if (!stock || stock.quantity < quantity) {
            return res.status(400).json({ message: "Không đủ hàng trong kho" });
        }

        // Xử lý địa chỉ giao hàng như ở `createOrder`
        const user = await User_MD.findById(user_id);
        if (!user) return res.status(404).json({ message: "Không tìm thấy người dùng" });

        let fullShippingAddress = "";
        if (shipping_address_id) {
            const existingAddress = user.shipping_addresses.id(shipping_address_id);
            if (!existingAddress) return res.status(404).json({ message: "Địa chỉ giao hàng không hợp lệ" });
            fullShippingAddress = `${existingAddress.full_name} - ${existingAddress.phone} - ${existingAddress.address}`;
        } else {
            if (!shipping_address || !full_name || !phone)
                return res.status(400).json({ message: "Thiếu thông tin địa chỉ giao hàng" });
            fullShippingAddress = `${full_name} - ${phone} - ${shipping_address}`;
        }

        // Tính giá
        const price = variant.price;
        const sub_total = price * quantity;
        let total_price = sub_total;
        let voucher_discount = 0;
        let voucher = null;

        if (voucher_code) {
            voucher = await Voucher_MD.findOne({
                code: voucher_code.toUpperCase(),
                isActive: true,
                startDate: { $lte: new Date() },
                endDate: { $gte: new Date() },
                $expr: { $lt: ["$usedCount", "$quantity"] }
            });

            if (!voucher) return res.status(400).json({ message: "Voucher không hợp lệ" });
            if (sub_total < voucher.minOrderValue) return res.status(400).json({
                message: `Đơn hàng tối thiểu để dùng voucher là ${voucher.minOrderValue.toLocaleString('vi-VN')}đ`
            });

            if (voucher.type === 'percentage') {
                voucher_discount = (sub_total * voucher.value) / 100;
                if (voucher.maxDiscount) {
                    voucher_discount = Math.min(voucher_discount, voucher.maxDiscount);
                }
            } else {
                voucher_discount = voucher.value;
            }
            total_price = sub_total - voucher_discount;
            voucher.usedCount += 1;
            await voucher.save();
        }

        // Tạo order
        const order = await Order_MD.create({
            user_id,
            voucher_id: voucher?._id || null,
            voucher_discount,
            sub_total,
            total_price,
            shipping_address: fullShippingAddress,
            payment_method
        });

        const app_trans_id = `${moment().format('YYMMDD')}_${Math.floor(Math.random() * 1000000)}`;
        order.payment_ref_id = app_trans_id;
        await order.save();

        // Tạo OrderItem
        const orderItem = await OrderItem_MD.create({
            order_id: order._id,
            product_id: variant.product_id._id,
            variant_id,
            quantity,
            price
        });

        if (payment_method === "ZALOPAY") {
            const zpResult = await createZaloPayPayment(total_price, order._id, app_trans_id);
            if (zpResult.return_code === 1) {
                return res.status(201).json({
                    redirectUrl: zpResult.order_url,
                    message: "Đang chuyển hướng đến ZaloPay",
                    donHang: {
                        ...order.toObject(),
                        chiTietDonHang: [orderItem],
                        tongGoc: sub_total,
                        giamGia: voucher_discount,
                        tongThanhToan: total_price
                    }
                });
            }
        }

        const adminAndStaff = await User_MD.find({
            role: { $in: ['admin', 'employee'] }
        });

        for (const adminUser of adminAndStaff) {
            await Notification.create({
                user_id: adminUser._id,
                title: 'Đơn hàng mới',
                message: `Có đơn hàng mới từ khách hàng ${user.username || user.email}`,
                type: 'new_order',
                data: {
                    order_id: order._id,
                    user_id: user_id
                }
            });
        }
        // Thanh toán COD
        return res.status(201).json({
            message: "Đơn hàng 'Mua ngay' đã được tạo thành công",
            donHang: {
                ...order.toObject(),
                chiTietDonHang: [orderItem],
                tongGoc: sub_total,
                giamGia: voucher_discount,
                tongThanhToan: total_price
            }
        });

    } catch (error) {
        console.error("Lỗi mua ngay:", error);
        return res.status(500).json({
            message: "Lỗi server khi xử lý mua ngay",
            error: error.message
        });
    }
};

export const returnOrderByCustomer = async (req, res) => {
    try {
        const order = await Order_MD.findById(req.params.id);

        if (!order) {
            return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
        }

        // Kiểm tra đơn hàng có thuộc về người dùng không
        if (order.user_id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Bạn không có quyền hoàn đơn hàng này" });
        }

        // Chỉ cho hoàn nếu đã giao hàng
        if (order.status !== 'delivered') {
            return res.status(400).json({ message: "Chỉ được hoàn hàng khi đơn đã giao thành công" });
        }

        // Không hoàn lại đơn đã bị hoàn hoặc huỷ trước đó
        if (order.status === 'returned' || order.status === 'canceled') {
            return res.status(400).json({ message: "Đơn hàng đã ở trạng thái không thể hoàn" });
        }

        // Lấy các sản phẩm của đơn
        const orderItems = await OrderItem_MD.find({ order_id: order._id });

        for (const item of orderItems) {
            const stock = await Stock_MD.findOne({ product_variant_id: item.variant_id });
            if (stock) {
                // Ghi log lịch sử hoàn
                await StockHistory_MD.create({
                    stock_id: stock._id,
                    quantity_change: item.quantity,
                    updated_by: req.user._id,
                    reason: `Order #${order._id} returned by customer`,
                    note: `Khách hàng hoàn đơn`
                });

                // Cộng lại kho
                stock.quantity += item.quantity;
                await stock.save();

                // Nếu đang out of stock thì chuyển về inStock
                await Variant_MD.findByIdAndUpdate(item.variant_id, { status: 'inStock' });
            }
        }

        // Cập nhật trạng thái đơn hàng
        order.status = 'returned';
        await order.save();

        // Gửi thông báo cho admin
        const adminUsers = await User_MD.find({ role: { $in: ['admin', 'employee'] } });

        for (const admin of adminUsers) {
            await Notification.create({
                user_id: admin._id,
                title: 'Khách hàng hoàn hàng',
                message: `Khách hàng đã hoàn đơn hàng #${order._id}`,
                type: 'order_returned',
                data: {
                    order_id: order._id,
                    returned_by: req.user._id,
                    returned_at: new Date()
                }
            });
        }

        // Thông báo xác nhận cho khách
        await Notification.create({
            user_id: req.user._id,
            title: 'Xác nhận hoàn hàng',
            message: `Chúng tôi đã tiếp nhận yêu cầu hoàn hàng cho đơn #${order._id}`,
            type: 'order_returned',
            data: {
                order_id: order._id,
                status: 'returned'
            }
        });

        return res.status(200).json({ message: "Hoàn hàng thành công", order });

    } catch (error) {
        return res.status(500).json({ message: "Lỗi hoàn hàng", error: error.message });
    }
};

