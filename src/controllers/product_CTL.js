import mongoose from 'mongoose';
import Product from "../models/product_MD";
import Category from "../models/category_MD";
import Brand from "../models/brand_MD";
import Variant from "../models/variant_MD";
import Size from "../models/size_MD";
import Color from "../models/color_MD";
import { productSchema } from "../validators/product_VLD.js";

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
                        path: 'sizes',
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
    let product = null;

    try {
        const { error } = productSchema.validate(req.body, { abortEarly: false });
        if (error) {
            return res.status(400).json({
                message: error.details.map((err) => err.message)
            });
        }

        const { name, description, brand, category, gender, sizes, colors, images, price, variants } = req.body;

        // Validate colors
        if (!colors || typeof colors !== 'string') {
            return res.status(400).json({
                message: "Sản phẩm phải có một màu và phải là ID hợp lệ"
            });
        }

        // Validate images
        if (!images || !Array.isArray(images) || images.length === 0) {
            return res.status(400).json({
                message: "Sản phẩm phải có ít nhất một hình ảnh"
            });
        }

        // Check if color exists
        const colorId = new mongoose.Types.ObjectId(colors);
        const existingColor = await Color.findById(colorId);
        if (!existingColor) {
            return res.status(400).json({
                message: "Màu sắc không tồn tại trong hệ thống"
            });
        }

        // Validate variants if they exist
        if (variants && Array.isArray(variants)) {
            console.log("👉 Variants từ client:", variants);
            // Validate SKU format và các trường bắt buộc khác
            for (const variant of variants) {
                // Validate SKU
                if (!variant.sku || typeof variant.sku !== 'string' || variant.sku.trim().length === 0) {
                    return res.status(400).json({
                        message: "SKU không được để trống cho variant"
                    });
                }
                variant.sku = variant.sku.trim();

                // Validate color_id
                if (!variant.color_id || typeof variant.color_id !== 'string') {
                    return res.status(400).json({
                        message: "Mỗi variant phải có một color_id hợp lệ"
                    });
                }

                // Validate sizes
                if (!variant.sizes || !Array.isArray(variant.sizes) || variant.sizes.length === 0) {
                    return res.status(400).json({
                        message: "Mỗi variant phải có ít nhất một size"
                    });
                }

                // Validate price
                if (typeof variant.price !== 'number' || variant.price < 0) {
                    return res.status(400).json({
                        message: "Mỗi variant phải có giá hợp lệ"
                    });
                }

                // Validate images
                if (!variant.images || !Array.isArray(variant.images) || variant.images.length === 0) {
                    return res.status(400).json({
                        message: "Mỗi variant phải có ít nhất một hình ảnh"
                    });
                }
            }

            // Check for duplicate SKUs within new variants
            const skus = variants.map(v => v.sku);
            const uniqueSkus = new Set(skus);
            if (uniqueSkus.size !== skus.length) {
                const duplicates = skus.filter((sku, index) => skus.indexOf(sku) !== index);
                return res.status(400).json({
                    message: `Các SKU bị trùng trong yêu cầu: ${[...new Set(duplicates)].join(', ')}`
                });
            }

            // Validate color_id format
            for (const variant of variants) {
                if (!variant.color_id || typeof variant.color_id !== 'string') {
                    return res.status(400).json({
                        message: "Mỗi variant phải có một color_id hợp lệ"
                    });
                }
            }

            // Check for duplicate colors
            const variantColorIds = variants.map(v => v.color_id.toString());
            if (new Set(variantColorIds).size !== variantColorIds.length) {
                return res.status(400).json({
                    message: "Có màu sắc trùng lặp trong danh sách variants"
                });
            }

            // Check for existing SKUs in database
            const existingSKUs = await Variant.find({
                sku: { $in: skus }
            });

            if (existingSKUs.length > 0) {
                return res.status(400).json({
                    message: "Có SKU đã tồn tại trong hệ thống",
                    existingSKUs: existingSKUs.map(v => v.sku)
                });
            }
        }

        // Create product
        const productData = {
            name: req.body.name,
            description: req.body.description,
            brand: req.body.brand,
            category: req.body.category,
            gender: req.body.gender,
            sizes: req.body.sizes,
            colors: colors,
            images: req.body.images,
            price: req.body.price
        };

        product = await Product.create(productData);

        if (variants && Array.isArray(variants)) {
            // Đảm bảo mỗi variant có đầy đủ thông tin bắt buộc
            const variantData = variants.map((variant, index) => {
                const data = {
                    sku: variant.sku?.trim(), // trim an toàn
                    sizes: variant.sizes,
                    price: variant.price,
                    color_id: variant.color_id,
                    images: variant.images,
                    quantity: variant.quantity ?? 0,
                    status: variant.status ?? 'active',
                    product_id: product._id
                };

                // Log từng variant chuẩn bị lưu
                console.log(`🟡 Variant #${index + 1} chuẩn bị lưu:`, data);
                return data;
            });

            try {
                const createdVariants = [];
                for (const data of variantData) {
                    const variant = new Variant(data);
                    await variant.save(); // sẽ gọi pre('save')
                    createdVariants.push(variant);
                }
                product.variants = createdVariants.map(v => v._id);
                await product.save();
            } catch (variantError) {
                console.error("🔴 Lỗi khi tạo variant:", variantError); // <-- LOG LỖI Ở ĐÂY
                await Product.findByIdAndDelete(product._id);
                if (variantError.code === 11000 && variantError.keyPattern?.sku) {
                    return res.status(400).json({
                        message: `SKU bị trùng: ${variantError.keyValue.sku || 'null'}`
                    });
                }
                throw new Error(`Lỗi khi tạo biến thể: ${variantError.message}`);
            }
        }

        // Get populated product
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

        return res.status(201).json({
            message: "Thêm sản phẩm thành công",
            data: populatedProduct
        });

    } catch (error) {
        console.error('Lỗi khi tạo sản phẩm:', error);
        // If product was created but variants failed, ensure product is deleted
        if (product) {
            await Product.findByIdAndDelete(product._id);
        }
        return res.status(500).json({
            message: 'Đã xảy ra lỗi khi tạo sản phẩm',
            error: {
                name: error.name,
                message: error.message,
                stack: error.stack
            }
        });

    }
};


export const updateProduct = async (req, res) => {
    let oldProduct = null;
    let updatedProduct = null;
    let createdVariants = [];

    try {
        const id = req.params.id;
        
        // Validate request body
        const { error } = productSchema.validate(req.body, { abortEarly: false });
        if (error) {
            const errors = error.details.map((err) => err.message);
            return res.status(400).json({
                message: errors
            });
        }

        // Get existing product
        oldProduct = await Product.findById(id);
        if (!oldProduct) {
            return res.status(404).json({
                message: "Không tìm thấy sản phẩm"
            });
        }

        // Validate colors
        const { colors, images, variants } = req.body;
        if (!colors || typeof colors !== 'string') {
            return res.status(400).json({
                message: "Sản phẩm phải có một màu và phải là ID hợp lệ"
            });
        }

        // Validate images
        if (!images || !Array.isArray(images) || images.length === 0) {
            return res.status(400).json({
                message: "Sản phẩm phải có ít nhất một hình ảnh"
            });
        }

        // Check if color exists
        const colorId = new mongoose.Types.ObjectId(colors);
        const existingColor = await Color.findById(colorId);
        if (!existingColor) {
            return res.status(400).json({
                message: "Màu sắc không tồn tại trong hệ thống"
            });
        }

        // Validate variants if they exist
        if (variants && Array.isArray(variants)) {
            console.log("👉 Variants từ client (update):", variants);

            // Validate basic fields for each variant
            for (const variant of variants) {
                // Validate SKU
                if (!variant.sku || typeof variant.sku !== 'string' || variant.sku.trim().length === 0) {
                    return res.status(400).json({
                        message: "SKU không được để trống cho variant"
                    });
                }
                variant.sku = variant.sku.trim();

                // Validate color_id
                if (!variant.color_id || typeof variant.color_id !== 'string') {
                    return res.status(400).json({
                        message: "Mỗi variant phải có một color_id hợp lệ"
                    });
                }

                // Validate sizes
                if (!variant.sizes || !Array.isArray(variant.sizes) || variant.sizes.length === 0) {
                    return res.status(400).json({
                        message: "Mỗi variant phải có ít nhất một size"
                    });
                }

                // Validate price
                if (typeof variant.price !== 'number' || variant.price < 0) {
                    return res.status(400).json({
                        message: "Mỗi variant phải có giá hợp lệ"
                    });
                }

                // Validate images
                if (!variant.images || !Array.isArray(variant.images) || variant.images.length === 0) {
                    return res.status(400).json({
                        message: "Mỗi variant phải có ít nhất một hình ảnh"
                    });
                }
            }

            // Check for duplicate SKUs within new variants
            const skus = variants.map(v => v.sku);
            const uniqueSkus = new Set(skus);
            if (uniqueSkus.size !== skus.length) {
                const duplicates = skus.filter((sku, index) => skus.indexOf(sku) !== index);
                return res.status(400).json({
                    message: `Các SKU bị trùng trong yêu cầu: ${[...new Set(duplicates)].join(', ')}`
                });
            }

            // Get existing SKUs of this product's variants
            const existingVariants = await Variant.find({ product_id: id });
            const existingSkus = existingVariants.map(v => v.sku);

            // Check for SKU conflicts with other products' variants
            const skuConflicts = await Variant.find({
                sku: { $in: skus },
                product_id: { $ne: id }
            });

            if (skuConflicts.length > 0) {
                return res.status(400).json({
                    message: "Có SKU đã tồn tại trong hệ thống cho sản phẩm khác",
                    existingSKUs: skuConflicts.map(v => v.sku)
                });
            }

            // Check for duplicate colors
            const variantColorIds = variants.map(v => v.color_id.toString());
            if (new Set(variantColorIds).size !== variantColorIds.length) {
                return res.status(400).json({
                    message: "Có màu sắc trùng lặp trong danh sách variants"
                });
            }
        }

        // Start update process
        // 1. Update product basic info first
        const productData = {
            name: req.body.name,
            description: req.body.description,
            brand: req.body.brand,
            category: req.body.category,
            gender: req.body.gender,
            sizes: req.body.sizes,
            colors: colors,
            images: req.body.images,
            price: req.body.price
        };

        updatedProduct = await Product.findByIdAndUpdate(id, productData, { new: true });

        // 2. Handle variants update if provided
        if (variants && Array.isArray(variants)) {
            try {
                // Delete old variants
                await Variant.deleteMany({ product_id: id });

                // Create new variants
                for (const variant of variants) {
                    const variantData = {
                        sku: variant.sku.trim(),
                        sizes: variant.sizes,
                        price: variant.price,
                        color_id: variant.color_id,
                        images: variant.images,
                        quantity: variant.quantity ?? 0,
                        status: variant.status ?? 'active',
                        product_id: id
                    };
                    console.log(`🟡 Variant chuẩn bị update:`, variantData);
                    
                    const newVariant = new Variant(variantData);
                    const savedVariant = await newVariant.save();
                    createdVariants.push(savedVariant);
                }

                // Update product with new variant references
                updatedProduct.variants = createdVariants.map(v => v._id);
                await updatedProduct.save();

            } catch (variantError) {
                console.error("🔴 Lỗi khi update variants:", variantError);
                
                // If any variants were created, delete them
                if (createdVariants.length > 0) {
                    await Variant.deleteMany({ _id: { $in: createdVariants.map(v => v._id) } });
                }

                // Restore old variants
                if (oldProduct.variants && oldProduct.variants.length > 0) {
                    const oldVariants = await Variant.find({ product_id: id });
                    updatedProduct.variants = oldVariants.map(v => v._id);
                    await updatedProduct.save();
                }

                if (variantError.code === 11000 && variantError.keyPattern?.sku) {
                    return res.status(400).json({
                        message: `SKU bị trùng: ${variantError.keyValue.sku || 'null'}`
                    });
                }
                throw new Error(`Lỗi khi cập nhật biến thể: ${variantError.message}`);
            }
        }

        // Get final populated product
        const finalProduct = await Product.findById(id)
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
            data: finalProduct
        });

    } catch (error) {
        console.error('Lỗi khi cập nhật sản phẩm:', error);
        
        // If update failed but some variants were created, clean them up
        if (createdVariants.length > 0) {
            await Variant.deleteMany({ _id: { $in: createdVariants.map(v => v._id) } });
        }

        // If product was updated but variants failed, restore old variants
        if (updatedProduct && oldProduct) {
            updatedProduct.variants = oldProduct.variants;
            await updatedProduct.save().catch(console.error);
        }

        return res.status(500).json({
            message: 'Đã xảy ra lỗi khi cập nhật sản phẩm',
            error: {
                name: error.name,
                message: error.message,
                stack: error.stack
            }
        });
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
        );        // Remove references from color
        await Color.findByIdAndUpdate(product.colors, {
            $pull: { products: product._id }
        });

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
            .populate('sizes', '_id')
            .populate('colors', '_id');

        if (!product) {
            return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
        }

        const variants = await Variant.find({ product_id: req.params.id })
            .populate('sizes', '_id')
            .populate('color_id', '_id');

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