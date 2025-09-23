import mongoose from "mongoose";

/**
 * Schema định nghĩa cấu trúc của một đơn hàng
 * @description
 * Các trường thông tin cơ bản:
 * - user_id: Người đặt hàng (reference đến User)
 * - cart_id: Giỏ hàng liên quan (reference đến Cart)
 * - status: Trạng thái đơn hàng (bao gồm các trạng thái hoàn hàng mới)
 * - shipping_address: Địa chỉ giao hàng
 * - payment_method: Phương thức thanh toán
 * - total_price: Tổng giá trị đơn hàng
 * 
 * Thông tin hủy đơn:
 * - cancel_reason: Lý do hủy
 * - cancelled_at: Thời điểm hủy
 * - cancelled_by: Người hủy đơn (user/admin)
 * 
 * Thông tin hoàn hàng mới:
 * - return_reason: Lý do yêu cầu hoàn hàng
 * - return_requested_at: Thời điểm yêu cầu hoàn hàng
 * - return_accepted_at: Thời điểm admin chấp nhận hoàn hàng
 * - return_accepted_by: Admin chấp nhận hoàn hàng
 * - return_rejected_at: Thời điểm admin từ chối hoàn hàng
 * - return_rejected_by: Admin từ chối hoàn hàng
 * - return_reject_reason: Lý do từ chối hoàn hàng
 * - returned_at: Thời điểm hoàn hàng thành công
 * - confirmed_received: Khách hàng đã xác nhận nhận hàng
 * - confirmed_received_at: Thời điểm xác nhận nhận hàng
 * 
 * Tính năng:
 * - Tự động tạo createdAt, updatedAt
 * - Virtual fields cho danh sách sản phẩm và labels tiếng Việt
 * - Validate trạng thái đơn hàng với các trạng thái hoàn hàng mới
 */
const orderSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    cart_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Cart',
    },
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
    status: {
        type: String,
        enum: {
            values: [
                'pending', 
                'processing', 
                'shipped', 
                'delivered', 
                'return_requested',  // Khách hàng yêu cầu hoàn hàng
                'return_accepted',   // Admin chấp nhận hoàn hàng
                'return_rejected',   // Admin từ chối hoàn hàng
                'returned',          // Hoàn hàng thành công
                'canceled'
            ],
            message: 'Trạng thái {VALUE} không hợp lệ'
        },
        default: 'pending'
    },
    payment_method: {
        type: String,
        required: true
    },
    // Địa chỉ giao hàng dạng chuỗi: "Họ tên - SĐT - Địa chỉ"
    shipping_address: {
        type: String
    },
    payment_status: {
        type: String,
        enum: {
            values: ['unpaid', 'paid', 'failed', 'canceled', 'refunded'],
            message: 'Trạng thái thanh toán {VALUE} không hợp lệ'
        },
        default: 'unpaid'
    },
    // Thời điểm giao hàng thành công
    delivered_at: {
        type: Date,
        default: null
    },
    app_trans_id: { type: String, required: true },
    
    // ===== THÔNG TIN HỦY ĐŠN =====
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
    
    // ===== THÔNG TIN HOÀN HÀNG MỚI =====
    return_reason: {
        type: String,
        default: null
    },
    return_requested_at: {
        type: Date,
        default: null
    },
    return_accepted_at: {
        type: Date,
        default: null
    },
    return_accepted_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    return_rejected_at: {
        type: Date,
        default: null
    },
    return_rejected_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    return_reject_reason: {
        type: String,
        default: null
    },
    returned_at: {
        type: Date,
        default: null
    },
    
    // ===== XÁCH NHẬN NHẬN HÀNG =====
    confirmed_received: {
        type: Boolean,
        default: false
    },
    confirmed_received_at: {
        type: Date,
        default: null
    },
    
    shipping_fee: { type: Number, default: 0 },
    shipping_service: { type: String, default: null },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

/**
 * Virtual field để lấy danh sách sản phẩm trong đơn hàng
 * @description
 * - Tự động populate các OrderItem liên quan đến đơn hàng
 * - Sử dụng localField và foreignField để join với collection OrderItem
 */
orderSchema.virtual('items', {
    ref: 'OrderItem',
    localField: '_id',
    foreignField: 'order_id'
});

/**
 * Virtual field để hiển thị trạng thái đơn hàng bằng tiếng Việt
 * @description
 * Mapping các trạng thái bao gồm cả trạng thái hoàn hàng mới:
 * - pending: Chờ xử lý
 * - processing: Đang xử lý
 * - shipped: Đang giao hàng
 * - delivered: Đã giao hàng
 * - return_requested: Yêu cầu hoàn hàng
 * - return_accepted: Chấp nhận hoàn hàng
 * - return_rejected: Từ chối hoàn hàng
 * - returned: Đã hoàn hàng
 * - canceled: Đã hủy
 */
orderSchema.virtual('trangThai').get(function () {
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
    return statusMap[this.status] || this.status;
});

/**
 * Virtual field mã đơn hàng (10 ký tự đầu của _id)
 */
orderSchema.virtual('order_code').get(function () {
    return this._id ? this._id.toString().slice(0, 10) : '';
});

export default mongoose.model("Order", orderSchema);
