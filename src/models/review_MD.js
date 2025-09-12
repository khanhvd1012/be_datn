import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    order_item: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "OrderItem",
        required: true
    },
    images: [{
        type: String,
        required: true,
        trim: true
    }],
    product_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Products",
        required: true
    },
    product_variant_id: { // Thêm trường này để đồng bộ với controller
        type: mongoose.Schema.Types.ObjectId,
        ref: "Variant"
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    comment: {
        type: String,
        required: true
    },
    admin_reply: {
        type: String,
        default: ""
    }
}, { timestamps: true })

export default mongoose.model("Review", reviewSchema)