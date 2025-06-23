import mongoose from "mongoose";

const removedCartItemSchema = new mongoose.Schema({
    user_id: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User", 
        required: true 
    },
    variant_id: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Variant", 
        required: true 
    },
    product_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Products",
        required: true
    },
    quantity: { 
        type: Number, 
        required: true, 
        min: 1 
    },
    removed_at: { 
        type: Date, 
        default: Date.now 
    },
    auto_restore: {
        type: Boolean,
        default: true
    },
    restore_expiry: {
        type: Date,
        default: function() {
            // Mặc định là vĩnh viễn (null)
            return null;
        }
    },
    notification_sent: {
        restored: {
            type: Boolean,
            default: false
        }
    }
}, {
    timestamps: true,
});

// Tạo index để tìm kiếm nhanh hơn
removedCartItemSchema.index({ user_id: 1, variant_id: 1 });
removedCartItemSchema.index({ notification_sent: 1 });

const RemovedCartItem = mongoose.models.RemovedCartItem || mongoose.model("RemovedCartItem", removedCartItemSchema);
export default RemovedCartItem; 