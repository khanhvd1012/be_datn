import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        user_id: { type: String, required: true, unique: true },
        username: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        password: { type: String, required: true },
        full_name: { type: String },
        address: { type: String },
        phone: { type: String },
        role: { type: String, enum: ["user", "employee", "admin"], default: "user" },
    },
    { timestamps: true }
);

export default mongoose.model("User", userSchema);
