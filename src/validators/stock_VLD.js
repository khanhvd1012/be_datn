import Joi from 'joi';

const stockSchema = Joi.object({
    variant_id: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .required()
        .messages({
            'string.pattern.base': 'Định dạng ID biến thể không hợp lệ',
            'string.empty': 'ID biến thể không được để trống'
        }),
    
    quantity: Joi.number()
        .integer()
        .min(1)
        .required()
        .messages({
            'number.base': 'Số lượng phải là số',
            'number.integer': 'Số lượng phải là số nguyên',
            'number.min': 'Số lượng phải lớn hơn 0',
            'number.empty': 'Số lượng không được để trống'
        }),
    
    type: Joi.string()
        .valid('in', 'out')
        .required()
        .messages({
            'any.only': 'Loại phải là "nhập kho" hoặc "xuất kho"',
            'string.empty': 'Loại không được để trống'
        }),
    
    reason: Joi.string()
        .max(200)
        .required()
        .messages({
            'string.empty': 'Lý do không được để trống',
            'string.max': 'Lý do không được vượt quá 200 ký tự'
        }),
    
    note: Joi.string()
        .max(500)
        .allow('', null)
        .messages({
            'string.max': 'Ghi chú không được vượt quá 500 ký tự'
        })
});

export const validateStock = (req, res, next) => {
    const { error } = stockSchema.validate(req.body, { abortEarly: false });
    
    if (error) {
        const errors = error.details.map(detail => ({
            field: detail.context.key,
            message: detail.message
        }));
        return res.status(400).json({ errors });
    }
    
    next();
};