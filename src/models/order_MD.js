import mongoose from "mongoose";

<<<<<<< HEAD
/**
 * Schema định nghĩa cấu trúc của một đơn hàng
 * @description
 * Các trường thông tin cơ bản:
 * - user_id: Người đặt hàng (reference đến User)
 * - cart_id: Giỏ hàng liên quan (reference đến Cart)
 * - status: Trạng thái đơn hàng
 * - shipping_address: Địa chỉ giao hàng
 * - payment_method: Phương thức thanh toán
 * - total_price: Tổng giá trị đơn hàng
 * 
 * Thông tin hủy đơn:
 * - cancel_reason: Lý do hủy
 * - cancelled_at: Thời điểm hủy
 * - cancelled_by: Người hủy đơn (user/admin)
 * 
 * Tính năng:
 * - Tự động tạo createdAt, updatedAt
 * - Virtual fields cho danh sách sản phẩm và labels tiếng Việt
 * - Validate trạng thái đơn hàng
 */
=======
>>>>>>> 1982ae5b937541c479889b7813204594075a6143
const orderSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    cart_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Cart',
        required: true
    },
<<<<<<< HEAD
    voucher_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Voucher',
        default: null
    },
    voucher_discount: {
        type: Number,
        default: 0
    },
    sub_total: {
        type: Number,
        required: true
    },
    total_price: {
        type: Number,
        required: true
    },
=======
>>>>>>> 1982ae5b937541c479889b7813204594075a6143
    status: {
        type: String,
        enum: {
            values: ['pending', 'processing', 'shipped', 'delivered', 'canceled'],
            message: 'Trạng thái {VALUE} không hợp lệ'
        },
        default: 'pending'
    },
<<<<<<< HEAD
    payment_method: {
        type: String,
=======
    shipping_address: {
        type: String
    },
    payment_method: {
        type: String
    },
    total_price: {
        type: Number,
>>>>>>> 1982ae5b937541c479889b7813204594075a6143
        required: true
    },
    cancel_reason: {
        type: String,
        default: null
    },
    cancelled_at: {
        type: Date,
        default: null
    },
    cancelled_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

<<<<<<< HEAD
/**
 * Virtual field để lấy danh sách sản phẩm trong đơn hàng
 * @description
 * - Tự động populate các OrderItem liên quan đến đơn hàng
 * - Sử dụng localField và foreignField để join với collection OrderItem
 */
=======
// Virtual để lấy các sản phẩm trong đơn hàng
>>>>>>> 1982ae5b937541c479889b7813204594075a6143
orderSchema.virtual('items', {
    ref: 'OrderItem',
    localField: '_id',
    foreignField: 'order_id'
});

<<<<<<< HEAD
/**
 * Virtual field để hiển thị trạng thái đơn hàng bằng tiếng Việt
 * @description
 * Mapping các trạng thái:
 * - pending: Chờ xử lý
 * - processing: Đang xử lý
 * - shipped: Đang giao hàng
 * - delivered: Đã giao hàng
 * - canceled: Đã hủy
 */
=======

// Thêm các virtual fields với labels tiếng Việt
>>>>>>> 1982ae5b937541c479889b7813204594075a6143
orderSchema.virtual('trangThai').get(function () {
    const statusMap = {
        'pending': 'Chờ xử lý',
        'processing': 'Đang xử lý',
        'shipped': 'Đang giao hàng',
        'delivered': 'Đã giao hàng',
        'canceled': 'Đã hủy'
    };
    return statusMap[this.status] || this.status;
});

<<<<<<< HEAD
export default mongoose.model("Order", orderSchema);
=======

export default mongoose.model("Orders", orderSchema);
>>>>>>> 1982ae5b937541c479889b7813204594075a6143
