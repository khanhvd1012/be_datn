import mongoose from "mongoose"
import mongoosePaginate from 'mongoose-paginate-v2';

/**
 * Schema định nghĩa cấu trúc của một sản phẩm
 * @description
 * Các trường thông tin:
 * - name: Tên sản phẩm (bắt buộc)
 * - description: Mô tả sản phẩm
 * - brand: Thương hiệu (reference đến collection Brands)
 * - category: Danh mục (reference đến collection Categories)
 * - variants: Danh sách các biến thể (reference đến collection Variants)
 * - images: Danh sách hình ảnh
 * 
 * Tính năng:
 * - Tự động tạo createdAt, updatedAt
 * - Hỗ trợ phân trang với mongoose-paginate-v2
 */
const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    brand: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Brands"
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Categories"
    },
    variants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Variant"
    }],
    slug: { type: String, required: true, unique: true }
}, { timestamps: true });

// Plugin hỗ trợ phân trang
productSchema.plugin(mongoosePaginate);

export default mongoose.models.Products || mongoose.model("Products", productSchema);
