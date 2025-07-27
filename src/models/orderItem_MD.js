import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema({
    product_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Products",
        required: true,
    },
    variant_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Variant",
        required: true,
    },
    order_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order",
        required: true,
    },
    quantity: {
        type: Number,
        required: true,
    },
    size_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Sizes",
        required: true
    },
    price: {
        type: Number,
        required: true,
    },

}, { timestamps: true });

export default mongoose.model("OrderItem", orderItemSchema);