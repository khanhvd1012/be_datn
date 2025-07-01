import mongoose from "mongoose";

const imageSchema = new mongoose.Schema({
    images: {
        type: String,
        required: true,
        trim: true,
    },
}, { timestamps: true });
const Image = mongoose.models.Image || mongoose.model('Image', imageSchema);
export default Image;