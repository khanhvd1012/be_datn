import Joi from 'joi';

const orderSchema = Joi.object({
    address: Joi.string().min(5).required().label('Địa chỉ giao hàng'),
    phone: Joi.string()
        .pattern(/^(0|\+84)[0-9]{9,10}$/)
        .required()
        .label('Số điện thoại')
        .messages({
            'string.pattern.base': 'Số điện thoại không hợp lệ'
        }),
    payment_method: Joi.string()
        .valid('cod', 'momo', 'vnpay') // bạn có thể sửa theo các phương thức thanh toán của mình
        .required()
        .label('Phương thức thanh toán')
        .messages({
            'any.only': 'Phương thức thanh toán không hợp lệ'
        }),
    voucher_code: Joi.string().allow('', null).optional().label('Mã giảm giá'),
    size_id: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
        'string.pattern.base': 'Định dạng ID size không hợp lệ',
        'string.empty': 'Vui lòng chọn size'
    }),
});

export const validateOrder = async (req, res, next) => {
    const { error } = orderSchema.validate(req.body, { abortEarly: false });
    if (error) {
        const messages = error.details.map((detail) => detail.message);
        return res.status(400).json({ message: messages });
    }
    next();
}
