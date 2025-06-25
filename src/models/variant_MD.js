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
    sizes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Sizes',
        required: true
    }],
    quantity: {
        type: Number,
        required: true,
        min: 0,
        default: 0
    },
    color_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Colors',
        required: true
    },
    sku: {
        type: String,
        required: [true, 'SKU là bắt buộc'],
        unique: true,
        trim: true
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    images: [{
        type: String,
<<<<<<< HEAD
        required: true,
        trim: true
    },
    import_price: {
        type: Number,
        required: true,
        min: 0
    },
    status: {
        type: String,
        enum: ['inStock', 'outOfStock'],
        default: 'inStock'
    }
},{ timestamps: true });

const Variant = mongoose.models.Variant || mongoose.model('Variant', variantSchema);
export default Variant;
=======
        required: true
    }],
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    }

}, { timestamps: true });

variantSchema.pre('save', updateProductOnVariantSave);

export default mongoose.models.Variants || mongoose.model("Variants", variantSchema);
>>>>>>> 1982ae5b937541c479889b7813204594075a6143
