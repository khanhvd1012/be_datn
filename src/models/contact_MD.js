// models/contact_MD.js
import mongoose from "mongoose";

const contactSchema = new mongoose.Schema(
  {
    username: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    message: { type: String, required: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, 
    },
  },
  { timestamps: true }
);

export default mongoose.models.Contact || mongoose.model("Contact", contactSchema);
