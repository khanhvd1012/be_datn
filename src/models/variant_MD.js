import mongoose from "mongoose";

/**
 * Schema định nghĩa cấu trúc của một biến thể sản phẩm
 * @description
 * Các trường thông tin:
 * - product_id: ID của sản phẩm gốc (reference đến Products)
 * - sku: Mã SKU duy nhất (được tự động tạo)
 * - color: Màu sắc
 * - size: Kích thước
 * - price: Giá bán
 * - image_url: URL hình ảnh của biến thể
 * - import_price: Giá nhập
 * - status: Trạng thái hàng tồn
 * 
 * Tính năng:
 * - Tự động tạo SKU khi tạo mới biến thể
 * - Tự động cập nhật danh sách variants trong sản phẩm gốc
 * - Tự động trim các trường string
 * - Validate giá > 0
 * - Tự động tạo createdAt, updatedAt
 */
const variantSchema = new mongoose.Schema({
    product_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Products',
        required: true
    },
    sku: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    color: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Colors',
        required: true
    },
    size: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Sizes',
        required: true
    },
    gender: {
        type: String,
        enum: ['unisex', 'male', 'female'],
        required: true,
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    image_url: [{
        type: String,
        required: true,
        trim: true
    }],
    import_price: {
        type: Number,
        required: true,
        min: 0
    },
    stock: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Stock'
    },
    status: {
        type: String,
        enum: ['inStock', 'outOfStock'],
        default: 'inStock'
    }
}, { timestamps: true });

const Variant = mongoose.models.Variant || mongoose.model('Variant', variantSchema);
export default Variant;