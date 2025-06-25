import mongoose from "mongoose";
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
        ref: "Brand"
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Categories"
    },
<<<<<<< HEAD
    variants: [{
=======
    gender: {
        type: String,
        enum: ['unisex', 'male', 'female']
    },
    sizes: [{
>>>>>>> 1982ae5b937541c479889b7813204594075a6143
        type: mongoose.Schema.Types.ObjectId,
        ref: "Sizes"
    }],    
    colors: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Colors',
        required: true   
    },
    images: [{
        type: String
    }],
<<<<<<< HEAD
=======
    price: {
        type: Number,
        required: true,
        min: 0
    },
    status: {
        type: String,
        enum: ['inStock', 'outOfStock'],
        default: 'inStock'
    },
    variants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Variants"
    }],
>>>>>>> 1982ae5b937541c479889b7813204594075a6143
}, { timestamps: true });

// Plugin hỗ trợ phân trang
productSchema.plugin(mongoosePaginate);

<<<<<<< HEAD
export default mongoose.model("Products", productSchema);
=======
export default mongoose.models.Products || mongoose.model("Products", productSchema);
>>>>>>> 1982ae5b937541c479889b7813204594075a6143
