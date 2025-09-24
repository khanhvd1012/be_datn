import Joi from 'joi';

/**
 * Schema validation cho voucher
 */
const voucherSchema = Joi.object({
    code: Joi.string()
        .required()
        .uppercase()
        .min(3)
        .max(20)
        .messages({
            'string.empty': 'Mã voucher không được để trống',
            'string.min': 'Mã voucher phải có ít nhất 3 ký tự',
            'string.max': 'Mã voucher không được vượt quá 20 ký tự'
        }),

    type: Joi.string()
        .valid('percentage', 'fixed')
        .required()
        .messages({
            'any.only': 'Loại voucher phải là percentage hoặc fixed',
            'string.empty': 'Loại voucher không được để trống'
        }),

    value: Joi.number()
        .min(0)
        .required()
        .when('type', {
            is: 'percentage',
            then: Joi.number().max(100)
        })
        .messages({
            'number.base': 'Giá trị phải là số',
            'number.min': 'Giá trị không được âm',
            'number.max': 'Phần trăm giảm giá không được vượt quá 100%'
        }),

    minOrderValue: Joi.number()
        .min(0)
        .default(0)
        .messages({
            'number.base': 'Giá trị đơn hàng tối thiểu phải là số',
            'number.min': 'Giá trị đơn hàng tối thiểu không được âm'
        }),

    startDate: Joi.date()
        .required()
        .custom((value, helpers) => {
            const today = new Date();
            today.setHours(0, 0, 0, 0); // reset về 00:00 hôm nay
            if (value < today) {
                return helpers.error('date.minToday');
            }
            return value;
        })
        .messages({
            'date.base': 'Ngày bắt đầu không hợp lệ',
            'date.minToday': 'Ngày bắt đầu phải từ hôm nay trở đi'
        }),

    endDate: Joi.date()
        .required()
        .min(Joi.ref('startDate'))
        .messages({
            'date.base': 'Ngày kết thúc không hợp lệ',
            'date.min': 'Ngày kết thúc phải sau hoặc bằng ngày bắt đầu'
        }),

    quantity: Joi.number()
        .integer()
        .min(1)
        .required()
        .messages({
            'number.base': 'Số lượng phải là số nguyên',
            'number.min': 'Số lượng phải lớn hơn 0'
        }),

    usedCount: Joi.number()
        .integer()
        .min(0)
        .default(0)
        .messages({
            'number.base': 'Số lượt sử dụng phải là số nguyên',
            'number.min': 'Số lượt sử dụng không được âm'
        }),

    status: Joi.string().valid('active', 'inactive', 'paused').optional()
});

/**
 * Middleware validate dữ liệu voucher
 */
export const validateVoucher = (req, res, next) => {
    const { error } = voucherSchema.validate(req.body, { abortEarly: false });

    if (error) {
        const errors = error.details.map(detail => ({
            field: detail.context.key,
            message: detail.message
        }));
        return res.status(400).json({ errors });
    }

    next();
};
