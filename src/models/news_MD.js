import mongoose from "mongoose";

const newsSchema = new mongoose.Schema(
    {
        title: { type: String, required: true, unique: true },
        content: { type: String, required: true },
        images: [{
            type: String,
            required: true,
            trim: true
        }],
        author: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
    },
    { timestamps: true }
);

export default mongoose.model("News", newsSchema);
