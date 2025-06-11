import mongoose from "mongoose";
import { updateProductOnVariantSave } from "../middleware/variant_MID";

const variantSchema = new mongoose.Schema({
    product_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Products',
        required: true
    },
    sku: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    color: {
        type: String,
        required: true,
        trim: true
    },
    size: {
        type: String,
        required: true,
        trim: true
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    image_url: {
        type: String,
        required: true,
        trim: true
    },
    import_price: {
        type: Number,
        required: true,
        min: 0
    },

},{ timestamps: true });


variantSchema.pre('save', updateProductOnVariantSave);

export default mongoose.model('Variants', variantSchema);