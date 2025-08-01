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
import dateFormat from 'dateformat';
import querystring from 'qs';
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
            });
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

        if (payment_method === "VNPAY") {
            // Gọi API tạo payment URL
            const response = await axios.get(`http://localhost:3000/api/orders/create-payment?amount=${total_price}&orderId=${order._id}`, {
                headers: {
                    Authorization: req.headers.authorization // giữ token để qua authMiddleware
                }
            });

            if (response.data?.paymentUrl) {
                return res.status(201).json({
                    redirectUrl: response.data.paymentUrl, // để client redirect tới đây
                    message: "Đơn hàng đã được tạo. Đang chuyển hướng đến VNPAY.",
                    donHang: {
                        ...order.toObject(),
                        chiTietDonHang: orderItems,
                        tongGoc: sub_total,
                        giamGia: voucher_discount,
                        tongThanhToan: total_price
                    }
                });
            } else {
                return res.status(500).json({
                    message: "Không thể tạo liên kết thanh toán VNPAY"
                });
            }
        }

        if (payment_method === "ZALOPAY") {
            const zpResult = await createZaloPayPayment(total_price, order._id, app_trans_id);

            if (zpResult.return_code === 1) {
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

        // Trừ tồn kho khi chuyển sang "shipped" hoặc "delivered" mà trạng thái hiện tại chưa phải "shipped"
        if ((status === 'shipped' || status === 'delivered') && order.status !== 'shipped') {
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

        // Tạo thông báo cho khách hàng về trạng thái đơn hàng
        await Notification.create({
            user_id: order.user_id,
            title: 'Cập nhật trạng thái đơn hàng',
            message: `Đơn hàng của bạn đã chuyển sang trạng thái: ${status}`,
            type: 'order_status',
            data: {},
        });

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
            user_id: order.user_id,
            title: 'Đơn hàng đã bị hủy',
            message: isAdmin
                ? `Đơn hàng của bạn đã bị hủy bởi Admin với lý do: ${req.body.cancel_reason || 'Không có lý do'}`
                : `Đơn hàng của bạn đã bị hủy thành công`,
            type: 'order_status',
            data: {
                order_id: orderId,
                status: 'canceled',
                canceled_by: isAdmin ? 'admin' : 'user'
            },
        });

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

export const createVNPAYPayment = async (req, res) => {
    const { amount, orderId } = req.query;

    if (!amount || !orderId || isNaN(amount)) {
        return res.status(400).json({ message: "Thiếu hoặc sai thông tin thanh toán" });
    }

    const vnp_TmnCode = "MTV05YVA"; // mã TMN VNPAY
    const vnp_HashSecret = "PBNLKF8YGRNCPXLDJLY9V1023CW8206U";
    const vnp_Url = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
    const vnp_ReturnUrl = `http://localhost:5173/payment-result?orderId=${orderId}`;

    const ipAddr = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    const tmnCode = vnp_TmnCode;
    const secretKey = vnp_HashSecret;
    const vnpUrl = vnp_Url;
    const returnUrl = vnp_ReturnUrl;

    const vnp_TxnRef = dateFormat(new Date(), "yyyymmddHHMMss");
    const vnp_OrderInfo = `Thanh toán đơn hàng ${orderId}`;
    const vnp_OrderType = "other";
    const vnp_Amount = amount * 100;
    const vnp_Locale = "vn";
    const vnp_BankCode = "";
    const vnp_CreateDate = moment().format('YYYYMMDDHHmmss');

    let vnp_Params = {
        vnp_Version: "2.1.0",
        vnp_Command: "pay",
        vnp_TmnCode: tmnCode,
        vnp_Locale,
        vnp_CurrCode: "VND",
        vnp_TxnRef,
        vnp_OrderInfo,
        vnp_OrderType,
        vnp_Amount,
        vnp_ReturnUrl: returnUrl,
        vnp_IpAddr: ipAddr,
        vnp_CreateDate
    };

    const sortObject = (obj) => {
        const sorted = {};
        const keys = Object.keys(obj).sort();
        keys.forEach((key) => {
            sorted[key] = obj[key];
        });
        return sorted;
    };

    vnp_Params = sortObject(vnp_Params);

    const signData = querystring.stringify(vnp_Params, { encode: false });
    const hmac = crypto.createHmac("sha512", secretKey);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");

    vnp_Params.vnp_SecureHash = signed;
    const paymentUrl = vnpUrl + '?' + querystring.stringify(vnp_Params, { encode: true });

    return res.json({ paymentUrl });
};

const config = {
    app_id: '2554',
    key1: 'sdngKKJmqEMzvh5QQcdD2A9XBSKUNaYn',
    key2: 'trMrHtvjo6myautxDUiAcYsVtaeQ8nhf',
    endpoint: 'https://sb-openapi.zalopay.vn/v2/create'
};

export const createZaloPayPayment = async (amount, orderId, userId) => {
    const embed_data = {};
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
        callback_url: "http://localhost:3000/api/payment/zalopay/callback"
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