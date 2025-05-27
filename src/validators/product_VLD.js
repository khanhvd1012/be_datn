import Joi from 'joi';

const productSchema = Joi.object({
    name: Joi.string()
        .min(2)
        .max(100)
        .required()
        .messages({
            'string.empty': 'Tên sản phẩm không được để trống',
            'string.min': 'Tên sản phẩm phải có ít nhất 2 ký tự',
            'string.max': 'Tên sản phẩm không được vượt quá 100 ký tự'
        }),
    
    description: Joi.string()
        .max(1000)
        .messages({
            'string.max': 'Mô tả không được vượt quá 1000 ký tự'
        }),
    
    brand: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .required()
        .messages({
            'string.pattern.base': 'Định dạng ID thương hiệu không hợp lệ',
            'string.empty': 'ID thương hiệu không được để trống'
        }),
    
    category: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .required()
        .messages({
            'string.pattern.base': 'Định dạng ID danh mục không hợp lệ',
            'string.empty': 'ID danh mục không được để trống'
        }),
    
    gender: Joi.string()
        .valid('unisex', 'male', 'female')
        .required()
        .messages({
            'any.only': 'Giới tính phải là unisex, nam hoặc nữ',
            'string.empty': 'Giới tính không được để trống'
        }),
    
    variants: Joi.array()
        .items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/))
        .min(1)
        .messages({
            'array.min': 'Phải có ít nhất một biến thể',
            'string.pattern.base': 'Định dạng ID biến thể không hợp lệ'
        })
});

export const validateProduct = (req, res, next) => {
    const { error } = productSchema.validate(req.body, { abortEarly: false });
    
    if (error) {
        const errors = error.details.map(detail => ({
            field: detail.context.key,
            message: detail.message
        }));
        return res.status(400).json({ errors });
    }
    
    next();
};