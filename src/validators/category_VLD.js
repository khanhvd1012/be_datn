import Joi from 'joi';
import category_MD from '../models/category_MD';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Không kiểm tra URI vì ảnh được upload từ file
const categorySchema = Joi.object({
    name: Joi.string()
        .min(2)
        .max(50)
        .required()
        .messages({
            'string.empty': 'Tên danh mục không được để trống',
            'string.min': 'Tên danh mục phải có ít nhất 2 ký tự',
            'string.max': 'Tên danh mục không được vượt quá 50 ký tự',
            'any.required': 'Tên danh mục là bắt buộc',
        }),

    description: Joi.string()
        .required()
        .max(500)
        .messages({
            'string.empty': 'Mô tả danh mục không được để trống',
            'string.max': 'Mô tả không được vượt quá 500 ký tự',
            'any.required': 'Mô tả danh mục là bắt buộc',
        }),

    logo_image: Joi.string().optional(),
});

export const validateCategory = async (req, res, next) => {
    const deleteUploadedFile = (filename) => {
        const filePath = path.join(__dirname, "../../public/uploads", filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    };

    try {
        if (req.file) {
            req.body.logo_image = `http://localhost:3000/uploads/${req.file.filename}`;
        }

        if (req.body.brand) {
            req.body.brand = Array.isArray(req.body.brand)
                ? req.body.brand
                : [req.body.brand];
        }

        const { error } = categorySchema.validate(req.body, { abortEarly: false });

        if (error) {
            if (req.file) deleteUploadedFile(req.file.filename);
            const errors = error.details.map((detail) => ({
                field: detail.context.key,
                message: detail.message,
            }));
            return res.status(400).json({ errors });
        }

        const existingCategoryByName = await category_MD.findOne({
            name: { $regex: new RegExp(`^${req.body.name}$`, 'i') },
        });

        const isUpdate = !!req.params.id;

        if (!isUpdate && existingCategoryByName) {
            if (req.file) deleteUploadedFile(req.file.filename);
            return res.status(400).json({
                errors: [{ field: 'name', message: 'Tên danh mục đã tồn tại' }],
            });
        }

        if (isUpdate && existingCategoryByName &&
            existingCategoryByName._id.toString() !== req.params.id
        ) {
            if (req.file) deleteUploadedFile(req.file.filename);
            return res.status(400).json({
                errors: [{ field: 'name', message: 'Tên danh mục đã tồn tại' }],
            });
        }

        next();
    } catch (error) {
        if (req.file) deleteUploadedFile(req.file.filename);
        console.error('Category validation error:', error);
        return res.status(500).json({
            message: 'Lỗi xác thực dữ liệu danh mục',
            error: error.message,
        });
    }
};
