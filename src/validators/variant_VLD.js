import Joi from "joi";


const variantSchema = Joi.object({
    product_id: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .required()
        .messages({
            'string.pattern.base': 'Định dạng ID sản phẩm không hợp lệ',
            'string.empty': 'ID sản phẩm không được để trống'
        }),

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

    color_id: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .required()
        .messages({
            'string.pattern.base': 'Định dạng ID màu không hợp lệ',
            'string.empty': 'ID màu không được để trống'
        }),

    sku: Joi.string()
        .required()
        .trim()
        .messages({
            'string.empty': 'SKU không được để trống'
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