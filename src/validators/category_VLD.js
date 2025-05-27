import Joi from 'joi';
import category_MD from '../models/category_MD';

const categorySchema = Joi.object({
    name: Joi.string()
        .min(2)
        .max(50)
        .required()
        .messages({
            'string.empty': 'Tên danh mục không được để trống',
            'string.min': 'Tên danh mục phải có ít nhất 2 ký tự',
            'string.max': 'Tên danh mục không được vượt quá 50 ký tự',
            'any.required': 'Tên danh mục là bắt buộc'
        }),

    description: Joi.string()
        .max(500)
        .messages({
            'string.max': 'Mô tả không được vượt quá 500 ký tự'
        }),

    logo_image: Joi.string()
        .uri()
        .messages({
            'string.uri': 'Định dạng URL hình ảnh không hợp lệ'
        })
});

export const validateCategory = async (req, res, next) => {
    try {
        // Kiểm tra cấu trúc dữ liệu với Joi
        const { error } = categorySchema.validate(req.body, { abortEarly: false });

        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.context.key,
                message: detail.message
            }));
            return res.status(400).json({ errors });
        }

        // Kiểm tra tên category có trùng lặp không
        const existingCategoryByName = await category_MD.findOne({
            name: { $regex: new RegExp(`^${req.body.name}$`, 'i') } // Case insensitive search
        });

        // Nếu đang tạo mới (không có id) và tìm thấy category trùng tên
        if (!req.params.id && existingCategoryByName) {
            return res.status(400).json({
                errors: [{
                    field: 'name',
                    message: 'Tên danh mục đã tồn tại '
                }]
            });
        }

        // Nếu đang cập nhật (có id) và tìm thấy category trùng tên nhưng không phải category hiện tại
        if (req.params.id && existingCategoryByName && existingCategoryByName._id.toString() !== req.params.id) {
            return res.status(400).json({
                errors: [{
                    field: 'name',
                    message: 'Tên danh mục đã tồn tại '
                }]
            });
        }

        next();
    } catch (error) {
        console.error('Category validation error:', error);
        return res.status(500).json({
            message: 'Error validating category data',
            error: error.message
        });
    }
};