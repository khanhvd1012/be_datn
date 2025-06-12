import Joi from 'joi';

const colorValidator = Joi.object({
    name: Joi.string()
        .required()
        .trim()
        .messages({
            'string.empty': 'Tên màu sắc không được để trống',
            'any.required': 'Tên màu sắc là bắt buộc'
        }),
    code: Joi.string()
        .required()
        .trim()
        .pattern(/^#([A-Fa-f0-9]{6})$/)
        .messages({
            'string.empty': 'Mã màu không được để trống',
            'string.pattern.base': 'Mã màu phải là mã hex hợp lệ (ví dụ: #FF0000)',
            'any.required': 'Mã màu là bắt buộc'
        }),
    description: Joi.string()
        .required()
        .messages({
            'string.empty': 'Mô tả màu sắc không được để trống',
            'any.required': 'Mô tả màu sắc là bắt buộc'
        }),
    status: Joi.string()
        .valid('active', 'inactive')
        .default('active')
        .messages({
            'any.only': 'Trạng thái phải là active hoặc inactive'
        })
});

export default colorValidator;
