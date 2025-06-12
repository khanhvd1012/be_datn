import mongoose from 'mongoose';
import Size from '../models/size_MD.js';

// Create size
export const createSize = async (req, res) => {
    try {
        const size = await Size.create(req.body);
        return res.status(201).json({
            message: "Tạo size thành công",
            size
        });
    } catch (error) {
        return res.status(400).json({
            message: error.message
        });
    }
};

// Get all sizes
export const getAllSizes = async (req, res) => {
    try {
        // First find all sizes
        const sizes = await Size.find();
        const productsWithSizes = await mongoose.model('Products').find({
            'sizes': { $in: sizes.map(size => size._id) }
        }, '_id sizes'); // Include sizes field in selection

        // Create a map of size IDs to their associated product IDs
        const sizeProductMap = {};
        productsWithSizes.forEach(product => {
            if (product.sizes) { // Add safety check
                product.sizes.forEach(sizeId => {
                    const sizeIdStr = sizeId.toString();
                    if (!sizeProductMap[sizeIdStr]) {
                        sizeProductMap[sizeIdStr] = [];
                    }
                    sizeProductMap[sizeIdStr].push(product._id);
                });
            }
        });

        // Transform the sizes to include the correct product IDs
        const transformedSizes = sizes.map(size => {
            const sizeObj = size.toObject();
            const sizeIdStr = size._id.toString();
            sizeObj.products = sizeProductMap[sizeIdStr] || [];
            return sizeObj;
        });

        return res.status(200).json({
            message: "Lấy danh sách size thành công",
            sizes: transformedSizes
        });
    } catch (error) {
        return res.status(400).json({
            message: error.message
        });
    }
};

// Get size by id
export const getSizeById = async (req, res) => {
    try {
        const size = await Size.findById(req.params.id)
            .populate({
                path: 'products',
                select: 'name description price images status'
            });
        if (!size) {
            return res.status(404).json({
                message: "Không tìm thấy size"
            });
        }
        return res.status(200).json({
            message: "Lấy size thành công",
            size
        });
    } catch (error) {
        return res.status(400).json({
            message: error.message
        });
    }
};

// Update size
export const updateSize = async (req, res) => {
    try {
        const size = await Size.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!size) {
            return res.status(404).json({
                message: "Không tìm thấy size"
            });
        }
        return res.status(200).json({
            message: "Cập nhật size thành công",
            size
        });
    } catch (error) {
        return res.status(400).json({
            message: error.message
        });
    }
};

// Delete size
export const deleteSize = async (req, res) => {
    try {
        const sizeId = req.params.id;

        // Kiểm tra size tồn tại
        const size = await Size.findById(sizeId);
        if (!size) {
            return res.status(404).json({
                message: "Không tìm thấy size"
            });
        }

        // Tìm tất cả sản phẩm có size này
        const products = await mongoose.model('Products').find({ sizes: sizeId });

        // Tìm và xóa tất cả biến thể có size này
        await mongoose.model('Variants').deleteMany({
            'sizes': sizeId
        });

        // Xóa các sản phẩm chỉ có size này
        for (const product of products) {
            if (product.sizes.length === 1) {
                // Xóa tham chiếu từ danh mục
                await mongoose.model('Categories').findByIdAndUpdate(product.category, {
                    $pull: { products: product._id }
                });

                // Xóa tham chiếu từ thương hiệu
                await mongoose.model('Brand').findByIdAndUpdate(product.brand, {
                    $pull: { products: product._id }
                });

                // Xóa tham chiếu từ màu sắc
                await mongoose.model('Colors').updateMany(
                    { _id: { $in: product.colors } },
                    { $pull: { products: product._id } }
                );

                // Xóa sản phẩm
                await mongoose.model('Products').findByIdAndDelete(product._id);
            } else {
                // Nếu sản phẩm có nhiều size, chỉ xóa size này khỏi danh sách
                await mongoose.model('Products').findByIdAndUpdate(product._id, {
                    $pull: { sizes: sizeId }
                });
            }
        }

        // Cuối cùng xóa size
        await Size.findByIdAndDelete(sizeId);

        return res.status(200).json({
            message: "Xóa size và tất cả sản phẩm, biến thể liên quan thành công",
            deletedSize: size,
            affectedProducts: products.length
        });
    } catch (error) {
        console.error("Lỗi khi xóa size:", error);
        return res.status(400).json({
            message: "Lỗi khi xóa size",
            error: error.message
        });
    }
};
