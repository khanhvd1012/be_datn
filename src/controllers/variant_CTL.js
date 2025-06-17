import Variant from "../models/variant_MD.js";
import Size from "../models/size_MD.js";
import Product from "../models/product_MD.js";

// Helper function to validate sizes
const validateSizes = async (sizes, productId) => {
    // Get all valid size IDs for the product
    const product = await Product.findById(productId);
    if (!product) {
        throw new Error('Không tìm thấy sản phẩm');
    }

    const validSizeIds = product.sizes.map(id => id.toString());
    
    // Check if all sizes are valid for the product
    for (const sizeId of sizes) {
        if (!validSizeIds.includes(sizeId.toString())) {
            throw new Error(`Size ${sizeId} không hợp lệ cho sản phẩm này`);
        }
    }
};

// Helper function để kiểm tra trùng lặp màu sắc trong cùng sản phẩm
const checkDuplicateColor = async (colorId, productId, variantId = null) => {
    const query = {
        color_id: colorId,
        product_id: productId
    };
    if (variantId) {
        query._id = { $ne: variantId };
    }
    const existingVariant = await Variant.findOne(query);
    return existingVariant !== null;
};

// Helper function để kiểm tra trùng lặp SKU
const checkDuplicateSKU = async (sku, excludeVariantId = null) => {
    const query = { sku: sku.trim() };
    if (excludeVariantId) {
        query._id = { $ne: excludeVariantId };
    }
    const existingVariant = await Variant.findOne(query);
    return existingVariant !== null;
};

// Create a new variant
export const createVariant = async (req, res) => {    
    try {
        // Kiểm tra tính hợp lệ của các size
        await validateSizes(req.body.sizes, req.body.product_id);

        // Create variant
        const variant = await Variant.create({
            ...req.body,
            sku: req.body.sku.trim()
        });

        const populatedVariant = await Variant.findById(variant._id)
            .populate('sizes')
            .populate('color_id');

        return res.status(201).json({
            message: "Tạo biến thể thành công",
            variant: populatedVariant
        });
    } catch (error) {
        console.error('Lỗi khi tạo biến thể:', error);
        return res.status(400).json({
            message: error.message || "Lỗi khi tạo biến thể"
        });
    }
};

// Get all variants
export const getAllVariants = async (req, res) => {    
    try {
        const variants = await Variant.find()
            .populate('product_id')
            .populate('sizes')
            .populate('color_id');
        return res.status(200).json({
            message: "Lấy danh sách biến thể thành công",
            variants
        });
    } catch (error) {
        return res.status(400).json({
            message: error.message
        });
    }
};

// Get variant by id
export const getVariantById = async (req, res) => {    
    try {
        const variant = await Variant.findById(req.params.id)
            .populate('product_id')
            .populate('sizes')
            .populate('color_id');

        if (!variant) {
            return res.status(404).json({
                message: "Không tìm thấy biến thể"
            });
        }
        return res.status(200).json({
            message: "Lấy biến thể thành công",
            variant
        });
    } catch (error) {
        return res.status(400).json({
            message: error.message
        });
    }
};

// Update variant
export const updateVariant = async (req, res) => {
    try {
        const variantId = req.params.id;
        const existingVariant = await Variant.findById(variantId);
        if (!existingVariant) {
            return res.status(404).json({
                message: "Không tìm thấy biến thể"
            });
        }

        // Kiểm tra SKU trùng lặp nếu SKU thay đổi
        if (req.body.sku) {
            // Kiểm tra SKU trùng lặp (loại trừ variant hiện tại)
            if (await checkDuplicateSKU(req.body.sku, variantId)) {
                return res.status(400).json({
                    message: "SKU đã tồn tại trong hệ thống"
                });
            }
            req.body.sku = req.body.sku.trim();
        }

        // Kiểm tra màu sắc trùng lặp nếu màu sắc thay đổi
        if (req.body.color_id && req.body.color_id !== existingVariant.color_id.toString()) {
            if (await checkDuplicateColor(req.body.color_id, existingVariant.product_id, variantId)) {
                return res.status(400).json({
                    message: "Màu sắc này đã được sử dụng cho một biến thể khác của sản phẩm này"
                });
            }
        }

        // Kiểm tra tính hợp lệ của các size nếu chúng được cập nhật
        if (req.body.sizes) {
            await validateSizes(req.body.sizes, existingVariant.product_id);
        }

        const variant = await Variant.findByIdAndUpdate(
            variantId,
            req.body,
            { new: true }
        )
        .populate('product_id')
        .populate('sizes')
        .populate('color_id');

        return res.status(200).json({
            message: "Cập nhật biến thể thành công",
            variant
        });
    } catch (error) {
        console.error('Lỗi khi cập nhật biến thể:', error);
        return res.status(400).json({
            message: error.message || "Lỗi khi cập nhật biến thể"
        });
    }
};

// Delete variant
export const deleteVariant = async (req, res) => {
    try {
        const variant = await Variant.findByIdAndDelete(req.params.id);
        if (!variant) {
            return res.status(404).json({
                message: "Không tìm thấy biến thể"
            });
        }

        // Xóa tham chiếu biến thể khỏi sản phẩm
        await Product.findByIdAndUpdate(variant.product_id, {
            $pull: { variants: variant._id }
        });

        // Xóa tham chiếu sản phẩm khỏi các size
        await Size.updateMany(
            { _id: { $in: variant.sizes } },
            { $pull: { products: variant.product_id } }
        );

        return res.status(200).json({
            message: "Xóa biến thể thành công",
            variant
        });
    } catch (error) {
        return res.status(400).json({
            message: error.message
        });
    }
};

// Update stock
export const updateStock = async (req, res) => {
    try {
        const variant = await Variant.findById(req.params.id);
        if (!variant) {
            return res.status(404).json({
                message: "Không tìm thấy biến thể"
            });
        }

        variant.quantity = req.body.quantity;
        await variant.save();

        const updatedVariant = await Variant.findById(req.params.id)
            .populate('product_id')
            .populate('sizes')
            .populate('color_id');

        return res.status(200).json({
            message: "Cập nhật số lượng tồn kho thành công",
            variant: updatedVariant
        });
    } catch (error) {
        return res.status(400).json({
            message: error.message
        });
    }
};
