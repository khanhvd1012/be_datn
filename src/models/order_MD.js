import mongoose from "mongoose";

/**
 * Schema định nghĩa cấu trúc của một đơn hàng
 * @description
 * Các trường thông tin cơ bản:
 * - user_id: Người đặt hàng (reference đến User)
 * - cart_id: Giỏ hàng liên quan (reference đến Cart)
 * - status: Trạng thái đơn hàng (bao gồm các trạng thái hoàn hàng)
 * - payment_status: Trạng thái thanh toán (bao gồm các trạng thái mới)
 * - shipping_address: Địa chỉ giao hàng
 * - payment_method: Phương thức thanh toán
 * - total_price: Tổng giá trị đơn hàng
 * 
 * Thông tin hủy đơn:
 * - cancel_reason: Lý do hủy
 * - cancelled_at: Thời điểm hủy
 * - cancelled_by: Người hủy đơn (user/admin)
 * 
 * Thông tin hoàn hàng:
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
 * Thông tin thanh toán:
 * - payment_date: Thời điểm thanh toán
 * - refund_processed_at: Thời điểm bắt đầu xử lý hoàn tiền
 * - refund_processed_by: Người xử lý hoàn tiền
 * - refunded_at: Thời điểm hoàn tiền thành công
 * - refunded_by: Người thực hiện hoàn tiền
 * 
 * Tính năng:
 * - Tự động tạo createdAt, updatedAt
 * - Virtual fields cho danh sách sản phẩm và labels tiếng Việt
 * - Validate trạng thái đơn hàng và thanh toán
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
                'return_requested',
                'return_accepted',
                'return_rejected',
                'returned',
                'canceled',
                'returned_received'
            ],
            message: 'Trạng thái {VALUE} không hợp lệ'
        },
        default: 'pending'
    },
    payment_method: {
        type: String,
        required: true,
        enum: ['COD', 'ZALOPAY']
    },
    payment_status: {
        type: String,
        enum: {
            values: ['unpaid', 'processing_payment', 'paid', 'canceled', 'refund_processing', 'refunded'],
            message: 'Trạng thái thanh toán {VALUE} không hợp lệ'
        },
        default: 'unpaid'
    },
    shipping_address: {
        type: String,
        required: true
    },
    shipping_fee: {
        type: Number,
        default: 0
    },
    shipping_service: {
        type: String,
        default: null
    },
    app_trans_id: {
        type: String
    },
    transaction_id: {
        type: String
    },
    payment_date: {
        type: Date,
        default: null
    },
    delivered_at: {
        type: Date,
        default: null
    },
    // Thông tin hủy đơn
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
    // Thông tin hoàn hàng
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
    // Xác nhận nhận hàng
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
    images: [{
        type: String,
        required: true,
        trim: true
    }],
    // Thông tin hoàn tiền
    refund_processed_at: {
        type: Date,
        default: null
    },
    refund_processed_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    refunded_at: {
        type: Date,
        default: null
    },
    refunded_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

/**
 * Virtual field để lấy danh sách sản phẩm trong đơn hàng
 */
orderSchema.virtual('items', {
    ref: 'OrderItem',
    localField: '_id',
    foreignField: 'order_id'
});

/**
 * Virtual field để hiển thị trạng thái đơn hàng bằng tiếng Việt
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
 * Virtual field để hiển thị trạng thái thanh toán bằng tiếng Việt
 */
orderSchema.virtual('trangThaiThanhToan').get(function () {
    const paymentStatusMap = {
        'unpaid': 'Chưa thanh toán',
        'paid': 'Đã thanh toán',
        'canceled': 'Hủy thanh toán',
        'refund_processing': 'Xử lý hoàn tiền',
        'refunded': 'Hoàn thanh toán'
    };
    return paymentStatusMap[this.payment_status] || this.payment_status;
});

/**
 * Virtual field mã đơn hàng
 */
orderSchema.virtual('order_code').get(function () {
    return this._id ? `DH${this._id.toString().slice(0, 8).toUpperCase()}` : '';
});

/**
 * Tự động tạo order_code trước khi lưu nếu chưa có
 */
orderSchema.pre('save', async function (next) {
    if (!this.order_code) {
        const count = await this.constructor.countDocuments();
        this.order_code = `DH${(count + 1).toString().padStart(6, '0')}`;
    }
    next();
});

export default mongoose.model("Order", orderSchema);