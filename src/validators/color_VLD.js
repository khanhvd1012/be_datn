import Joi from 'joi';
import Color from '../models/color_MD.js';

const colorSchema = Joi.object({
    name: Joi.string().required().trim().messages({
        'string.empty': 'Tên màu sắc không được để trống',
        'any.required': 'Tên màu sắc là bắt buộc'
    }),
    code: Joi.string().required().trim().pattern(/^#([A-Fa-f0-9]{6})$/).messages({
        'string.empty': 'Mã màu không được để trống',
        'string.pattern.base': 'Mã màu phải là mã hex hợp lệ (ví dụ: #FF0000)',
        'any.required': 'Mã màu là bắt buộc'
    }),
    description: Joi.string().required().messages({
        'string.empty': 'Mô tả màu sắc không được để trống',
        'any.required': 'Mô tả màu sắc là bắt buộc'
    }),
    status: Joi.string().valid('active', 'inactive').default('active').messages({
        'any.only': 'Trạng thái phải là active hoặc inactive'
    })
});
export default colorSchema;


export const validateColor = async (req, res, next) => {
    console.log("🔥 req.body:", req.body);
    try {
        const { error } = colorSchema.validate(req.body, { abortEarly: false });
        console.log("✅ Joi validation result:", error);
        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.context.key,
                message: detail.message
            }));
            return res.status(400).json({ errors });
        }

        const existingColorByName = await Color.findOne({
            name: req.body.name,
            _id: { $ne: req.params.id }
        });
        if (existingColorByName) {
            return res.status(400).json({
                errors: [{
                    field: 'name',
                    message: 'Tên màu sắc đã tồn tại'
                }]
            });
        }

        const existingColorByCode = await Color.findOne({
            code: req.body.code,
            _id: { $ne: req.params.id }
        });
        if (existingColorByCode) {
            return res.status(400).json({
                errors: [{
                    field: 'code',
                    message: 'Mã màu đã tồn tại'
                }]
            });
        }

        next();
    } catch (err) {
        next(err);
    }
};
