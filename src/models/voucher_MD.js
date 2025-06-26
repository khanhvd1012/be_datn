import mongoose from "mongoose";
import { updateVoucherOnSave } from "../middleware/voucher_MID.js";

const voucherSchema = new mongoose.Schema({
    code: { 
        type: String, 
        required: true,
        unique: true,
        uppercase: true
    },
    type: {
        type: String,
        enum: ['percentage', 'fixed'],
        required: true
    },
    value: {
        type: Number,
        required: true,
        min: 0
    },
    maxDiscount: {
        type: Number,
        min: 0,
        default: null
    },
    minOrderValue: {
        type: Number,
        min: 0,
        default: 0
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    quantity: {
        type: Number,
        min: 0,
        required: true
    },
    usedCount: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Add middleware to update voucher status before save
voucherSchema.pre('save', updateVoucherOnSave);

export default mongoose.model("Voucher", voucherSchema);