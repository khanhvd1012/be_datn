import mongoose from 'mongoose';
import Product from "../models/product_MD";
import Category from "../models/category_MD";
import Brand from "../models/brand_MD";
import Variant from "../models/variant_MD";
import Size from "../models/size_MD";
import Color from "../models/color_MD";

export const getAllProduct = async (req, res) => {
    try {
        const products = await Product.find()
            .populate('category', '_id')
            .populate('brand', '_id')
            .populate('sizes', '_id')
            .populate('colors', '_id')
            .populate({
                path: 'variants',
                populate: [
                    {
                        path: 'sizes.size_id',
                        model: 'Sizes',
                        select: '_id'
                    },
                    { 
                        path: 'color_id',
                        select: '_id'
                    }
                ]
            });
        return res.status(200).json({
            message: "Lấy danh sách sản phẩm thành công",
            data: products
        });
    } catch (error) {
        console.error('Lỗi khi lấy dữ liệu sản phẩm:', error);
        return res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
    }
};

export const getOneProduct = async (req, res) => {
    try {
        const id = req.params.id;
        const product = await Product.findById(id)
            .populate('category', '_id')
            .populate('brand', '_id')
            .populate('sizes', '_id')
            .populate('colors', '_id')
            .populate({
                path: 'variants',
                populate: [
                    {
                        path: 'sizes.size_id',
                        model: 'Sizes',
                        select: '_id'
                    },
                    { 
                        path: 'color_id',
                        select: '_id'
                    }
                ]
            });
        if (!product) {
            return res.status(404).json({
                message: "Không tìm thấy sản phẩm"
            });
        }
        return res.status(200).json({
            message: "Lấy sản phẩm thành công",
            data: product
        });
    } catch (error) {
        console.error('Lỗi khi lấy dữ liệu sản phẩm:', error);
        return res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
    }
};

export const createProduct = async (req, res) => {
    try {
        const { error } = productSchema.validate(req.body, { abortEarly: false });
        if (error) {
            const errors = error.details.map((err) => err.message);
            return res.status(400).json({
                message: errors
            });
        }

        // Kiểm tra màu sắc của sản phẩm
        const { colors, images } = req.body;
        if (!colors || !Array.isArray(colors) || colors.length !== 1) {
            return res.status(400).json({
                message: "Sản phẩm phải có một màu"
            });
        }

        // Kiểm tra images
        if (!images || !Array.isArray(images) || images.length === 0) {
            return res.status(400).json({
                message: "Sản phẩm phải có ít nhất một hình ảnh"
            });
        }

        // Kiểm tra tồn tại của màu
        const colorId = new mongoose.Types.ObjectId(colors[0]);
        const existingColor = await Color.findById(colorId);
        if (!existingColor) {
            return res.status(400).json({
                message: "Màu sắc không tồn tại trong hệ thống"
            });
        }

        // Create new product
        const product = await Product.create({
            ...req.body,
            images: images // Đảm bảo lưu mảng images
        });

        // Create variants with proper reference to product
        if (req.body.variants) {
            const variantPromises = req.body.variants.map(variant => {
                return Variant.create({
                    ...variant,
                    product_id: product._id
                });
            });
            const variants = await Promise.all(variantPromises);
            
            // Update product with variant references
            product.variants = variants.map(v => v._id);
            await product.save();
        }

        // Fetch complete product with populated fields
        const populatedProduct = await Product.findById(product._id)
            .populate('category', '_id')
            .populate('brand', '_id')
            .populate('sizes', '_id')
            .populate('colors', '_id')
            .populate({
                path: 'variants',
                populate: [
                    {
                        path: 'sizes',
                        select: '_id'
                    },
                    { 
                        path: 'color_id',
                        select: '_id'
                    }
                ]
            });

        return res.status(200).json({
            message: "Thêm sản phẩm thành công",
            data: populatedProduct
        });
    } catch (error) {
        console.error('Lỗi khi tạo sản phẩm:', error);
        return res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
    }
};

export const updateProduct = async (req, res) => {
    try {
        const id = req.params.id;
        const { error } = productSchema.validate(req.body, { abortEarly: false });
        if (error) {
            const errors = error.details.map((err) => err.message);
            return res.status(400).json({
                message: errors
            });
        }

        // Kiểm tra màu sắc của sản phẩm
        const { colors, images } = req.body;
        if (!colors || !Array.isArray(colors) || colors.length !== 1) {
            return res.status(400).json({
                message: "Sản phẩm phải có đúng một màu"
            });
        }

        // Kiểm tra images
        if (!images || !Array.isArray(images) || images.length === 0) {
            return res.status(400).json({
                message: "Sản phẩm phải có ít nhất một hình ảnh"
            });
        }

        // Kiểm tra tồn tại của màu
        const colorId = new mongoose.Types.ObjectId(colors[0]);
        const existingColor = await Color.findById(colorId);
        if (!existingColor) {
            return res.status(400).json({
                message: "Màu sắc không tồn tại trong hệ thống"
            });
        }

        // Update product basic info
        const product = await Product.findByIdAndUpdate(id, req.body, { new: true });
        if (!product) {
            return res.status(404).json({
                message: "Không tìm thấy sản phẩm"
            });
        }

        // Handle variants update if provided
        if (req.body.variants) {
            // Remove old variants
            await Variant.deleteMany({ product_id: id });

            // Create new variants
            const variantPromises = req.body.variants.map(variant => {
                return Variant.create({
                    ...variant,
                    product_id: id
                });
            });
            const newVariants = await Promise.all(variantPromises);

            // Update product with new variant references
            product.variants = newVariants.map(v => v._id);
            await product.save();
        }

        // Fetch updated product with populated fields
        const updatedProduct = await Product.findById(id)
            .populate('category', '_id')
            .populate('brand', '_id')
            .populate('sizes', '_id')
            .populate('colors', '_id')
            .populate({
                path: 'variants',
                populate: [
                    {
                        path: 'sizes',
                        select: '_id'
                    },
                    { 
                        path: 'color_id',
                        select: '_id'
                    }
                ]
            });

        return res.status(200).json({
            message: "Cập nhật sản phẩm thành công",
            data: updatedProduct
        });
    } catch (error) {
        console.error('Lỗi khi cập nhật sản phẩm:', error);
        return res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
    }
};

export const removeProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
        }

        // Remove references from category and brand
        await Category.findByIdAndUpdate(product.category, {
            $pull: { products: product._id }
        });

        await Brand.findByIdAndUpdate(product.brand, {
            $pull: { products: product._id }
        });

        // Remove references from sizes and colors
        await Size.updateMany(
            { _id: { $in: product.sizes } },
            { $pull: { products: product._id } }
        );

        await Color.updateMany(
            { _id: { $in: product.colors } },
            { $pull: { products: product._id } }
        );

        // Delete all variants of the product
        await Variant.deleteMany({ product_id: product._id });

        // Delete the product
        await Product.findByIdAndDelete(req.params.id);

        return res.status(200).json({ 
            message: "Xóa sản phẩm và các biến thể liên quan thành công" 
        });
    } catch (error) {
        console.error("Lỗi khi xóa sản phẩm:", error);
        return res.status(500).json({ message: "Lỗi khi xóa sản phẩm" });
    }
};

export const getProductVariants = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id)
            .populate('variants')
            .populate('sizes')
            .populate('colors');
            
        if (!product) {
            return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
        }

        const variants = await Variant.find({ product_id: req.params.id })
            .populate({
                path: 'sizes.size_id',
                model: 'Sizes'
            })
            .populate('color_id');

        return res.status(200).json({
            message: "Lấy thông tin biến thể thành công",
            data: {
                productName: product.name,
                availableSizes: product.sizes,
                availableColors: product.colors,
                variants: variants
            }
        });
    } catch (error) {
        return res.status(500).json({ 
            message: "Lỗi khi lấy danh sách biến thể",
            error: error.message
        });
    }
};