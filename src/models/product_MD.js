import mongoose from "mongoose";
import mongoosePaginate from 'mongoose-paginate-v2';

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    brand: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Brand"
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Categories"
    },
    gender: {
        type: String,
        enum: ['unisex', 'male', 'female']
    },
    sizes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Sizes"
    }],    
    colors: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Colors',
        required: true   
    },
    images: [{
        type: String
    }],
    price: {
        type: Number,
        required: true,
        min: 0
    },
    status: {
        type: String,
        enum: ['inStock', 'outOfStock'],
        default: 'inStock'
    },
    variants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Variants"
    }],
}, { timestamps: true });

productSchema.plugin(mongoosePaginate);

export default mongoose.models.Products || mongoose.model("Products", productSchema);
