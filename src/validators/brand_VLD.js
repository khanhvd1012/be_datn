import Joi from 'joi';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import brand_MD from '../models/brand_MD';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const brandSchema = Joi.object({
    name: Joi.string().min(2).max(50).required().messages({
        'string.empty': 'Tên thương hiệu không được để trống',
        'string.min': 'Tên thương hiệu phải có ít nhất 2 ký tự',
        'string.max': 'Tên thương hiệu không được vượt quá 50 ký tự',
        'any.required': 'Tên thương hiệu là bắt buộc',
    }),
    description: Joi.string().max(500).required().messages({
        'string.empty': 'Mô tả thương hiệu không được để trống',
        'string.max': 'Mô tả không được vượt quá 500 ký tự',
        'any.required': 'Mô tả thương hiệu là bắt buộc',
    }),
    logo_image: Joi.string().optional(),
});

export const validateBrand = async (req, res, next) => {
    try {
        // Gán logo nếu có
        if (req.file) {
            req.body.logo_image = `http://localhost:3000/uploads/${req.file.filename}`;
        }

        // Validate dữ liệu
        const { error } = brandSchema.validate(req.body, { abortEarly: false });
        if (error) {
            //Nếu có file upload và lỗi => xóa file
            if (req.file) {
                const filePath = path.join(__dirname, "../../public/uploads", req.file.filename);
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            }

            const errors = error.details.map(detail => ({
                field: detail.context.key,
                message: detail.message
            }));
            return res.status(400).json({ errors });
        }

        // Kiểm tra tên trùng
        const existingBrand = await brand_MD.findOne({
            name: { $regex: new RegExp(`^${req.body.name}$`, 'i') }
        });

        if (!req.params.id && existingBrand) {
            if (req.file) {
                const filePath = path.join(__dirname, "../../public/uploads", req.file.filename);
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            }

            return res.status(400).json({
                errors: [{ field: 'name', message: 'Tên thương hiệu đã tồn tại' }]
            });
        }

        if (req.params.id && existingBrand && existingBrand._id.toString() !== req.params.id) {
            if (req.file) {
                const filePath = path.join(__dirname, "../../public/uploads", req.file.filename);
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            }

            return res.status(400).json({
                errors: [{ field: 'name', message: 'Tên thương hiệu đã tồn tại' }]
            });
        }

        next();
    } catch (error) {
        console.error('Lỗi xác thực thương hiệu:', error);

        if (req.file) {
            const filePath = path.join(__dirname, "../../public/uploads", req.file.filename);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }

        return res.status(500).json({
            message: 'Lỗi xác thực dữ liệu thương hiệu',
            error: error.message
        });
    }
};

export default brandSchema;
