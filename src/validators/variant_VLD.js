import Joi from "joi";


const variantSchema = Joi.object({
    sizes: Joi.array()
        .items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/))
        .min(1)
        .required()
        .messages({
            'array.min': 'Phải chọn ít nhất một size',
            'array.base': 'Sizes phải là một mảng',
            'any.required': 'Sizes không được để trống',
            'string.pattern.base': 'Định dạng ID size không hợp lệ'
        }),

    quantity: Joi.number()
        .min(0)
        .required()
        .messages({
            'number.base': 'Số lượng phải là số',
            'number.min': 'Số lượng không được âm',
            'any.required': 'Số lượng không được để trống'
        }),
          
    color_id: Joi.array()
        .items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/))
        .min(1)
        .required()
        .messages({
            'array.min': 'Phải chọn ít nhất một màu',
            'array.base': 'Colors phải là một mảng',
            'any.required': 'Colors không được để trống',
            'string.pattern.base': 'Định dạng ID màu không hợp lệ'
        }),    sku: Joi.string()
        .required()
        .trim()
        .min(3)
        .max(50)
        .pattern(/^[A-Za-z0-9-_]+$/)
        .messages({
            'string.empty': 'SKU không được để trống',
            'string.min': 'SKU phải có ít nhất 3 ký tự',
            'string.max': 'SKU không được vượt quá 50 ký tự',
            'string.pattern.base': 'SKU chỉ được chứa chữ cái, số, dấu gạch ngang và gạch dưới',
            'any.required': 'SKU là trường bắt buộc'
        }),

    price: Joi.number()
        .min(0)
        .required()
        .messages({
            'number.base': 'Giá phải là số',
            'number.min': 'Giá không được âm',
            'any.required': 'Giá không được để trống'
        }),

    images: Joi.array()
        .items(Joi.string().uri())
        .min(1)
        .required()
        .messages({
            'array.min': 'Phải có ít nhất một hình ảnh',
            'array.base': 'Images phải là một mảng',
            'string.uri': 'URL hình ảnh không hợp lệ',
            'any.required': 'Images không được để trống'
        }),

    status: Joi.string()
        .valid('active', 'inactive')
        .default('active')
        .messages({
            'any.only': 'Trạng thái phải là active hoặc inactive'
        })
});

export const validateVariant = (req, res, next) => {
    const { error } = variantSchema.validate(req.body, { abortEarly: false });

    if (error) {
        const errors = error.details.map(detail => ({
            field: detail.context.key,
            message: detail.message
        }));
        return res.status(400).json({ errors });
    }

    next();
};