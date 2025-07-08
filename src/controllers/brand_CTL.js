import mongoose from 'mongoose';
import brand_MD from "../models/brand_MD";
import category_MD from "../models/category_MD";
import Product from "../models/product_MD";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// lấy tất cả thương hiệu
export const getAllBrands = async (req, res) => {
    try {
        const brands = await brand_MD.find().sort({ createdAt: -1 });

        const brandsWithUpdatedCategories = await Promise.all(
            brands.map(async (brand) => {
                // Tìm các category đang sử dụng brand hiện tại
                const relatedCategories = await category_MD.find({ brand: brand._id }).select("_id");

                const categoryIds = relatedCategories.map(cat => cat._id);

                // Cập nhật brand với danh sách category mới
                await brand_MD.findByIdAndUpdate(brand._id, { category: categoryIds });

                // Trả về brand kèm thông tin category đã populate name
                return {
                    ...brand.toObject(),
                    category: await category_MD.find({ _id: { $in: categoryIds } }).select("_id name")
                };
            })
        );

        res.status(200).json(brandsWithUpdatedCategories);
    } catch (error) {
        console.error('Lỗi khi cập nhật danh sách category trong brand:', error);
        res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
    }
};

// lấy thông tin thương hiệu theo ID
export const getBrandById = async (req, res) => {
    try {
        // kiểm tra ID có phải là MongoDB ObjectId hợp lệ
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'ID thương hiệu không hợp lệ' });
        }

        // tìm thương hiệu theo ID và populate dữ liệu sản phẩm liên quan
        const brandData = await brand_MD.findById(req.params.id)
            .populate({
                path: 'products',
                select: 'name description price images category brand status quantity'
            })
            .populate({
                path: "category",
                select: "name",
            })

        // kiểm tra nếu không tìm thấy thương hiệu
        if (!brandData) {
            return res.status(404).json({ message: 'Thương hiệu không tồn tại' });
        }

        // trả về kết quả thành công với status 200 và dữ liệu thương hiệu
        res.status(200).json(brandData);
    } catch (error) {
        // ghi log lỗi vào console
        console.error('Lỗi khi lấy dữ liệu thương hiệu:', error);
        // trả về thông báo lỗi với status 500 kèm chi tiết lỗi
        res.status(500).json({
            message: 'Lỗi máy chủ nội bộ',
            error: error.message
        });
    }
}

// tạo thương hiệu
export const createBrand = async (req, res) => {
    try {
        if (req.file) {
            req.body.logo_image = `http://localhost:3000/uploads/${req.file.filename}`;
        }

        const created = await brand_MD.create(req.body);

        res.status(201).json({
            message: 'Thương hiệu đã được tạo thành công',
            data: created
        });
    } catch (error) {
        if (req.file) {
            const filePath = path.join(__dirname, "../../public/uploads", req.file.filename);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }

        console.error('Lỗi khi tạo thương hiệu:', error);

        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                message: 'Lỗi xác thực dữ liệu',
                errors: validationErrors
            });
        }

        if (error.code === 11000) {
            return res.status(400).json({
                message: 'Thương hiệu đã tồn tại',
                error: error.keyValue
            });
        }

        res.status(500).json({
            message: 'Lỗi máy chủ nội bộ',
            error: error.message
        });
    }
}

export const updateBrand = async (req, res) => {
    try {
        const brand = await brand_MD.findById(req.params.id);
        if (!brand) {
            if (req.file) {
                const filePath = path.join(__dirname, "../../public/uploads", req.file.filename);
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            }
            return res.status(404).json({ message: 'Thương hiệu không tồn tại' });
        }

        if (req.file) {
            if (brand.logo_image) {
                const oldFilename = brand.logo_image.split('/uploads/')[1];
                const oldPath = path.join(__dirname, "../../public/uploads", oldFilename);
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            }
            req.body.logo_image = `http://localhost:3000/uploads/${req.file.filename}`;
        }

        const updated = await brand_MD.findByIdAndUpdate(req.params.id, req.body, { new: true });

        res.status(200).json({
            message: 'Cập nhật thương hiệu thành công',
            data: updated
        });
    } catch (error) {
        if (req.file) {
            const filePath = path.join(__dirname, "../../public/uploads", req.file.filename);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }

        console.error('Lỗi khi cập nhật thương hiệu:', error);
        res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
    }
}

export const deleteBrand = async (req, res) => {
    try {
        const brand = await brand_MD.findById(req.params.id);
        if (!brand) {
            return res.status(404).json({ message: 'Thương hiệu không tồn tại' });
        }

        // Xoá ảnh logo nếu có
        if (brand.logo_image) {
            const filename = brand.logo_image.split('/uploads/')[1];
            const filePath = path.join(__dirname, "../../public/uploads", filename);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }

        // Kiểm tra sản phẩm có đang dùng thương hiệu
        const productsCount = await Product.countDocuments({ brand: req.params.id });
        if (productsCount > 0) {
            return res.status(400).json({
                message: 'Không thể xóa thương hiệu vì có sản phẩm đang sử dụng',
                productsCount
            });
        }

        // Xoá brand khỏi tất cả các category đang dùng
        await category_MD.updateMany(
            { brand: req.params.id },
            { $pull: { brand: req.params.id } }
        );

        // Xoá thương hiệu
        await brand_MD.findByIdAndDelete(req.params.id);

        res.status(200).json({ message: 'Thương hiệu đã được xoá ' });
    } catch (error) {
        console.error('Lỗi khi xoá thương hiệu:', error);
        res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
    }
};

