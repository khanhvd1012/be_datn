// models/Banner.js
import mongoose from "mongoose";

const bannerSchema = new mongoose.Schema({
    title: { type: String, required: true },
    image: { type: String, required: true }, // URL hoặc đường dẫn ảnh
    status: { type: Boolean, default: true }, // Hiển thị hay không
}, { timestamps: true });

export default mongoose.model("Banner", bannerSchema);
