import mongoose from "mongoose";
import category_MD from "../models/category_MD";
import product_MD from "../models/product_MD";

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
        const categoryData = await category_MD.create(req.body);
        return res.status(201).json({
            message: 'Danh mục đã được tạo thành công',
            data: categoryData
        });
    } catch (error) {
        console.error('Lỗi khi tạo danh mục:', error);
        res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
    }
}

// Hàm xử lý cập nhật danh mục
export const updateCategory = async (req, res) => {
    try {
        const categoryid = await category_MD.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!categoryid) {
            return res.status(404).json({ message: 'Danh mục không tồn tại' });
        }
        res.status(200).json({
            message: 'Danh mục đã được cập nhật thành công',
            data: categoryid
        });
    } catch (error) {
        console.error('Lỗi khi cập nhật danh mục:', error);
        res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
    }
}

// Hàm xử lý xóa danh mục 
export const deleteCategory = async (req, res) => {
    try {
        const categoryId = req.params.id;
        
        // Kiểm tra danh mục có tồn tại không
        const category = await category_MD.findById(categoryId);
        if (!category) {
            return res.status(404).json({ message: 'Danh mục không tồn tại' });
        }
        
        // Xóa tất cả sản phẩm thuộc danh mục này
        await product_MD.deleteMany({ category: categoryId });

        // Xóa danh mục
        await category_MD.findByIdAndDelete(categoryId);
        
        res.status(200).json({ 
            message: 'Danh mục và các sản phẩm thuộc danh mục đã được xóa thành công' 
        });
    } catch (error) {
        console.error('Lỗi khi xóa danh mục:', error);
        res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
    }
}