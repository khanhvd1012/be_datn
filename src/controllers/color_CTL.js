import Color from "../models/color_MD.js";
import Product from "../models/product_MD.js";
import Variant from "../models/variant_MD.js";
import Category from "../models/category_MD.js";
import Brand from "../models/brand_MD.js";
import Size from "../models/size_MD.js";
import colorSchema from "../validators/color_VLD.js";

export const getAll = async (req, res) => {
    try {
        const colors = await Color.find();
        return res.status(200).json({
            message: "Lấy danh sách màu sắc thành công!",
            colors
        });
    } catch (error) {
        return res.status(500).json({
            message: "Lỗi khi lấy danh sách màu sắc!",
            error: error.message
        });
    }
};

export const getById = async (req, res) => {
    try {
        const color = await Color.findById(req.params.id);
        if (!color) {
            return res.status(404).json({
                message: "Không tìm thấy màu sắc!"
            });
        }
        return res.status(200).json({
            message: "Lấy thông tin màu sắc thành công!",
            color
        });
    } catch (error) {
        return res.status(500).json({
            message: "Lỗi khi lấy thông tin màu sắc!",
            error: error.message
        });
    }
};

export const create = async (req, res) => {
    try {
        const { error } = colorSchema.validate(req.body, { abortEarly: false });
        if (error) {
            const errors = error.details.map((err) => ({
                message: err.message
            }));
            return res.status(400).json({
                message: "Xác thực dữ liệu không thành công!",
                errors
            });
        }

        const existingColor = await Color.findOne({
            $or: [
                { name: req.body.name },
                { code: req.body.code }
            ]
        });
        if (existingColor) {
            return res.status(400).json({
                message: "Màu sắc đã tồn tại!"
            });
        }

        const color = await Color.create(req.body);
        return res.status(201).json({
            message: "Thêm màu sắc thành công!",
            color
        });
    } catch (error) {
        return res.status(500).json({
            message: "Lỗi khi thêm màu sắc!",
            error: error.message
        });
    }
};

export const update = async (req, res) => {
    try {
        const { error } = colorSchema.validate(req.body, { abortEarly: false });
        if (error) {
            const errors = error.details.map((err) => ({
                message: err.message
            }));
            return res.status(400).json({
                message: "Xác thực dữ liệu không thành công!",
                errors
            });
        }

        const existingColor = await Color.findOne({
            $or: [
                { name: req.body.name },
                { code: req.body.code }
            ],
            _id: { $ne: req.params.id }
        });
        if (existingColor) {
            return res.status(400).json({
                message: "Màu sắc đã tồn tại!"
            });
        }

        const color = await Color.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        if (!color) {
            return res.status(404).json({
                message: "Không tìm thấy màu sắc!"
            });
        }

        return res.status(200).json({
            message: "Cập nhật màu sắc thành công!",
            color
        });
    } catch (error) {
        return res.status(500).json({
            message: "Lỗi khi cập nhật màu sắc!",
            error: error.message
        });
    }
};

export const remove = async (req, res) => {
    try {
        const colorId = req.params.id;

        // Kiểm tra màu tồn tại
        const color = await Color.findById(colorId);
        if (!color) {
            return res.status(404).json({
                message: "Không tìm thấy màu sắc!"
            });
        }

        // Tìm tất cả sản phẩm có màu này
        const products = await Product.find({ colors: colorId });
        
        // Xóa tất cả biến thể có màu này
        await Variant.deleteMany({ color_id: colorId });

        // Xóa các sản phẩm có màu này
        for (const product of products) {
            // Xóa tham chiếu từ danh mục
            await Category.findByIdAndUpdate(product.category, {
                $pull: { products: product._id }
            });

            // Xóa tham chiếu từ thương hiệu
            await Brand.findByIdAndUpdate(product.brand, {
                $pull: { products: product._id }
            });

            // Xóa tham chiếu từ kích thước
            await Size.updateMany(
                { _id: { $in: product.sizes } },
                { $pull: { products: product._id } }
            );

            // Xóa tham chiếu từ màu sắc khác
            await Color.updateMany(
                { _id: { $in: product.colors } },
                { $pull: { products: product._id } }
            );
        }

        // Xóa tất cả sản phẩm có màu này
        await Product.deleteMany({ colors: colorId });

        // Cuối cùng xóa màu
        await Color.findByIdAndDelete(colorId);

        return res.status(200).json({
            message: "Xóa màu sắc và tất cả sản phẩm, biến thể liên quan thành công!",
            deletedColor: color
        });
    } catch (error) {
        console.error("Lỗi khi xóa màu sắc:", error);
        return res.status(500).json({
            message: "Lỗi khi xóa màu sắc!",
            error: error.message
        });
    }
};
