import mongoose from "mongoose";

const cartItemSchema = new mongoose.Schema({
    cart_id: { type: mongoose.Schema.Types.ObjectId, ref: "Cart", required: true },
    product_id: { type: mongoose.Schema.Types.ObjectId, ref: "Products" },
    variant_id: { type: mongoose.Schema.Types.ObjectId, ref: "Variant", required: true },
    size_id: { type: mongoose.Schema.Types.ObjectId, ref: "Sizes", required: true },
    quantity: { type: Number, required: true, min: 1 },
}, {
    timestamps: true,
});

const CartItem = mongoose.models.CartItem || mongoose.model("CartItem", cartItemSchema);
export default CartItem;