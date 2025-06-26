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
        });
    }
};

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

        const variants = await variant_MD.find(query)
            .populate('product_id')
            .populate('color') 
            .populate('size')

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
            }
        });
    } catch (error) {
        console.error('Lỗi khi lấy thông tin biến thể:', error);
        return res.status(500).json({
            message: 'Đã xảy ra lỗi khi lấy thông tin biến thể',
            error: error.message
        });
    }
};

export const deleteVariant = async (req, res) => {
    try {
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