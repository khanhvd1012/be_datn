import mongoose from "mongoose"
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
        ref: "Brands"
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Categories"
    },
    gender: {
        type: String,
        enum: ['unisex', 'male', 'female']
    },
    variants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Variants"
    }],
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
    }
}, { timestamps: true });

productSchema.plugin(mongoosePaginate);

export default mongoose.model("Products", productSchema);
