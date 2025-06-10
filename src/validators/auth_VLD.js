import Joi from 'joi';

const registerSchema = Joi.object({
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