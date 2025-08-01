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
        enum: ['low_stock', 'new_order', 'voucher', 'back_in_stock', 'order_status'],
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
        quantity: {
            type: Number
        }
    }
}, {
    timestamps: true
});

// Tạo index để tìm kiếm nhanh hơn
notificationSchema.index({ user_id: 1, read: 1 });
notificationSchema.index({ createdAt: 1 });

const Notification = mongoose.models.Notification || mongoose.model("Notification", notificationSchema);
export default Notification; 