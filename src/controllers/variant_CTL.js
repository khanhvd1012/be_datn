import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import variant_MD from "../models/variant_MD";
import product_MD from "../models/product_MD";
import Stock from "../models/stock_MD";
import Color from "../models/color_MD";
import StockHistory from "../models/stockHistory_MD";
import Size from "../models/size_MD";
import review_MD from "../models/review_MD";
import OrderItem from "../models/orderItem_MD"

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

const generateSKU = async (product, variant) => {
    const productName = product.name.substring(0, 3).toUpperCase();
    const colorDoc = await Color.findById(variant.color).select("name").lean();
    const color = colorDoc ? colorDoc.name.substring(0, 3).toUpperCase() : 'UNK';
    const sizeDoc = await Size.findById(variant.size).select('size').lean();
    const sizeValue = sizeDoc ? sizeDoc.size : '';
    const timestamp = Date.now().toString().slice(-4);
    return `${productName}-${color}-${sizeValue}-${timestamp}`;
};

export const createVariant = async (req, res) => {
    try {
        // Kiểm tra sản phẩm tồn tại
        const product = await product_MD.findById(req.body.product_id);
        if (!product) {
            if (req.files?.length > 0) deleteUploadedImages(req.files);
            return res.status(404).json({ message: 'Sản phẩm không tồn tại' });
        }
        // kiểm tra trùng lặp biến thể
        const existingVariant = await variant_MD.findOne({
            product_id: req.body.product_id,
            color: req.body.color,
            size: req.body.size
        });
        if (existingVariant) {
            if (req.files?.length > 0) deleteUploadedImages(req.files);
            return res.status(400).json({ message: 'Biến thể đã tồn tại' });
        }
        // Kiểm tra size tồn tại
        const sizeDoc = await Size.findById(req.body.size);
        if (!sizeDoc) {
            return res.status(404).json({ message: 'Size không tồn tại' });
        }
        // Kiểm tra giá nhập không được cao hơn giá bán
        if (req.body.import_price > req.body.price) {
            return res.status(400).json({
                message: 'Giá nhập không được cao hơn giá bán'
            });
        }
        let imageUrls = [];
        if (req.files && req.files.length > 0) {
            imageUrls = req.files.map(file => `http://localhost:3000/uploads/${file.filename}`);
        }

        const MAX_IMAGES = 5;
        if (imageUrls.length > MAX_IMAGES) {
            if (req.files && req.files.length > 0) deleteUploadedImages(req.files);
            return res.status(400).json({ message: `Tối đa ${MAX_IMAGES} ảnh` });
        }

        // Tạo SKU cho variant mới (phải await)
        const sku = await generateSKU(product, {
            color: req.body.color,
            size: req.body.size // truyền ObjectId
        });
        // Tạo biến thể mới
        const variant = await variant_MD.create({
            product_id: req.body.product_id,
            color: req.body.color,
            size: req.body.size,
            price: req.body.price,
            gender: req.body.gender,
            weight: req.body.weight,
            length: req.body.length,
            width: req.body.width,
            height: req.body.height,
            image_url: imageUrls,
            import_price: req.body.import_price,
            status: 'inStock',
            sku: sku // sku là string
        });
        // Cập nhật danh sách variants trong product
        await product_MD.findByIdAndUpdate(
            req.body.product_id,
            { $push: { variants: variant._id } }
        );
        // Cập nhật variants trong size
        await Size.findByIdAndUpdate(
            req.body.size,
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
                reason: 'Nhập kho ban đầu',
                updated_by: req.user._id
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

        // Xóa ảnh nếu có
        if (req.files && req.files.length > 0) {
            deleteUploadedImages(req.files);
        }

        return res.status(500).json({
            message: 'Đã xảy ra lỗi khi tạo biến thể',
            error: error.message
        });
    }
};
export const updateVariant = async (req, res) => {
    try {
        // --- Validate giá nhập ---
        if (req.body.import_price && req.body.price &&
            req.body.import_price > req.body.price) {
            return res.status(400).json({
                message: 'Giá nhập không được cao hơn giá bán'
            });
        }

        // --- Tìm variant hiện tại ---
        const currentVariant = await variant_MD.findById(req.params.id);
        if (!currentVariant) {
            return res.status(404).json({ message: 'Không tìm thấy biến thể' });
        }

        let imageUrls = [...(currentVariant.image_url || [])];

        // --- Giữ lại ảnh cũ ---
        if (req.body.existingImages) {
            imageUrls = Array.isArray(req.body.existingImages)
                ? req.body.existingImages
                : [req.body.existingImages];

            const removedImages = (currentVariant.image_url || []).filter(
                oldUrl => !imageUrls.includes(oldUrl)
            );
            deleteUploadedImages(removedImages);
        }

        // --- Thêm ảnh mới ---
        if (req.files && req.files.length > 0) {
            const newImages = req.files.map(file => `http://localhost:3000/uploads/${file.filename}`);
            imageUrls = [...imageUrls, ...newImages];
        }

        if (imageUrls.length > 5) {
            if (req.files && req.files.length > 0) {
                const newImages = req.files.map(file => `http://localhost:3000/uploads/${file.filename}`);
                deleteUploadedImages(newImages);
            }
            return res.status(400).json({ message: 'Tối đa 5 ảnh' });
        }

        req.body.image_url = imageUrls;
        delete req.body.existingImages;

        // --- Kiểm tra có cần tạo SKU mới không ---
        let needNewSKU = false;

        if (req.body.color && req.body.color.toString() !== currentVariant.color.toString()) {
            needNewSKU = true;
        }
        if (req.body.size && req.body.size.toString() !== currentVariant.size.toString()) {
            needNewSKU = true;
        }

        let updateData = { ...req.body };

        // --- Xử lý đổi product ---
        if (req.body.product_id && req.body.product_id.toString() !== currentVariant.product_id.toString()) {
            const oldProductId = currentVariant.product_id;
            const newProductId = req.body.product_id;

            // Xoá khỏi product cũ
            await product_MD.findByIdAndUpdate(
                oldProductId,
                { $pull: { variants: currentVariant._id } }
            );

            // Thêm vào product mới
            await product_MD.findByIdAndUpdate(
                newProductId,
                { $addToSet: { variants: currentVariant._id } }
            );

            needNewSKU = true; // đổi product thì chắc chắn phải đổi SKU
        }

        // --- Lấy product mới/cũ để tính SKU ---
        const product = await product_MD.findById(req.body.product_id || currentVariant.product_id);
        if (!product) {
            return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
        }

        if (needNewSKU) {
            const sku = await generateSKU(product, {
                color: req.body.color || currentVariant.color,
                size: req.body.size || currentVariant.size
            });
            updateData.sku = sku;
        }

        // --- Nếu đổi size thì cập nhật quan hệ Size <-> Variant ---
        if (req.body.size && req.body.size.toString() !== currentVariant.size.toString()) {
            // Xoá variant khỏi size cũ
            await Size.findByIdAndUpdate(
                currentVariant.size,
                { $pull: { variants: currentVariant._id } }
            );
            // Thêm vào size mới
            await Size.findByIdAndUpdate(
                req.body.size,
                { $addToSet: { variants: currentVariant._id } }
            );
        }

        // --- Cập nhật Variant ---
        const updatedVariant = await variant_MD.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );

        // --- Đảm bảo product hiện tại luôn chứa variant ---
        await product_MD.findByIdAndUpdate(
            product._id,
            { $addToSet: { variants: updatedVariant._id } }
        );

        return res.status(200).json({
            message: 'Cập nhật biến thể thành công',
            data: updatedVariant
        });

    } catch (error) {
        if (req.files && req.files.length > 0) {
            deleteUploadedImages(req.files);
        }
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
            .populate('size')
            .populate('color')
            .sort({ createdAt: -1 });

        // Lấy thông tin stock cho mỗi variant
        const variantsWithStock = await Promise.all(
            variants.map(async (variant) => {
                const stock = await Stock.findOne({ product_variant_id: variant._id });
                return {
                    ...variant.toObject(),
                    stock: {
                        quantity: stock ? stock.quantity : 0,
                        status: variant.status,
                        weight: variant.weight // Add weight to response
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
            .populate('product_id')
            .populate('size');

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

const deleteUploadedImages = (filesOrUrls = []) => {
    filesOrUrls.forEach(item => {
        let filename = '';
        if (typeof item === 'string') {
            filename = item.split('/uploads/')[1];
        } else if (item?.filename) {
            filename = item.filename;
        }
        const filePath = path.join(__dirname, '../../public/uploads', filename);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    });
};

export const deleteVariant = async (req, res) => {
    try {
        const variant = await variant_MD.findById(req.params.id);
        if (!variant) {
            return res.status(404).json({ message: 'Không tìm thấy biến thể' });
        }
        // Kiểm tra nếu đã có đánh giá cho variant này
        const hasReview = await review_MD.exists({
            product_id: variant.product_id,
            product_variant_id: variant._id
        });

        // Kiểm tra nếu đã có khách hàng mua thành công (tồn tại stock history xuất kho)
        const hasSold = await StockHistory.exists({
            stock_id: { $in: await Stock.find({ product_variant_id: variant._id }).distinct('_id') },
            quantity_change: { $lt: 0 }
        });

        if (hasReview || hasSold) {
            // Không cho phép xóa, chỉ chuyển trạng thái sang paused
            await variant_MD.findByIdAndUpdate(variant._id, { status: 'paused' });
            return res.status(400).json({
                message: 'Không thể xóa biến thể đã có đánh giá hoặc đã có khách hàng mua thành công. Bạn chỉ có thể dừng bán biến thể này.'
            });
        }

        if (variant.image_url && Array.isArray(variant.image_url)) {
            deleteUploadedImages(variant.image_url);
        }

        // Xóa variant khỏi danh sách variants trong product
        await product_MD.findByIdAndUpdate(
            variant.product_id,
            { $pull: { variants: variant._id } }
        );

        // Xóa variant khỏi tất cả size (nếu size là mảng)
        await Size.findByIdAndUpdate(
            variant.size,
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

export const getTopSellingVariants = async (req, res, next) => {
    try {
        const topSellingVariants = await OrderItem.aggregate([
            {
                $lookup: {
                    from: "orders",
                    localField: "order_id",
                    foreignField: "_id",
                    as: "order",
                },
            },
            { $unwind: "$order" },
            {
                $match: {
                    "order.status": "delivered",
                },
            },
            {
                $group: {
                    _id: "$variant_id",
                    totalSold: { $sum: "$quantity" },
                },
            },
            { $sort: { totalSold: -1 } },

            // Lấy dữ liệu variant
            {
                $lookup: {
                    from: "variants",
                    localField: "_id",
                    foreignField: "_id",
                    as: "variant",
                },
            },
            { $unwind: "$variant" },

            // Lấy thông tin stock, dùng $arrayElemAt + $ifNull để tránh null
            {
                $lookup: {
                    from: "stocks",
                    let: { variantId: "$variant._id" },
                    pipeline: [
                        { $match: { $expr: { $eq: ["$product_variant_id", "$$variantId"] } } }
                    ],
                    as: "stock",
                },
            },

            // Lấy thông tin product
            {
                $lookup: {
                    from: "products",
                    localField: "variant.product_id",
                    foreignField: "_id",
                    as: "product",
                },
            },
            { $unwind: "$product" },

            // Lấy thông tin color
            {
                $lookup: {
                    from: "colors",
                    localField: "variant.color",
                    foreignField: "_id",
                    as: "color",
                },
            },
            { $unwind: { path: "$color", preserveNullAndEmptyArrays: true } },

            {
                $project: {
                    _id: "$variant._id",
                    sku: "$variant.sku",
                    price: "$variant.price",
                    image_url: "$variant.image_url",
                    createdAt: "$variant.createdAt",
                    status: "$variant.status",
                    // Lấy stock đầu tiên hoặc mặc định nếu không có
                    stock: {
                        $ifNull: [
                            { $arrayElemAt: ["$stock", 0] },
                            { status: "outOfStock", quantity: 0 }
                        ]
                    },
                    averageRating: "$variant.averageRating",
                    product_id: "$product._id",
                    product_name: "$product.name",
                    product_slug: "$product.slug",
                    color: {
                        _id: "$color._id",
                        name: "$color.name",
                        code: "$color.code",
                        description: "$color.description",
                    },
                    weight: "$variant.weight",
                    totalSold: 1,
                },
            },
        ]);

        res.status(200).json({ success: true, data: topSellingVariants });
    } catch (error) {
        next(error);
    }
};

export const getTopRatedVariants = async (req, res, next) => {
    try {
        const topRatedVariants = await review_MD.aggregate([
            {
                $lookup: {
                    from: "orderitems",
                    localField: "order_item",
                    foreignField: "_id",
                    as: "order_item"
                }
            },
            { $unwind: "$order_item" },
            {
                $group: {
                    _id: "$order_item.variant_id",
                    averageRating: { $avg: "$rating" },
                    reviewCount: { $sum: 1 }
                }
            },
            {
                $lookup: {
                    from: "variants",
                    localField: "_id",
                    foreignField: "_id",
                    as: "variant"
                }
            },
            { $unwind: "$variant" },
            {
                $lookup: {
                    from: "colors",
                    localField: "variant.color",
                    foreignField: "_id",
                    as: "color"
                }
            },
            { $unwind: "$color" },
            {
                $lookup: {
                    from: "sizes",
                    localField: "variant.size",
                    foreignField: "_id",
                    as: "size"
                }
            },
            { $unwind: "$size" },
            {
                $project: {
                    _id: "$variant._id",
                    sku: "$variant.sku",
                    price: "$variant.price",
                    image_url: "$variant.image_url",
                    color: "$color",
                    size: "$size",
                    averageRating: 1,
                    reviewCount: 1,
                    weight: "$variant.weight",
                }
            },
            { $sort: { averageRating: -1 } }
        ]);

        res.status(200).json({ success: true, data: topRatedVariants });
    } catch (error) {
        next(error);
    }
};


