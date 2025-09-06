import mongoose from "mongoose";

const shippingAddressSchema = new mongoose.Schema({
    full_name: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    is_default: { type: Boolean, default: false }
}, { _id: true, timestamps: true });

const userSchema = new mongoose.Schema(
    {
        user_id: { type: String, required: true, unique: true },
        username: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        password: { type: String, required: false },
        image: { type: String, default: "" },
        shipping_addresses: [shippingAddressSchema],
        isBlocked: { type: Boolean, default: false }, 
        blockReason: { type: String, default: "" }, 
        blockedBy: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: "User",  
            default: null 
        },
        role: { type: String, enum: ["user", "employee", "admin"], default: "user" },
        auto_restore_cart: {
            type: Boolean,
            default: true
        },
        otpCode: { type: String },
        otpExpires: { type: Date },
    },
    { timestamps: true }
);

// Middleware để đảm bảo chỉ có một địa chỉ mặc định
userSchema.pre('save', async function (next) {
    if (this.isModified('shipping_addresses')) {
        const defaultAddresses = this.shipping_addresses.filter(addr => addr.is_default);
        if (defaultAddresses.length > 1) {
            // Nếu có nhiều hơn 1 địa chỉ mặc định, chỉ giữ địa chỉ mặc định cuối cùng
            for (let i = 0; i < defaultAddresses.length - 1; i++) {
                const addr = this.shipping_addresses.id(defaultAddresses[i]._id);
                if (addr) addr.is_default = false;
            }
        }
    }
    next();
});

export default mongoose.model("User", userSchema);
