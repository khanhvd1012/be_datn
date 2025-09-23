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
import { sendEmailOrder } from "../middleware/sendEmail";
import {
    getAutoShippingFee,
    getProvinces,
    getDistricts,
    getWards
} from "../services/ghnService";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Lấy tất cả đơn hàng cho admin
export const getAllOrderAdmin = async (req, res) => {
    try {
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

// Tạo đơn hàng
export const createOrder = async (req, res) => {
    try {
        if (!req.user || !req.user._id) {
            return res.status(401).json({ message: "Vui lòng đăng nhập để tiếp tục" });
        }

        const user_id = req.user._id;
        const {
            cart_id,
            voucher_code,
            shipping_address_id,
            shipping_address,
            full_name,
            phone,
            payment_method,
            toDistrictId,
            toWardCode,
            province_id,
            district_id,
            ward_code
        } = req.body;

        if (!cart_id) {
            return res.status(400).json({ message: "Không tìm thấy giỏ hàng" });
        }

        const user = await User_MD.findById(user_id);
        if (!user) {
            return res.status(404).json({ message: "Không tìm thấy thông tin người dùng" });
        }

        // --- Xử lý địa chỉ giao hàng ---
        let fullShippingAddress = "";
        let provinceName = "", districtName = "", wardName = "";
        let finalProvinceId, finalDistrictId, finalWardCode;

        if (shipping_address_id) {
            const existingAddress = user.shipping_addresses.id(shipping_address_id);
            if (!existingAddress) {
                return res.status(404).json({ message: "Không tìm thấy địa chỉ giao hàng đã chọn" });
            }

            fullShippingAddress = `${existingAddress.full_name} - ${existingAddress.phone} - ${existingAddress.address}, ${existingAddress.ward_name}, ${existingAddress.district_name}, ${existingAddress.province_name}`;
            provinceName = existingAddress.province_name;
            districtName = existingAddress.district_name;
            wardName = existingAddress.ward_name;

            finalProvinceId = existingAddress.province_id;
            finalDistrictId = existingAddress.district_id;
            finalWardCode = existingAddress.ward_code;
        } else {
            if (!shipping_address || !full_name || !phone || !province_id || !district_id || !ward_code) {
                return res.status(400).json({ message: "Vui lòng cung cấp đầy đủ thông tin địa chỉ (bao gồm province_id, district_id, ward_code)" });
            }

            const provinces = await getProvinces();
            const districts = await getDistricts(province_id);
            const wards = await getWards(district_id);

            provinceName = provinces.find(p => p.ProvinceID === province_id)?.ProvinceName || "";
            districtName = districts.find(d => d.DistrictID === district_id)?.DistrictName || "";
            wardName = wards.find(w => w.WardCode === ward_code)?.WardName || "";

            if (!provinceName || !districtName || !wardName) {
                return res.status(400).json({ message: "Không tìm thấy thông tin địa chỉ từ GHN" });
            }

            const orderCount = await Order_MD.countDocuments({ user_id });
            const isFirstOrder = orderCount === 0;

            const newShippingAddress = {
                full_name,
                phone,
                address: shipping_address,
                province_id,
                province_name: provinceName,
                district_id,
                district_name: districtName,
                ward_code,
                ward_name: wardName,
                is_default: isFirstOrder
            };

            user.shipping_addresses.push(newShippingAddress);
            await user.save();

            fullShippingAddress = `${full_name} - ${phone} - ${shipping_address}, ${wardName}, ${districtName}, ${provinceName}`;

            finalProvinceId = province_id;
            finalDistrictId = district_id;
            finalWardCode = ward_code;
        }

        // --- Kiểm tra giỏ hàng ---
        const cart = await Cart_MD.findOne({ _id: cart_id }).populate({
            path: "cart_items",
            populate: [
                {
                    path: "variant_id",
                    select: "price color size status product_id weight",
                    populate: { path: "product_id", select: "name" },
                },
            ],
        });

        if (!cart || !cart.cart_items?.length) {
            return res.status(400).json({ message: "Giỏ hàng trống hoặc không tồn tại" });
        }

        // --- Check tồn kho ---
        const outOfStockItems = [];
        for (const item of cart.cart_items) {
            if (item.variant_id.status === "outOfStock") {
                outOfStockItems.push(`${item.variant_id.product_id.name} - ${item.variant_id.color} size ${item.variant_id.size} đã hết hàng`);
                continue;
            }
            const stock = await Stock_MD.findOne({ product_variant_id: item.variant_id._id });
            if (!stock || stock.quantity < item.quantity) {
                outOfStockItems.push(`${item.variant_id.product_id.name} - ${item.variant_id.color} size ${item.variant_id.size} chỉ còn ${stock?.quantity || 0} sản phẩm`);
            }
        }
        if (outOfStockItems.length > 0) {
            return res.status(400).json({ message: "Một số sản phẩm trong giỏ hàng đã hết hàng hoặc không đủ số lượng", outOfStockItems });
        }

        // --- Tính tổng gốc ---
        let sub_total = 0;
        for (const item of cart.cart_items) {
            sub_total += (item.variant_id?.price || 0) * item.quantity;
        }

        // --- Voucher ---
        let voucher_discount = 0;
        let voucher = null;
        if (voucher_code) {
            voucher = await Voucher_MD.findOne({
                code: voucher_code.toUpperCase(),
                isActive: true,
                startDate: { $lte: new Date() },
                endDate: { $gte: new Date() },
                $expr: { $lt: ["$usedCount", "$quantity"] },
            });
            if (!voucher) {
                return res.status(400).json({ message: "Mã giảm giá không hợp lệ hoặc đã hết" });
            }
            if (sub_total < voucher.minOrderValue) {
                return res.status(400).json({ message: `Đơn tối thiểu để dùng voucher là ${voucher.minOrderValue}đ` });
            }
            if (voucher.type === "percentage") {
                voucher_discount = (sub_total * voucher.value) / 100;
                if (voucher.maxDiscount) voucher_discount = Math.min(voucher_discount, voucher.maxDiscount);
            } else {
                voucher_discount = voucher.value;
            }
            voucher.usedCount += 1;
            await voucher.save();
        }

        // --- GHN Shipping Fee ---
        let totalWeight = 0;
        for (const item of cart.cart_items) {
            totalWeight += (item.variant_id?.weight || 200) * item.quantity;
        }

        const districtIdForFee = toDistrictId || finalDistrictId;
        const wardCodeForFee = toWardCode || finalWardCode;

        let shippingFee = 0, shippingService = null;
        try {
            const { service, fee } = await getAutoShippingFee({
                toDistrictId: districtIdForFee,
                toWardCode: wardCodeForFee,
                weight: totalWeight
            });
            shippingFee = fee.total;
            shippingService = service;
        } catch (err) {
            console.error("GHN fee error:", err.message);
            return res.status(500).json({ message: "Không tính được phí vận chuyển", error: err.message });
        }

        const total_price = sub_total - voucher_discount + shippingFee;
        const app_trans_id = `${moment().format("YYMMDD")}_${Math.floor(Math.random() * 1000000)}`;

        // --- Tạo order ---
        const order = await Order_MD.create({
            user_id,
            cart_id,
            voucher_id: voucher?._id || null,
            voucher_discount,
            sub_total,
            shipping_fee: shippingFee,
            shipping_service: shippingService?.short_name || null,
            total_price,
            shipping_address: fullShippingAddress,
            payment_method,
            status: "pending",
            app_trans_id,
        });

        // --- Order Items ---
        const orderItemData = cart.cart_items.map((item) => ({
            order_id: order._id,
            product_id: item.variant_id.product_id._id,
            variant_id: item.variant_id._id,
            quantity: item.quantity,
            price: item.variant_id.price,
        }));
        const orderItems = await OrderItem_MD.insertMany(orderItemData);

        // --- Chuẩn bị response data ---
        const responseData = {
            ...order.toObject(),
            chiTietDonHang: orderItems,
            tongGoc: sub_total,
            giamGia: voucher_discount,
            phiShip: shippingFee,
            dichVuShip: shippingService,
            tongThanhToan: total_price,
            province_name: provinceName,
            district_name: districtName,
            ward_name: wardName
        };

        // --- Thanh toán ZaloPay ---
        if (payment_method === "ZALOPAY") {
            const zpResult = await createZaloPayPayment(total_price, order._id, user_id, app_trans_id);
            if (zpResult.return_code === 1) {
                return res.status(201).json({
                    redirectUrl: zpResult.order_url,
                    message: "Đang chuyển hướng đến ZaloPay",
                    donHang: responseData
                });
            } else {
                return res.status(500).json({ message: "Không thể tạo thanh toán ZaloPay", zpResult });
            }
        }

        // --- Notify Admin ---
        const adminAndStaff = await User_MD.find({ role: { $in: ["admin", "employee"] } });
        for (const adminUser of adminAndStaff) {
            await Notification.create({
                user_id: adminUser._id,
                title: "Đơn hàng mới",
                message: `Có đơn hàng mới (#${order.order_code}) từ khách ${user.username || user.email}`,
                type: "new_order",
                data: { order_id: order._id, user_id },
            });
        }

        // --- Clear Cart ---
        await CartItem_MD.deleteMany({ cart_id });
        await Cart_MD.findByIdAndUpdate(cart_id, { cart_items: [] });

        return res.status(201).json({
            message: "Đơn hàng đã được tạo thành công",
            donHang: responseData
        });
    } catch (error) {
        console.error("Lỗi khi tạo đơn hàng:", error);
        return res.status(500).json({ message: "Đã xảy ra lỗi khi tạo đơn hàng", error: error.message });
    }
};

// Lấy tất cả đơn hàng của user
export const getAllOrderUser = async (req, res) => {
    if (!req.user || !req.user._id) {
        return res.status(401).json({
            message: "Bạn cần đăng nhập để xem đơn hàng"
        });
    }
    try {
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

// Lấy đơn hàng theo ID cho admin
export const getOrderByIdAdmin = async (req, res) => {
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

        // Nếu user có lưu địa chỉ, cố gắng lấy thông tin đầy đủ
        let full_address_info = null;
        if (order.user_id) {
            const user = await User_MD.findById(order.user_id._id);
            if (user && user.shipping_addresses.length > 0) {
                const matchAddr = user.shipping_addresses.find(addr =>
                    order.shipping_address.includes(addr.address)
                );
                if (matchAddr) {
                    full_address_info = {
                        full_name: matchAddr.full_name,
                        phone: matchAddr.phone,
                        address: matchAddr.address,
                        province_id: matchAddr.province_id,
                        province_name: matchAddr.province_name,
                        district_id: matchAddr.district_id,
                        district_name: matchAddr.district_name,
                        ward_code: matchAddr.ward_code,
                        ward_name: matchAddr.ward_name
                    };
                }
            }
        }

        return res.status(200).json({
            ...order.toObject(),
            full_address_info
        });
    } catch (error) {
        console.error("Lỗi khi lấy đơn hàng:", error);
        return res.status(500).json({
            message: "Đã xảy ra lỗi khi lấy đơn hàng",
            error: error.message
        });
    }
};

// Lấy đơn hàng theo ID cho user
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

        const isOwner = order.user_id && (order.user_id._id ? order.user_id._id.toString() : order.user_id.toString()) === req.user._id.toString();
        if (!isOwner) {
            return res.status(403).json({ message: "Bạn không có quyền xem đơn hàng này" });
        }

        // Nếu user có lưu địa chỉ, cố gắng lấy thông tin đầy đủ
        let full_address_info = null;
        if (order.user_id) {
            const user = await User_MD.findById(order.user_id._id);
            if (user && user.shipping_addresses.length > 0) {
                const matchAddr = user.shipping_addresses.find(addr =>
                    order.shipping_address && typeof order.shipping_address === "string"
                        ? order.shipping_address.includes(addr.address)
                        : false
                );
                if (matchAddr) {
                    full_address_info = {
                        full_name: matchAddr.full_name,
                        phone: matchAddr.phone,
                        address: matchAddr.address,
                        province_id: matchAddr.province_id,
                        province_name: matchAddr.province_name,
                        district_id: matchAddr.district_id,
                        district_name: matchAddr.district_name,
                        ward_code: matchAddr.ward_code,
                        ward_name: matchAddr.ward_name
                    };
                }
            }
        }

        return res.status(200).json({
            ...order.toObject(),
            full_address_info
        });
    } catch (error) {
        console.error("Lỗi khi lấy đơn hàng:", error);
        return res.status(500).json({
            message: "Đã xảy ra lỗi khi lấy đơn hàng",
            error: error.message
        });
    }
}

// Cập nhật trạng thái đơn hàng
export const updateOrderStatus = async (req, res) => {
    try {
        const { status, reject_reason } = req.body;
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
            'return_requested': 4, // khách yêu cầu hoàn hàng
            'return_accepted': 5,  // admin chấp nhận hoàn hàng
            'return_rejected': 6,  // admin từ chối hoàn hàng
            'returned': 7,         // hoàn hàng thành công
            'canceled': 8
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

        // Không thay đổi nếu đã hoàn hàng thành công
        if (order.status === 'returned') {
            return res.status(400).json({
                message: "Đơn hàng đã được hoàn thành công"
            });
        }

        // Logic xử lý chuyển trạng thái tuần tự
        const currentStatus = order.status;
        const currentOrder = statusOrder[currentStatus];
        const newOrder = statusOrder[status];

        // Các trường hợp đặc biệt được phép
        const allowedTransitions = {
            'delivered': ['return_requested'], // từ đã giao có thể yêu cầu hoàn
            'return_requested': ['return_accepted', 'return_rejected'], // từ yêu cầu hoàn có thể chấp nhận hoặc từ chối
            'return_accepted': ['returned'], // từ chấp nhận hoàn có thể hoàn thành công
            'return_rejected': [] // từ chối hoàn không thể chuyển đâu nữa
        };

        // Kiểm tra chuyển trạng thái hợp lệ
        if (allowedTransitions[currentStatus] && allowedTransitions[currentStatus].includes(status)) {
            // Cho phép chuyển trạng thái đặc biệt
        } else if (newOrder <= currentOrder && status !== currentStatus) {
            return res.status(400).json({
                message: "Không thể chuyển về trạng thái cũ hoặc trạng thái hiện tại"
            });
        } else if (newOrder > currentOrder + 1 && !allowedTransitions[currentStatus]?.includes(status)) {
            return res.status(400).json({
                message: "Phải chuyển trạng thái tuần tự từng bước"
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
                        reason: `Order #${order.order_code} shipped`,
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

        // Cộng lại kho nếu chuyển sang hoàn hàng thành công
        if (status === 'returned') {
            const orderItems = await OrderItem_MD.find({ order_id: order._id });

            for (const item of orderItems) {
                const stock = await Stock_MD.findOne({ product_variant_id: item.variant_id });
                if (stock) {
                    await StockHistory_MD.create({
                        stock_id: stock._id,
                        quantity_change: item.quantity,
                        updated_by: req.user._id,
                        reason: `Order #${order.order_code} returned`,
                        note: `Đơn hàng hoàn trả thành công`
                    });

                    stock.quantity += item.quantity;
                    await stock.save();

                    await Variant_MD.findByIdAndUpdate(item.variant_id, { status: 'inStock' });
                }
            }
        }

        // Cập nhật trạng thái và thời gian
        order.status = status;
        if (status === 'delivered') {
            order.delivered_at = new Date();
        } else if (status === 'return_accepted') {
            order.return_accepted_at = new Date();
            order.return_accepted_by = req.user._id;
        } else if (status === 'return_rejected') {
            order.return_rejected_at = new Date();
            order.return_rejected_by = req.user._id;
            order.return_reject_reason = reject_reason || 'Không đủ điều kiện hoàn hàng';
        } else if (status === 'returned') {
            order.returned_at = new Date();
        }

        await order.save();

        // Map trạng thái ra text
        function getStatusText(status) {
            const statusMap = {
                'pending': 'Chờ xử lý',
                'processing': 'Đang xử lý',
                'shipped': 'Đang giao hàng',
                'delivered': 'Đã giao hàng',
                'return_requested': 'Yêu cầu hoàn hàng',
                'return_accepted': 'Chấp nhận hoàn hàng',
                'return_rejected': 'Từ chối hoàn hàng',
                'returned': 'Đã hoàn hàng',
                'canceled': 'Đã hủy'
            };
            return statusMap[status] || status;
        }

        // Gửi thông báo tùy theo trạng thái
        let notificationMessage = `Đơn hàng #${order.order_code} của bạn đã chuyển sang trạng thái: ${getStatusText(status)}`;

        if (status === 'return_rejected') {
            notificationMessage += `. Lý do: ${reject_reason || 'Không đủ điều kiện hoàn hàng'}`;
        }

        // Gửi thông báo cho khách hàng
        await Notification.create({
            user_id: order.user_id.toString(),
            title: 'Cập nhật trạng thái đơn hàng',
            message: notificationMessage,
            type: 'order_status',
            data: {
                order_id: order._id,
                status,
                updated_at: new Date(),
                reject_reason: status === 'return_rejected' ? reject_reason : null
            }
        });

        // Gửi thông báo cho admin/nhân viên
        const adminUsers = await User_MD.find({ role: { $in: ['admin', 'employee'] } });

        for (const admin of adminUsers) {
            let adminMessage = `Đơn hàng #${order.order_code} đã chuyển sang trạng thái: ${getStatusText(status)}`;

            if (status === 'return_rejected') {
                adminMessage += `. Lý do từ chối: ${reject_reason || 'Không đủ điều kiện hoàn hàng'}`;
            }

            await Notification.create({
                user_id: admin._id,
                title: 'Cập nhật trạng thái đơn hàng',
                message: adminMessage,
                type: 'order_status',
                data: {
                    order_id: order._id,
                    status,
                    updated_by: req.user._id,
                    customer_id: order.user_id,
                    reject_reason: status === 'return_rejected' ? reject_reason : null
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

// Khách hàng xác nhận đã nhận hàng
export const confirmReceived = async (req, res) => {
    try {
        if (!req.user || !req.user._id) {
            return res.status(401).json({ message: "Vui lòng đăng nhập để tiếp tục" });
        }

        const order = await Order_MD.findById(req.params.id);

        if (!order) {
            return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
        }

        // Kiểm tra quyền sở hữu
        if (order.user_id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Bạn không có quyền thực hiện hành động này" });
        }

        // Chỉ có thể xác nhận khi đơn hàng đã được giao
        if (order.status !== 'delivered') {
            return res.status(400).json({ message: "Chỉ có thể xác nhận nhận hàng khi đơn hàng đã được giao" });
        }

        // Cập nhật trạng thái xác nhận
        order.confirmed_received = true;
        order.confirmed_received_at = new Date();
        await order.save();

        // Gửi thông báo cho admin
        const adminUsers = await User_MD.find({ role: { $in: ['admin', 'employee'] } });
        for (const admin of adminUsers) {
            await Notification.create({
                user_id: admin._id,
                title: 'Khách hàng xác nhận nhận hàng',
                message: `Khách hàng đã xác nhận nhận hàng cho đơn #${order.order_code}`,
                type: 'order_confirmed',
                data: {
                    order_id: order._id,
                    customer_id: req.user._id,
                    confirmed_at: new Date()
                }
            });
        }

        return res.status(200).json({
            message: "Xác nhận nhận hàng thành công",
            order
        });

    } catch (error) {
        console.error("Lỗi xác nhận nhận hàng:", error);
        return res.status(500).json({
            message: "Lỗi server khi xác nhận nhận hàng",
            error: error.message
        });
    }
};

const deleteUploadedImages = (filesOrUrls = []) => {
    filesOrUrls.forEach(item => {
        let filename = '';
        if (typeof item === 'string') {
            filename = item.split('/uploads/')[1];
        } else if (item?.filename) {
            filename = item.filename;
        }
        const filePath = path.join(__dirname, '../../public/uploads', filename);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    });
};

// Khách hàng yêu cầu hoàn hàng
export const requestReturn = async (req, res) => {
    try {
        if (!req.user || !req.user._id) {
            if (req.files && req.files.length > 0) deleteUploadedImages(req.files);
            return res.status(401).json({ message: "Vui lòng đăng nhập để tiếp tục" });
        }

        const { return_reason } = req.body;
        const order = await Order_MD.findById(req.params.id);

        if (!order) {
            if (req.files && req.files.length > 0) deleteUploadedImages(req.files);
            return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
        }

        // Kiểm tra quyền sở hữu
        if (order.user_id.toString() !== req.user._id.toString()) {
            if (req.files && req.files.length > 0) deleteUploadedImages(req.files);
            return res.status(403).json({ message: "Bạn không có quyền yêu cầu hoàn hàng này" });
        }

        // Chỉ có thể yêu cầu hoàn khi đã giao hàng
        if (order.status !== 'delivered') {
            if (req.files && req.files.length > 0) deleteUploadedImages(req.files);
            return res.status(400).json({ message: "Chỉ có thể yêu cầu hoàn hàng khi đơn đã được giao" });
        }

        // Kiểm tra đã yêu cầu hoàn chưa
        if (order.status === 'return_requested' || order.status === 'return_accepted' ||
            order.status === 'return_rejected' || order.status === 'returned') {
            if (req.files && req.files.length > 0) deleteUploadedImages(req.files);
            return res.status(400).json({ message: "Đơn hàng đã có yêu cầu hoàn hàng" });
        }

        // Kiểm tra thời gian (7 ngày từ khi giao - có thể điều chỉnh)
        if (!order.delivered_at) {
            if (req.files && req.files.length > 0) deleteUploadedImages(req.files);
            return res.status(400).json({ message: "Không thể hoàn hàng vì thiếu thời điểm giao hàng" });
        }

        let imageUrls = [];
        if (req.files && req.files.length > 0) {
            imageUrls = req.files.map(file => `http://localhost:3000/uploads/${file.filename}`);
        }

        const MAX_IMAGES = 5;
        if (imageUrls.length > MAX_IMAGES) {
            if (req.files && req.files.length > 0) deleteUploadedImages(req.files);
            return res.status(400).json({ message: `Tối đa ${MAX_IMAGES} ảnh` });
        }

        const sevenDaysMs = 7 * 24 * 60 * 60 * 1000; // 7 ngày
        // const sevenDaysMs = 1 * 60 * 1000; // 1 phút cho test
        const now = Date.now();
        const deliveredAtMs = new Date(order.delivered_at).getTime();

        if (now > deliveredAtMs + sevenDaysMs) {
            return res.status(400).json({
                message: "Chỉ được hoàn hàng trong vòng 7 ngày kể từ khi nhận hàng"
            });
        }

        // Cập nhật trạng thái
        order.status = 'return_requested';
        order.return_requested_at = new Date();
        order.return_reason = return_reason || 'Khách hàng yêu cầu hoàn hàng';
        order.images = imageUrls;
        await order.save();

        // Gửi thông báo cho admin
        const adminUsers = await User_MD.find({ role: { $in: ['admin', 'employee'] } });
        for (const admin of adminUsers) {
            await Notification.create({
                user_id: admin._id,
                title: 'Yêu cầu hoàn hàng mới',
                message: `Khách hàng yêu cầu hoàn hàng cho đơn #${order.order_code}. Lý do: ${return_reason || 'Không có lý do'}`,
                type: 'return_request',
                data: {
                    order_id: order._id,
                    customer_id: req.user._id,
                    return_reason,
                    requested_at: new Date()
                }
            });
        }

        // Gửi thông báo cho khách hàng xác nhận
        await Notification.create({
            user_id: req.user._id,
            title: 'Yêu cầu hoàn hàng đã được gửi',
            message: `Yêu cầu hoàn hàng cho đơn #${order.order_code} đã được gửi. Chúng tôi sẽ xem xét và phản hồi sớm nhất.`,
            type: 'return_request',
            data: {
                order_id: order._id,
                status: 'return_requested'
            }
        });

        return res.status(200).json({
            message: "Yêu cầu hoàn hàng đã được gửi thành công",
            order
        });

    } catch (error) {
        console.error("Lỗi yêu cầu hoàn hàng:", error);
        return res.status(500).json({
            message: "Lỗi server khi yêu cầu hoàn hàng",
            error: error.message
        });
    }
};

// Hủy đơn hàng
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

        // Admin có thể hủy đơn ở mọi trạng thái trừ 'delivered', 'returned' và 'canceled'
        // User chỉ có thể hủy đơn ở trạng thái 'pending' và 'processing'
        const nonCancelableStatus = isAdmin ?
            ["delivered", "returned", "canceled", "return_requested", "return_accepted"] :
            ["shipped", "delivered", "returned", "canceled", "return_requested", "return_accepted", "return_rejected"];

        if (nonCancelableStatus.includes(order.status)) {
            return res.status(400).json({
                message: isAdmin
                    ? "Không thể hủy đơn hàng đã giao, đã hoàn hoặc đang trong quy trình hoàn hàng"
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
            user_id: order.user_id.toString(),
            title: 'Đơn hàng đã bị hủy',
            message: isAdmin
                ? `Đơn hàng #${order.order_code} của bạn đã bị hủy bởi Admin với lý do: ${req.body.cancel_reason || 'Không có lý do'}`
                : `Đơn hàng #${order.order_code} của bạn đã bị hủy thành công`,
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
                    message: `Khách hàng đã hủy đơn hàng #${order.order_code}. Lý do: ${req.body.cancel_reason || 'Không có lý do'}`,
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

// ZaloPay Configuration
const config = {
    app_id: '2554',
    key1: 'sdngKKJmqEMzvh5QQcdD2A9XBSKUNaYn',
    key2: 'trMrHtvjo6myautxDUiAcYsVtaeQ8nhf',
    endpoint: 'https://sb-openapi.zalopay.vn/v2/create'
};

export const createZaloPayPayment = async (amount, orderId, userId, app_trans_id) => {
    const embed_data = {
        redirecturl: "http://localhost:5173/checkout/result"
    };
    const items = [];

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
        callback_url: "https://65d77257fa61.ngrok-free.app/payment/zalopay/callback",
    };

    const data = `${config.app_id}|${order.app_trans_id}|${order.app_user}|${order.amount}|${order.app_time}|${order.embed_data}|${order.item}`;
    order.mac = crypto.createHmac("sha256", config.key1).update(data).digest("hex");

    try {
        const response = await axios.post(config.endpoint, null, { params: order });

        await Order_MD.findByIdAndUpdate(orderId, {
            app_trans_id,
            amount,
            status: "pending",
            payment_status: "unpaid",
        });

        setTimeout(async () => {
            const orderCheck = await Order_MD.findOne({ app_trans_id });
            if (orderCheck && orderCheck.payment_status !== "paid") {
                // Query trạng thái từ ZaloPay trước khi hủy
                const result = await queryZaloPayOrder(app_trans_id);
                if (result.return_code === 1 && result.sub_return_code === 1) {
                    orderCheck.payment_status = "paid";
                    orderCheck.status = "processing";
                    orderCheck.transaction_id = result.zp_trans_id;
                    await orderCheck.save();
                    console.log(`Order ${orderCheck._id} đã thanh toán`);
                } else {
                    orderCheck.status = "canceled";
                    orderCheck.payment_status = "canceled";
                    orderCheck.cancel_reason = "Thanh toán không thành công";
                    orderCheck.cancelled_at = new Date();
                    await orderCheck.save();
                    console.log(`Order ${orderCheck._id} bị hủy sau 1p`);
                }
            }
        }, 1 * 60 * 1000);

        return { ...response.data, app_trans_id };
    } catch (error) {
        console.error("ZaloPay Error:", error?.response?.data || error.message);
        return { return_code: -1, return_message: "Lỗi kết nối ZaloPay" };
    }
};

export const zaloPayCallback = async (req, res) => {
    try {
        const { data, mac, type } = req.body;

        const hash = crypto.createHmac("sha256", config.key2).update(data).digest("hex");
        if (mac !== hash) {
            return res.json({ return_code: -1, return_message: "Invalid MAC" });
        }

        const callbackData = JSON.parse(data);
        const { app_trans_id, zp_trans_id } = callbackData;

        const order = await Order_MD.findOne({ app_trans_id }).populate({
            path: "user_id",
            select: "shipping_addresses email username",
        });

        if (!order) {
            return res.json({ return_code: -1, return_message: "Không tìm thấy đơn hàng" });
        }

        if (type === 1) {
            if (order.payment_status !== "paid") {
                order.payment_status = "paid";
                order.status = "processing";
                order.transaction_id = zp_trans_id;
                await order.save();

                const orderItems = await OrderItem_MD.find({ order_id: order._id })
                    .populate("product_id")
                    .populate({
                        path: "variant_id",
                        populate: [
                            { path: "color", select: "name" },
                            { path: "size", select: "size" },
                        ],
                    });

                await sendEmailOrder(order.user_id.email, order, orderItems);

                // Xóa giỏ hàng
                await CartItem_MD.deleteMany({ cart_id: order.cart_id });
                await Cart_MD.findByIdAndUpdate(order.cart_id, { cart_items: [] });
            }
        }
        return res.json({ return_code: 1, return_message: "success" });
    } catch (error) {
        console.error("🔥ZaloPay callback error:", error);
        return res.json({ return_code: -1, return_message: "Lỗi server" });
    }
};

export const queryZaloPayOrder = async (app_trans_id) => {
    try {
        const data = {
            app_id: config.app_id,
            app_trans_id,
        };

        const dataStr = `${data.app_id}|${data.app_trans_id}|${config.key1}`;
        data.mac = crypto.createHmac("sha256", config.key1).update(dataStr).digest("hex");

        const response = await axios.post(
            "https://sandbox.zalopay.com.vn/v001/tpe/getstatusbyapptransid",
            null,
            { params: data }
        );

        return response.data;
    } catch (err) {
        console.error("ZaloPay query error:", err?.response?.data || err.message);
        return { return_code: -1, return_message: "Lỗi kết nối ZaloPay" };
    }
};

// Mua ngay
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
            payment_method,
            province_id,
            district_id,
            ward_code,
            toDistrictId,
            toWardCode
        } = req.body;

        if (!variant_id || !quantity) {
            return res.status(400).json({ message: "Thiếu thông tin sản phẩm" });
        }

        // --- Kiểm tra variant tồn kho ---
        const variant = await Variant_MD.findById(variant_id).populate("product_id");
        if (!variant || variant.status === "outOfStock") {
            return res.status(404).json({ message: "Sản phẩm không tồn tại hoặc đã hết hàng" });
        }

        const stock = await Stock_MD.findOne({ product_variant_id: variant_id });
        if (!stock || stock.quantity < quantity) {
            return res.status(400).json({ message: "Không đủ hàng trong kho" });
        }

        // --- Xử lý địa chỉ giao hàng ---
        const user = await User_MD.findById(user_id);
        if (!user) return res.status(404).json({ message: "Không tìm thấy người dùng" });

        let fullShippingAddress = "";
        let provinceName = "", districtName = "", wardName = "";
        let finalProvinceId, finalDistrictId, finalWardCode;

        if (shipping_address_id) {
            const existingAddress = user.shipping_addresses.id(shipping_address_id);
            if (!existingAddress) {
                return res.status(404).json({ message: "Không tìm thấy địa chỉ giao hàng đã chọn" });
            }

            fullShippingAddress = `${existingAddress.full_name} - ${existingAddress.phone} - ${existingAddress.address}, ${existingAddress.ward_name}, ${existingAddress.district_name}, ${existingAddress.province_name}`;
            provinceName = existingAddress.province_name;
            districtName = existingAddress.district_name;
            wardName = existingAddress.ward_name;

            finalProvinceId = existingAddress.province_id;
            finalDistrictId = existingAddress.district_id;
            finalWardCode = existingAddress.ward_code;
        } else {
            if (!shipping_address || !full_name || !phone || !province_id || !district_id || !ward_code) {
                return res.status(400).json({ message: "Vui lòng cung cấp đầy đủ thông tin địa chỉ (bao gồm province_id, district_id, ward_code)" });
            }

            const provinces = await getProvinces();
            const districts = await getDistricts(province_id);
            const wards = await getWards(district_id);

            provinceName = provinces.find(p => p.ProvinceID === province_id)?.ProvinceName || "";
            districtName = districts.find(d => d.DistrictID === district_id)?.DistrictName || "";
            wardName = wards.find(w => w.WardCode === ward_code)?.WardName || "";

            if (!provinceName || !districtName || !wardName) {
                return res.status(400).json({ message: "Không tìm thấy thông tin địa chỉ từ GHN" });
            }

            const newShippingAddress = {
                full_name,
                phone,
                address: shipping_address,
                province_id,
                province_name: provinceName,
                district_id,
                district_name: districtName,
                ward_code,
                ward_name: wardName,
                is_default: false
            };

            user.shipping_addresses.push(newShippingAddress);
            await user.save();

            fullShippingAddress = `${full_name} - ${phone} - ${shipping_address}, ${wardName}, ${districtName}, ${provinceName}`;

            finalProvinceId = province_id;
            finalDistrictId = district_id;
            finalWardCode = ward_code;
        }

        // --- Tính giá ---
        const price = variant.price;
        const sub_total = price * quantity;
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
            if (sub_total < voucher.minOrderValue) {
                return res.status(400).json({ message: `Đơn tối thiểu để dùng voucher là ${voucher.minOrderValue}đ` });
            }

            if (voucher.type === "percentage") {
                voucher_discount = (sub_total * voucher.value) / 100;
                if (voucher.maxDiscount) voucher_discount = Math.min(voucher_discount, voucher.maxDiscount);
            } else {
                voucher_discount = voucher.value;
            }
            voucher.usedCount += 1;
            await voucher.save();
        }

        // --- GHN Shipping Fee ---
        let shippingFee = 0, shippingService = null;
        try {
            const totalWeight = (variant.weight || 200) * quantity;

            const districtIdForFee = toDistrictId || finalDistrictId;
            const wardCodeForFee = toWardCode || finalWardCode;

            const { service, fee } = await getAutoShippingFee({
                toDistrictId: districtIdForFee,
                toWardCode: wardCodeForFee,
                weight: totalWeight
            });

            shippingFee = fee.total;
            shippingService = service;
        } catch (err) {
            console.error("GHN fee error:", err.message);
            return res.status(500).json({ message: "Không tính được phí vận chuyển", error: err.message });
        }

        const total_price = sub_total - voucher_discount + shippingFee;
        const app_trans_id = `${moment().format("YYMMDD")}_${Math.floor(Math.random() * 1000000)}`;

        // --- Tạo Order ---
        const order = await Order_MD.create({
            user_id,
            voucher_id: voucher?._id || null,
            voucher_discount,
            sub_total,
            shipping_fee: shippingFee,
            shipping_service: shippingService?.short_name || null,
            total_price,
            shipping_address: fullShippingAddress,
            payment_method,
            status: "pending",
            app_trans_id
        });

        // --- OrderItem ---
        const orderItem = await OrderItem_MD.create({
            order_id: order._id,
            product_id: variant.product_id._id,
            variant_id,
            quantity,
            price
        });

        // --- Chuẩn bị response data ---
        const responseData = {
            ...order.toObject(),
            chiTietDonHang: [orderItem],
            tongGoc: sub_total,
            giamGia: voucher_discount,
            phiShip: shippingFee,
            dichVuShip: shippingService,
            tongThanhToan: total_price,
            province_name: provinceName,
            district_name: districtName,
            ward_name: wardName
        };

        // --- Thanh toán ZaloPay ---
        if (payment_method === "ZALOPAY") {
            const zpResult = await createZaloPayPayment(total_price, order._id, user_id, app_trans_id);
            if (zpResult.return_code === 1) {
                return res.status(201).json({
                    redirectUrl: zpResult.order_url,
                    message: "Đang chuyển hướng đến ZaloPay",
                    donHang: responseData
                });
            } else {
                return res.status(500).json({ message: "Không thể tạo thanh toán ZaloPay", zpResult });
            }
        }

        // --- Notify Admin ---
        const adminAndStaff = await User_MD.find({ role: { $in: ["admin", "employee"] } });
        for (const adminUser of adminAndStaff) {
            await Notification.create({
                user_id: adminUser._id,
                title: "Đơn hàng mới",
                message: `Có đơn hàng mới (#${order.order_code}) từ khách hàng ${user.username || user.email}`,
                type: "new_order",
                data: { order_id: order._id, user_id }
            });
        }

        return res.status(201).json({
            message: "Đơn hàng 'Mua ngay' đã được tạo thành công",
            donHang: responseData
        });

    } catch (error) {
        console.error("Lỗi mua ngay:", error);
        return res.status(500).json({
            message: "Lỗi server khi xử lý mua ngay",
            error: error.message
        });
    }
};

// DEPRECATED - Function cũ, được thay thế bằng requestReturn
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
        // Kiểm tra thời gian giao hàng
        if (!order.delivered_at) {
            return res.status(400).json({
                message: "Không thể hoàn hàng vì thiếu thời điểm giao hàng"
            });
        }

        // const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
        const sevenDaysMs = 1 * 60 * 1000;
        const now = Date.now();
        const deliveredAtMs = new Date(order.delivered_at).getTime();

        // Chỉ cho phép hoàn trong vòng 7 ngày kể từ lúc nhận
        if (now > deliveredAtMs + sevenDaysMs) {
            return res.status(400).json({
                message: "Chỉ được hoàn hàng trong vòng 7 ngày kể từ khi nhận hàng"
            });
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
                    reason: `Order #${order.order_code} returned by customer`,
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
        order.returned_at = new Date();
        await order.save();

        const adminUsers = await User_MD.find({ role: { $in: ['admin', 'employee'] } });

        for (const admin of adminUsers) {
            await Notification.create({
                user_id: admin._id,
                title: 'Khách hàng hoàn hàng',
                message: `Khách hàng đã hoàn đơn hàng #${order.order_code}`,
                type: 'order_returned',
                data: {
                    order_id: order._id,
                    returned_by: req.user._id,
                    returned_at: new Date()
                }
            });
        }

        await Notification.create({
            user_id: req.user._id,
            title: 'Xác nhận hoàn hàng',
            message: `Chúng tôi đã tiếp nhận yêu cầu hoàn hàng cho đơn #${order.order_code}`,
            type: 'order_returned',
            data: {
                order_id: order._id,
                status: 'returned'
            }
        });

        return res.status(200).json({ message: "Hoàn hàng thành công", order });

    } catch (error) {
        console.error("Chi tiết lỗi hoàn hàng:", error);
        return res.status(500).json({ message: "Lỗi hoàn hàng", error: error.message });
    }
};