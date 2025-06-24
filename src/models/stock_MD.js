import mongoose from "mongoose";

const stockSchema = new mongoose.Schema({
    product_variant_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Variant',
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 0
    },
    last_updated: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true })
export default mongoose.model('Stock', stockSchema);
