import mongoose from "mongoose";

const stockHistorySchema = new mongoose.Schema({
    stock_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Stock', required: true },
    quantity_change: { type: Number, required: true },
    reason: { type: String, required: true },
}, { timestamps: true });
export default mongoose.model("StockHistory", stockHistorySchema);