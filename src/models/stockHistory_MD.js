import mongoose from "mongoose";

const stockHistorySchema = new mongoose.Schema({
    stock_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Stocks', required: true },
    quantity_change: { type: Number, required: true },
    reason: { type: String, required: true },
}, { timestamps: true });
export default mongoose.model("StockHistories", stockHistorySchema);