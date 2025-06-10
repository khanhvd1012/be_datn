import mongoose from "mongoose";

const cartSchema = new mongoose.Schema({
    user_id: {type: mongoose.Schema.Types.ObjectId, ref: "User", required: true},
    cart_items: [{ type: mongoose.Schema.Types.ObjectId, ref: "Cart_item" }],
},{
    timestamps: true,
});

export default mongoose.model("Carts", cartSchema);