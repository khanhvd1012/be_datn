import mongoose from "mongoose";

const imageSchema = new mongoose.Schema({
    url: {
        type: String,
        required: true,
        trim: true,
    },
}, { timestamps: true });
const Image = mongoose.models.Image || mongoose.model('Image', imageSchema);
export default Image;