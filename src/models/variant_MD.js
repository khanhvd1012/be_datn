import mongoose from "mongoose";
import { updateProductOnVariantSave } from "../middleware/variant_MID";

const variantSchema = new mongoose.Schema({
    product_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Products',
        required: true
    },
    sizes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Sizes',
        required: true
    }],
    quantity: {
        type: Number,
        required: true,
        min: 0,
        default: 0
    },
    color_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Colors',
        required: true
    },
    sku: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    images: [{
        type: String,
        required: true
    }],
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    }

},{ timestamps: true });

variantSchema.pre('save', updateProductOnVariantSave);

export default mongoose.model('Variants', variantSchema);