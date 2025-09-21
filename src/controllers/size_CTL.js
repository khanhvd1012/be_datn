import Size from '../models/size_MD.js';
import Variant from '../models/variant_MD.js'; 

// Tạo size
export const createSize = async (req, res) => {
    try {
        const existingSize = await Size.findOne({ size: req.body.size });
        if (existingSize) {
            return res.status(400).json({
                message: "Size đã tồn tại!"
            });
        }
        const size = await Size.create(req.body);
        return res.status(201).json({
            message: "Tạo size thành công",
            size
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({
                message: "Size đã tồn tại!"
            });
        }
        return res.status(400).json({
            message: error.message
        });
    }
};

// Lấy tất cả size 
export const getAllSizes = async (req, res) => {
    try {
        const sizes = await Size.find().sort({ createdAt: -1 });
        return res.status(200).json({
            message: "Lấy danh sách size thành công",
            sizes
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
        const size = await Size.findById(req.params.id);
        if (!size) {
            return res.status(404).json({
                message: "Không tìm thấy size"
            });
        }
        // Lấy tất cả các biến thể có chứa size này
        const variants = await Variant.find({ size: size._id }); // Sửa lại cho đúng field
        return res.status(200).json({
            message: "Lấy size thành công",
            size,
            variants
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
        const existingSize = await Size.findOne({
            size: req.body.size,
            _id: { $ne: req.params.id }
        });
        if (existingSize) {
            return res.status(400).json({
                message: "Size đã tồn tại!"
            });
        }
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
        if (error.code === 11000) {
            return res.status(400).json({
                message: "Size đã tồn tại!"
            });
        }
        return res.status(400).json({
            message: error.message
        });
    }
};

// Delete size
export const deleteSize = async (req, res) => {
    try {
        // Kiểm tra size tồn tại
        const size = await Size.findById(req.params.id);
        if (!size) {
            return res.status(404).json({
                message: "Không tìm thấy size"
            });
        }

        // Xóa size khỏi các biến thể liên quan
        await Variant.updateMany(
            { size: size._id },
            { $pull: { size: size._id } }
        );

        // Xóa size khỏi collection Size
        await Size.findByIdAndDelete(req.params.id);

        return res.status(200).json({
            message: "Xóa size thành công"
        });
    } catch (error) {
        console.error("Lỗi khi xóa size:", error);
        return res.status(400).json({
            message: "Lỗi khi xóa size",
            error: error.message
        });
    }
};
