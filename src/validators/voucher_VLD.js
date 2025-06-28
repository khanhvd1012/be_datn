import Joi from 'joi';

/**
 * Schema validation cho voucher
 * Bao gồm các trường:
 * - code: Mã voucher (3-20 ký tự, viết hoa)
 * - type: Loại voucher (percentage hoặc fixed)
 * - value: Giá trị giảm giá (số dương, tối đa 100% nếu là percentage)
 * - maxDiscount: Giảm giá tối đa (số dương, có thể null)
 * - minOrderValue: Giá trị đơn hàng tối thiểu (số dương, mặc định 0)
 * - startDate: Ngày bắt đầu (phải sau thời điểm hiện tại)
 * - endDate: Ngày kết thúc (phải sau ngày bắt đầu)
 * - quantity: Số lượng voucher (số nguyên dương)
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

    maxDiscount: Joi.number()
        .min(0)
        .allow(null)
        .messages({
            'number.base': 'Giảm giá tối đa phải là số',
            'number.min': 'Giảm giá tối đa không được âm'
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
        .min('now')
        .messages({
            'date.base': 'Ngày bắt đầu không hợp lệ',
            'date.min': 'Ngày bắt đầu phải sau thời điểm hiện tại'
        }),

    endDate: Joi.date()
        .required()
        .min(Joi.ref('startDate'))
        .messages({
            'date.base': 'Ngày kết thúc không hợp lệ',
            'date.min': 'Ngày kết thúc phải sau ngày bắt đầu'
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

    isActive: Joi.boolean()
        .default(true)
        .messages({
            'boolean.base': 'Trạng thái phải là true hoặc false'
        })
});

/**
 * Middleware validate dữ liệu voucher
 * @param {Object} req - Request object chứa thông tin voucher cần validate
 * @param {Object} res - Response object
 * @param {Function} next - Callback function để chuyển sang middleware tiếp theo
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
