import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import category_MD from "../models/category_MD";
import product_MD from "../models/product_MD";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Hàm xử lý lấy tất cả danh mục
export const getAllCategories = async (req, res) => {
    try {
        // Lấy tất cả danh mục từ cơ sở dữ liệu

        const categories = await category_MD.find();
        res.status(200).json(categories);
    } catch (error) {
        console.error('Lỗi khi lấy dữ liệu danh mục:', error);
        res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
    }
}

// Hàm xử lý lấy danh mục theo ID
export const getCategoryById = async (req, res) => {
    try {
        const CategoryId = await category_MD.findById(req.params.id)
            .populate({
                path: 'products',
                select: 'name description price images category brand status quantity',
                model: product_MD
            });
        // Kiểm tra nếu không tìm thấy danh mục
        if (!CategoryId) {
            return res.status(404).json({ message: 'Danh mục không tồn tại' });
        }
        res.status(200).json(CategoryId);

    } catch (error) {
        console.error('Lỗi khi lấy dữ liệu danh mục:', error);
        res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
    }
}

// Hàm xử lý tạo mới danh mục
export const createCategory = async (req, res) => {
    try {
        if (req.file) {
            const imageUrl = `http://localhost:3000/uploads/${req.file.filename}`;
            req.body.logo_image = imageUrl;
        }

        const categoryData = await category_MD.create(req.body);

        return res.status(201).json({
            message: 'Danh mục đã được tạo thành công',
            data: categoryData
        });

    } catch (error) {
        // Xoá ảnh nếu có lỗi khi tạo
        if (req.file) {
            const filePath = path.join(__dirname, "../../public/uploads", req.file.filename);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        console.error('Lỗi khi tạo danh mục:', error);
        res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
    }
};

// Hàm xử lý cập nhật danh mục
export const updateCategory = async (req, res) => {
    try {
        const categoryId = req.params.id;
        const category = await category_MD.findById(categoryId);

        if (!category) {
            // Nếu danh mục không tồn tại mà có upload ảnh mới thì xoá ảnh luôn
            if (req.file) {
                const filePath = path.join(__dirname, "../../public/uploads", req.file.filename);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }

            return res.status(404).json({ message: 'Danh mục không tồn tại' });
        }

        // Nếu có ảnh mới => xoá ảnh cũ
        if (req.file) {
            if (category.logo_image) {
                const oldFilename = category.logo_image.split('/uploads/')[1];
                const oldPath = path.join(__dirname, "../../public/uploads", oldFilename);

                if (fs.existsSync(oldPath)) {
                    fs.unlinkSync(oldPath);
                }
            }

            req.body.logo_image = `http://localhost:3000/uploads/${req.file.filename}`;
        }

        const updatedCategory = await category_MD.findByIdAndUpdate(categoryId, req.body, { new: true });

        res.status(200).json({
            message: 'Danh mục đã được cập nhật thành công',
            data: updatedCategory,
        });

    } catch (error) {
        // Nếu có ảnh upload mà lỗi thì xoá
        if (req.file) {
            const filePath = path.join(__dirname, "../../public/uploads", req.file.filename);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        console.error('Lỗi khi cập nhật danh mục:', error);
        res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
    }
};

// Hàm xử lý xóa danh mục 
export const deleteCategory = async (req, res) => {
    try {
        const categoryId = req.params.id;

        // Kiểm tra danh mục có tồn tại không
        const category = await category_MD.findById(categoryId);
        if (!category) {
            return res.status(404).json({ message: 'Danh mục không tồn tại' });
        }

        // Xóa ảnh nếu có
        if (category.logo_image) {
            const imageUrl = category.logo_image;
            const filename = imageUrl.split('/uploads/')[1]; // chỉ lấy phần tên file
            const filePath = path.join(__dirname, "../../public/uploads", filename);

            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            } else {
                console.warn("Ảnh không tồn tại để xóa:", filePath);
            }
        }

        // Xóa tất cả sản phẩm thuộc danh mục này
        await product_MD.deleteMany({ category: categoryId });

        // Xóa danh mục
        await category_MD.findByIdAndDelete(categoryId);

        res.status(200).json({
            message: 'Danh mục và các sản phẩm thuộc danh mục đã được xóa thành công'
        });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
    }
}

