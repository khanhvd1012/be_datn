import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: [
            'low_stock',
            'out_of_stock', 
            'new_order', 
            'voucher', 
            'back_in_stock', 
            'order_status', 
            'product_new_user', 
            'product_new_admin',
            'voucher_new_user',
            'voucher_new_admin',
            'contact_new_admin',
            'order_returned',
            'return_request',        // Yêu cầu hoàn hàng mới
            'return_accepted',       // Admin chấp nhận hoàn hàng
            'return_rejected',       // Admin từ chối hoàn hàng
            'order_confirmed'        // Khách hàng xác nhận nhận hàng
        ],
        required: true
    },
    read: {
        type: Boolean,
        default: false
    },
    data: {
        product_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Products"
        },
        variant_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Variant"
        },
        order_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Order"
        },
        customer_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        updated_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        quantity: {
            type: Number
        },
        status: {
            type: String
        },
        cancel_reason: {
            type: String
        },
        return_reason: {
            type: String
        },
        reject_reason: {
            type: String
        },
        cancelled_at: {
            type: Date
        },
        requested_at: {
            type: Date
        },
        confirmed_at: {
            type: Date
        },
        updated_at: {
            type: Date
        },
        returned_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        returned_at: {
            type: Date
        },
        canceled_by: {
            type: String
        }
    }
}, {
    timestamps: true
});

// Tạo index để tìm kiếm nhanh hơn
notificationSchema.index({ user_id: 1, read: 1 });
notificationSchema.index({ createdAt: 1 });
notificationSchema.index({ type: 1 });

const Notification = mongoose.models.Notification || mongoose.model("Notification", notificationSchema);
export default Notification;