import mongoose from "mongoose";



const variantSchema = new mongoose.Schema({
    product_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
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

export default mongoose.model('Variant', variantSchema);