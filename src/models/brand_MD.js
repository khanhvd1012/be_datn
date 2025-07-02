import mongoose from "mongoose";

const brandSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    logo_image: {
        type: String,
        required: true,
    },
    products: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Products'
    }],
    category: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Categories"
    }],
}, {
    timestamps: true,
});

const Brands = mongoose.models.Brands || mongoose.model("Brands", brandSchema);
export default Brands;