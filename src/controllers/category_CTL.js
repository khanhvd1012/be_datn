import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import category_MD from "../models/category_MD";
import product_MD from "../models/product_MD";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Lấy tất cả danh mục
export const getAllCategories = async (req, res) => {
    try {
        const categories = await category_MD.find()
            .sort({ createdAt: -1 });

        res.status(200).json(categories);
    } catch (error) {
        console.error('Lỗi khi lấy danh mục:', error);
        res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
    }
};

// Lấy danh mục theo ID
export const getCategoryById = async (req, res) => {
    try {
        const category = await category_MD.findById(req.params.id)
            .populate({
                path: 'products',
                select: 'name description price images category  status quantity',
                model: product_MD
            })

        if (!category) {
            return res.status(404).json({ message: 'Danh mục không tồn tại' });
        }

        res.status(200).json(category);
    } catch (error) {
        console.error('Lỗi khi lấy danh mục:', error);
        res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
    }
};

// Tạo mới danh mục
export const createCategory = async (req, res) => {
    try {
        if (req.file) {
            req.body.logo_image = `http://localhost:3000/uploads/${req.file.filename}`;
        }

        const created = await category_MD.create(req.body);

        // Populate brand sau khi tạo
        const newCategory = await category_MD.findById(created._id)

        res.status(201).json({
            message: 'Tạo danh mục thành công',
            data: newCategory
        });
    } catch (error) {
        if (req.file) {
            const filePath = path.join(__dirname, "../../public/uploads", req.file.filename);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }

        console.error('Lỗi khi tạo danh mục:', error);
        res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
    }
};

// Cập nhật danh mục
export const updateCategory = async (req, res) => {
    try {
        const category = await category_MD.findById(req.params.id);
        if (!category) {
            if (req.file) {
                const filePath = path.join(__dirname, "../../public/uploads", req.file.filename);
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            }
            return res.status(404).json({ message: 'Danh mục không tồn tại' });
        }

        // Nếu có ảnh mới thì xoá ảnh cũ
        if (req.file) {
            if (category.logo_image) {
                const oldFilename = category.logo_image.split('/uploads/')[1];
                const oldPath = path.join(__dirname, "../../public/uploads", oldFilename);
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            }
            req.body.logo_image = `http://localhost:3000/uploads/${req.file.filename}`;
        }

        const updated = await category_MD.findByIdAndUpdate(req.params.id, req.body, { new: true });

        res.status(200).json({
            message: 'Cập nhật danh mục thành công',
            data: updated,
        });
    } catch (error) {
        if (req.file) {
            const filePath = path.join(__dirname, "../../public/uploads", req.file.filename);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }

        console.error('Lỗi khi cập nhật danh mục:', error);
        res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
    }
};

// Xoá danh mục
export const deleteCategory = async (req, res) => {
    try {
        const category = await category_MD.findById(req.params.id);
        if (!category) {
            return res.status(404).json({ message: 'Danh mục không tồn tại' });
        }

        // Xóa logo nếu có
        if (category.logo_image) {
            const filename = category.logo_image.split('/uploads/')[1];
            const filePath = path.join(__dirname, "../../public/uploads", filename);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }

        // 👉 Gỡ id category khỏi sản phẩm
        await product_MD.updateMany(
            { category: req.params.id },
            { $unset: { category: "" } }
        );

        // Xóa danh mục
        await category_MD.findByIdAndDelete(req.params.id);

        res.status(200).json({ message: 'Danh mục đã xoá, id category trong sản phẩm cũng được gỡ bỏ' });
    } catch (error) {
        console.error('Lỗi khi xoá danh mục:', error);
        res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
    }
};