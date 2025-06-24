import mongoose from "mongoose";

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    logo_image: {
        type: String
    },
    products: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Products'
    }],
}, { timestamps: true });

const Categories = mongoose.models.Categories || mongoose.model('Categories', categorySchema);

export default Categories;