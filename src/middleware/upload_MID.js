import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Cấu hình lưu trữ cho multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Xác định loại upload (product hoặc variant) từ route
        const type = req.path.includes('product') ? 'products' : 'variants';
        const uploadDir = `public/uploads/${type}`;
        
        // Tạo thư mục nếu không tồn tại
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Tạo tên file với timestamp để tránh trùng lặp
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const fileExt = path.extname(file.originalname);
        cb(null, `${file.fieldname}-${uniqueSuffix}${fileExt}`);
    }
});

// Kiểm tra loại file
const fileFilter = (req, file, cb) => {
    // Chỉ cho phép các định dạng ảnh phổ biến
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Chỉ cho phép upload file ảnh (jpg, png, gif, webp)!'), false);
    }
};

// Cấu hình upload
const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // Giới hạn kích thước file 5MB
        files: 10 // Giới hạn số lượng file upload cùng lúc
    }
});

export default upload;
