import fs from 'fs';
import path from 'path';

export const uploadProductImages = async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ 
                message: "Vui lòng chọn ít nhất một file ảnh cho sản phẩm" 
            });
        }

        // Tạo mảng đường dẫn các file đã upload
        const imageUrls = req.files.map(file => `/uploads/products/${file.filename}`);

        res.status(200).json({
            message: "Upload ảnh sản phẩm thành công",
            data: imageUrls
        });
    } catch (error) {
        console.error("Lỗi khi upload ảnh sản phẩm:", error);
        res.status(500).json({ 
            message: "Lỗi khi upload ảnh sản phẩm",
            error: error.message 
        });
    }
};

export const uploadVariantImages = async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ 
                message: "Vui lòng chọn ít nhất một file ảnh cho biến thể" 
            });
        }

        // Tạo mảng đường dẫn các file đã upload
        const imageUrls = req.files.map(file => `/uploads/variants/${file.filename}`);

        res.status(200).json({
            message: "Upload ảnh biến thể thành công",
            data: imageUrls
        });
    } catch (error) {
        console.error("Lỗi khi upload ảnh biến thể:", error);
        res.status(500).json({ 
            message: "Lỗi khi upload ảnh biến thể",
            error: error.message 
        });
    }
};

export const deleteImage = async (req, res) => {
    try {
        const { type, filename } = req.params;
        const uploadPath = type === 'product' ? 'products' : 'variants';
        const filepath = path.join('public/uploads', uploadPath, filename);

        if (!fs.existsSync(filepath)) {
            return res.status(404).json({ message: "Không tìm thấy file ảnh" });
        }

        fs.unlinkSync(filepath);

        res.status(200).json({ message: "Xóa ảnh thành công" });
    } catch (error) {
        console.error("Lỗi khi xóa ảnh:", error);
        res.status(500).json({ 
            message: "Lỗi khi xóa ảnh",
            error: error.message 
        });
    }
};
