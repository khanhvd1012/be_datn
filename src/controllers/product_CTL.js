import mongoose from 'mongoose';
import Product from "../models/product_MD";
import Category from "../models/category_MD";
import Brand from "../models/brand_MD";
import Variant from "../models/variant_MD";

export const getAllProduct = async (req, res) => {
    try {
        const products = await Product.find()
            .populate('category', 'name')
            .populate('brand', 'name');
        res.status(200).json(products);
    } catch (error) {
        console.error('Lỗi khi lấy dữ liệu sản phẩm:', error);
        res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
    }
};

export const getOneProduct = async (req, res) => {
    try {
        // Validate object ID format
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "ID sản phẩm không hợp lệ" });
        }

        // First try to find the product without population to check if it exists
        const productExists = await Product.findById(req.params.id);
        if (!productExists) {
            return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
        }

        // Then try to populate fields one by one to identify any issues
        try {
            const product = await Product.findById(req.params.id)
                .populate('category')
                .populate('brand')
                .populate('variants');

            return res.status(200).json(product);
        } catch (populateError) {
            console.error('Error populating product references:', populateError);
            // Return the unpopulated product if population fails
            return res.status(200).json(productExists);
        }
    } catch (error) {
        console.error('Error fetching product:', error);
        return res.status(500).json({ 
            message: "Lỗi khi lấy thông tin sản phẩm",
            error: error.message
        });
    }
};

export const createProduct = async (req, res) => {
    try {
        const productData = {
            name: req.body.name,
            description: req.body.description,
            brand: req.body.brand,
            category: req.body.category,
            gender: req.body.gender,
            variants: req.body.variants || [],
            images: req.body.images || [],
            price: req.body.price,
            status: req.body.status || 'active'
        };

        const product = await Product.create(productData);

        // Lấy thông tin sản phẩm đã tạo với đầy đủ thông tin category và brand
        const populatedProduct = await Product.findById(product._id)
            .populate('category')
            .populate('brand');

        // Cập nhật danh sách sản phẩm trong Category và Brand
        await Category.findByIdAndUpdate(req.body.category, {
            $push: { products: product._id }
        });

        await Brand.findByIdAndUpdate(req.body.brand, {
            $push: { products: product._id }
        });

        // Trả về sản phẩm đã được tạo với đầy đủ thông tin
        return res.status(201).json({
            message: "Tạo sản phẩm thành công",
            data: populatedProduct
        });

    } catch (error) {
        console.error("Lỗi khi tạo sản phẩm:", error);
        return res.status(500).json({ 
            message: "Lỗi khi tạo sản phẩm mới",
            error: error.message 
        });
    }
};

export const updateProduct = async (req, res) => {
    try {
        // Lấy thông tin sản phẩm cũ
        const oldProduct = await Product.findById(req.params.id);
        if (!oldProduct) {
            return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
        }

        // Chuẩn bị dữ liệu cập nhật
        const updateData = {
            name: req.body.name,
            description: req.body.description,
            brand: req.body.brand,
            category: req.body.category,
            gender: req.body.gender,
            variants: req.body.variants,
            images: req.body.images,
            price: req.body.price,
            status: req.body.status
        };

        // Cập nhật sản phẩm
        const updatedProduct = await Product.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        ).populate('category').populate('brand');

        // Nếu category thay đổi, cập nhật danh sách sản phẩm trong các category
        if (oldProduct.category.toString() !== req.body.category) {
            // Xóa sản phẩm khỏi category cũ
            await Category.findByIdAndUpdate(oldProduct.category, {
                $pull: { products: oldProduct._id }
            });

            // Thêm sản phẩm vào category mới
            await Category.findByIdAndUpdate(req.body.category, {
                $push: { products: oldProduct._id }
            });
        }

        // Nếu brand thay đổi, cập nhật danh sách sản phẩm trong các brand
        if (oldProduct.brand.toString() !== req.body.brand) {
            // Xóa sản phẩm khỏi brand cũ
            await Brand.findByIdAndUpdate(oldProduct.brand, {
                $pull: { products: oldProduct._id }
            });

            // Thêm sản phẩm vào brand mới
            await Brand.findByIdAndUpdate(req.body.brand, {
                $push: { products: oldProduct._id }
            });
        }

        return res.status(200).json({
            message: "Cập nhật sản phẩm thành công",
            data: updatedProduct
        });

    } catch (error) {
        console.error("Lỗi khi cập nhật sản phẩm:", error);
        return res.status(500).json({ 
            message: "Lỗi khi cập nhật sản phẩm",
            error: error.message 
        });
    }
};

export const removeProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            throw new AppError('Không tìm thấy sản phẩm', 404);
        }

        // Kiểm tra sản phẩm có đơn hàng không
        const hasOrders = await Order.exists({
            'items.product': product._id
        });
        if (hasOrders) {
            throw new AppError('Không thể xóa sản phẩm đã có đơn hàng', 400);
        }

        // Xóa sản phẩm khỏi danh sách của category và brand
        await Category.findByIdAndUpdate(product.category, {
            $pull: { products: product._id }
        });

        await Brand.findByIdAndUpdate(product.brand, {
            $pull: { products: product._id }
        });

        // Xóa sản phẩm
        await Product.findByIdAndDelete(req.params.id);

        return res.status(200).json({ message: "Xóa sản phẩm thành công" });
    } catch (error) {
        next(error);
    }
};

/**
 * Controller lấy danh sách biến thể của sản phẩm
 * @description
 * - Tìm sản phẩm theo ID
 * - Populate thông tin variants và stock của từng variant
 * - Trả về danh sách variants của sản phẩm
 */
export const getProductVariants = async (req, res, next) => {
    try {
        const product = await Product.findById(req.params.id).populate('variants');
        if (!product) {
            throw new AppError('Không tìm thấy sản phẩm', 404);
        }
        return res.status(200).json({
            tenSanPham: product.name,
            bienThe: product.variants
        });
    } catch (error) {
        return res.status(500).json({ message: "Lỗi khi lấy danh sách biến thể" });
    }
};

export const validateAndNormalizeVariant = (variant, index) => {
    if (!variant.sku || typeof variant.sku !== 'string' || !variant.sku.trim()) {
        throw new Error(`Variant ${index + 1} thiếu hoặc sai SKU`);
    }
    if (!variant.color_id) {
        throw new Error(`Variant ${index + 1} thiếu color_id`);
    }
    if (!Array.isArray(variant.sizes) || variant.sizes.length === 0) {
        throw new Error(`Variant ${index + 1} thiếu sizes`);
    }
    if (typeof variant.price !== 'number' || variant.price < 0) {
        throw new Error(`Variant ${index + 1} giá không hợp lệ`);
    }
    if (!Array.isArray(variant.images) || variant.images.length === 0) {
        throw new Error(`Variant ${index + 1} thiếu hình ảnh`);
    }

    return {
        sku: variant.sku.trim(),
        color_id: variant.color_id,
        sizes: variant.sizes,
        price: variant.price,
        images: variant.images,
        quantity: variant.quantity || 0,
        status: variant.status || 'active'
    };
};