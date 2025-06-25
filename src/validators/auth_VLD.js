import Joi from 'joi';

const registerSchema = Joi.object({
    username: Joi.string()
        .required()
        .messages({
            'string.empty': 'Tên người dùng không được để trống',
            'any.required': 'Tên người dùng là bắt buộc'
        }),
        
    email: Joi.string()
        .email()
        .required()
        .messages({
            'string.email': 'Định dạng email không hợp lệ',
            'string.empty': 'Email không được để trống',
            'any.required': 'Email là bắt buộc'
        }),
    
    password: Joi.string()
        .min(6)
        .required()
        .messages({
            'string.empty': 'Mật khẩu không được để trống',
            'string.min': 'Mật khẩu phải có ít nhất 6 ký tự',
            'any.required': 'Mật khẩu là bắt buộc'
        }),
        
    full_name: Joi.string()
        .allow('')
        .optional()
        .messages({
            'string.empty': 'Họ và tên không được để trống'
        }),
        
    address: Joi.string()
        .allow('')
        .optional()
        .messages({
            'string.empty': 'Địa chỉ không được để trống'
        }),
        
    phone: Joi.string()
        .allow('')
        .optional()
        .pattern(/^[0-9]{10}$/)
        .messages({
            'string.empty': 'Số điện thoại không được để trống',
            'string.pattern.base': 'Số điện thoại phải có 10 chữ số'
        })
});

export const validateRegister = (req, res, next) => {
    const { error } = registerSchema.validate(req.body, { abortEarly: false });
    
    if (error) {
        const errors = error.details.map(detail => ({
            field: detail.context.key,
            message: detail.message
        }));
        return res.status(400).json({ errors });
    }
    
    next();
};