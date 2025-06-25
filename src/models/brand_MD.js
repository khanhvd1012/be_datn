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
}, {
    timestamps: true,
});
<<<<<<< HEAD

const Brands = mongoose.models.Brands || mongoose.model("Brands", brandSchema);
export default Brands;
=======
export default mongoose.model("Brand", brandSchema);
>>>>>>> 1982ae5b937541c479889b7813204594075a6143
