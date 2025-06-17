import mongoose from "mongoose";

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
    status: {
        type: String,
        enum: {
            values: ['pending', 'processing', 'shipped', 'delivered', 'canceled'],
            message: 'Trạng thái {VALUE} không hợp lệ'
        },
        default: 'pending'
    },
    shipping_address: {
        type: String
    },
    payment_method: {
        type: String
    },
    total_price: {
        type: Number,
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

// Virtual để lấy các sản phẩm trong đơn hàng
orderSchema.virtual('items', {
    ref: 'OrderItem',
    localField: '_id',
    foreignField: 'order_id'
});


// Thêm các virtual fields với labels tiếng Việt
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


export default mongoose.model("Orders", orderSchema);