<<<<<<< HEAD
import variant_MD from "../models/variant_MD";
import product_MD from "../models/product_MD";
import Stock from "../models/stock_MD";
import StockHistory from "../models/stockHistory_MD";

/**
 * Hàm tạo SKU cho variant
 * @param {Object} product - Thông tin sản phẩm
 * @param {Object} variant - Thông tin biến thể
 * @returns {String} Mã SKU mới
 * 
 * Format SKU: XXX-CCC-SS-TTTT
 * - XXX: 3 ký tự đầu của tên sản phẩm
 * - CCC: 3 ký tự đầu của màu sắc
 * - SS: Kích thước
 * - TTTT: 4 số cuối của timestamp
 * 
 * Ví dụ: NIK-BLA-42-1234 (Nike-Black-42-1234)
 */

const generateSKU = (product, variant) => {
    const productName = product.name.substring(0, 3).toUpperCase();
    const color = variant.color.substring(0, 3).toUpperCase();
    const size = variant.size.toString();
    const timestamp = Date.now().toString().slice(-4);
    return `${productName}-${color}-${size}-${timestamp}`;
};

export const createVariant = async (req, res) => {
    try {
        // Kiểm tra sản phẩm tồn tại
        const product = await product_MD.findById(req.body.product_id);
        if (!product) {
            return res.status(404).json({ message: 'Sản phẩm không tồn tại' });
        }
        // kiểm tra trùng lặp biến thể
        const existingVariant = await variant_MD.findOne({
            product_id: req.body.product_id,
            color: req.body.color,
            size: req.body.size
        });
        if (existingVariant) {
            return res.status(400).json({ message: 'Biến thể đã tồn tại' });
        }

        // Kiểm tra giá nhập không được cao hơn giá bán
        if (req.body.import_price > req.body.price) {
            return res.status(400).json({
                message: 'Giá nhập không được cao hơn giá bán'
            });
        }

        // Tạo SKU cho variant mới
        const sku = generateSKU(product, {
            color: req.body.color,
            size: req.body.size
        });

        // Tạo biến thể mới
        const variant = await variant_MD.create({
            product_id: req.body.product_id,
            color: req.body.color,
            size: req.body.size,
            price: req.body.price,
            gender: req.body.gender,
            image_url: req.body.image_url,
            import_price: req.body.import_price,
            status: 'inStock', // Mặc định là có hàng
            sku: sku // Thêm SKU vào variant
        });

        // Cập nhật danh sách variants trong product
        await product_MD.findByIdAndUpdate(
            req.body.product_id,
            { $push: { variants: variant._id } }
        );

        // Nếu có initial_stock, tạo stock record và lịch sử
        if (req.body.initial_stock && req.body.initial_stock > 0) {
            const stock = await Stock.create({
                product_variant_id: variant._id,
                quantity: req.body.initial_stock
            });

            await StockHistory.create({
                stock_id: stock._id,
                quantity_change: req.body.initial_stock,
                reason: 'Nhập kho ban đầu'
            });

            return res.status(201).json({
                message: 'Tạo biến thể và nhập kho thành công',
                data: {
                    variant,
                    stock: {
                        quantity: stock.quantity,
                        status: variant.status
                    }
                }
            });
        }

        return res.status(201).json({
            message: 'Tạo biến thể thành công',
            data: variant
        });
    } catch (error) {
        console.error('Lỗi khi tạo biến thể:', error);
        return res.status(500).json({
            message: 'Đã xảy ra lỗi khi tạo biến thể',
            error: error.message
=======
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
>>>>>>> 1982ae5b937541c479889b7813204594075a6143
        });
    }
};

<<<<<<< HEAD
export const updateVariant = async (req, res) => {
    try {
        // Kiểm tra giá nhập không được cao hơn giá bán
        if (req.body.import_price && req.body.price &&
            req.body.import_price > req.body.price) {
            return res.status(400).json({
                message: 'Giá nhập không được cao hơn giá bán'
            });
        }

        // Tìm variant hiện tại
        const currentVariant = await variant_MD.findById(req.params.id);
        if (!currentVariant) {
            return res.status(404).json({ message: 'Không tìm thấy biến thể' });
        }

        // Nếu có thay đổi màu sắc hoặc kích thước, cần tạo SKU mới
        if (req.body.color || req.body.size) {
            // Lấy thông tin sản phẩm
            const product = await product_MD.findById(currentVariant.product_id);
            if (!product) {
                return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
            }

            // Kiểm tra trùng lặp biến thể
            const existingVariant = await variant_MD.findOne({
                product_id: currentVariant.product_id,
                color: req.body.color || currentVariant.color,
                size: req.body.size || currentVariant.size,
                _id: { $ne: currentVariant._id } // Loại trừ variant hiện tại
            });

            if (existingVariant) {
                return res.status(400).json({ message: 'Biến thể với màu sắc và kích thước này đã tồn tại' });
            }

            // Tạo SKU mới
            const newVariant = {
                ...currentVariant.toObject(),
                ...req.body,
                sku: generateSKU(product, {
                    color: req.body.color || currentVariant.color,
                    size: req.body.size || currentVariant.size
                })
            };

            // Cập nhật variant với SKU mới
            const updatedVariant = await variant_MD.findByIdAndUpdate(
                req.params.id,
                newVariant,
                { new: true }
            );

            return res.status(200).json({
                message: 'Cập nhật biến thể thành công',
                data: updatedVariant
            });
        }

        // Nếu không thay đổi màu sắc hoặc kích thước, chỉ cập nhật các thông tin khác
        const updatedVariant = await variant_MD.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );

        return res.status(200).json({
            message: 'Cập nhật biến thể thành công',
            data: updatedVariant
        });
    } catch (error) {
        console.error('Lỗi khi cập nhật biến thể:', error);
        return res.status(500).json({
            message: 'Đã xảy ra lỗi khi cập nhật biến thể',
            error: error.message
        });
    }
};

export const getAllVariants = async (req, res) => {
    try {
        const { hideOutOfStock } = req.query;
        let query = {};
        
        // Nếu hideOutOfStock=true, chỉ lấy các variant còn hàng
        if (hideOutOfStock === 'true') {
            query.status = 'inStock';
        }

        const variants = await variant_MD.find(query).populate('product_id');

        // Lấy thông tin stock cho mỗi variant
        const variantsWithStock = await Promise.all(
            variants.map(async (variant) => {
                const stock = await Stock.findOne({ product_variant_id: variant._id });
                return {
                    ...variant.toObject(),
                    stock: {
                        quantity: stock ? stock.quantity : 0,
                        status: variant.status
                    }
                };
            })
        );

        return res.status(200).json({
            message: 'Lấy danh sách biến thể thành công',
            data: variantsWithStock
        });
    } catch (error) {
        console.error('Lỗi khi lấy danh sách biến thể:', error);
        return res.status(500).json({
            message: 'Đã xảy ra lỗi khi lấy danh sách biến thể',
            error: error.message
        });
    }
};

export const getVariantById = async (req, res) => {
    try {
        const variant = await variant_MD.findById(req.params.id)
            .populate('product_id');

        if (!variant) {
            return res.status(404).json({ message: 'Không tìm thấy biến thể' });
        }

        // Lấy thông tin stock
        const stock = await Stock.findOne({ product_variant_id: variant._id });

        return res.status(200).json({
            message: 'Lấy thông tin biến thể thành công',
            data: {
                ...variant.toObject(),
                stock: stock ? stock.quantity : 0
=======
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
>>>>>>> 1982ae5b937541c479889b7813204594075a6143
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
<<<<<<< HEAD
        console.error('Lỗi khi lấy thông tin biến thể:', error);
        return res.status(500).json({
            message: 'Đã xảy ra lỗi khi lấy thông tin biến thể',
            error: error.message
=======
        console.error('Lỗi khi cập nhật biến thể:', error);
        return res.status(400).json({
            message: error.message || "Lỗi khi cập nhật biến thể"
>>>>>>> 1982ae5b937541c479889b7813204594075a6143
        });
    }
};

// Delete variant
export const deleteVariant = async (req, res) => {
    try {
<<<<<<< HEAD
        const variant = await variant_MD.findById(req.params.id);
        if (!variant) {
            return res.status(404).json({ message: 'Không tìm thấy biến thể' });
        }

        // Xóa variant khỏi danh sách variants trong product
        await product_MD.findByIdAndUpdate(
            variant.product_id,
            { $pull: { variants: variant._id } }
        );

        // Xóa stock và stock history liên quan
        const stock = await Stock.findOne({ product_variant_id: variant._id });
        if (stock) {
            await StockHistory.deleteMany({ stock_id: stock._id });
            await Stock.deleteOne({ _id: stock._id });
        }

        // Xóa variant
        await variant_MD.deleteOne({ _id: variant._id });

        return res.status(200).json({
            message: 'Xóa biến thể thành công'
        });
    } catch (error) {
        console.error('Lỗi khi xóa biến thể:', error);
        return res.status(500).json({
            message: 'Đã xảy ra lỗi khi xóa biến thể',
            error: error.message
        });
    }
};
=======
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
>>>>>>> 1982ae5b937541c479889b7813204594075a6143
