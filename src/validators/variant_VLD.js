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

<<<<<<< HEAD
    gender: Joi.string()
        .valid('unisex', 'male', 'female')
        .required()
        .messages({
            'any.only': 'Giới tính phải là unisex, nam hoặc nữ',
            'string.empty': 'Giới tính không được để trống'
        }),

    import_price: Joi.number()
        .min(0)
        .max(Joi.ref('price'))
        .required()
        .messages({
            'number.base': 'Giá nhập phải là số',
            'number.min': 'Giá nhập không được âm',
            'number.max': 'Giá nhập không được cao hơn giá bán',
            'number.empty': 'Giá nhập không được để trống'
        }),

    initial_stock: Joi.number()
        .min(0)
        .optional()
        .messages({
            'number.base': 'Số lượng nhập kho ban đầu phải là số',
            'number.min': 'Số lượng nhập kho ban đầu không được âm'
        }),

    status: Joi.string()
        .valid('inStock', 'outOfStock')
        .default('inStock')
        .messages({
            'any.only': 'Trạng thái phải là inStock hoặc outOfStock'
=======
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
>>>>>>> 1982ae5b937541c479889b7813204594075a6143
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