import Joi from "joi";


const variantSchema = Joi.object({
    product_id: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .required()
        .messages({
            'string.pattern.base': 'Định dạng ID sản phẩm không hợp lệ',
            'string.empty': 'ID sản phẩm không được để trống'
        }),

    color: Joi.string()
        .required()
        .messages({
            'string.empty': 'Màu sắc không được để trống'
        }),

    size: Joi.string()
        .required()
        .messages({
            'string.empty': 'Kích thước không được để trống'
        }),

    image_url: Joi.string()
        .uri()
        .required()
        .messages({
            'string.uri': 'Định dạng URL ảnh không hợp lệ',
            'string.empty': 'URL ảnh không được để trống'
        }),

    price: Joi.number()
        .min(0)
        .required()
        .messages({
            'number.base': 'Giá bán phải là số',
            'number.min': 'Giá bán không được âm',
            'number.empty': 'Giá bán không được để trống'
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