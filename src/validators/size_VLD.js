import Joi from 'joi';
import Size from '../models/size_MD.js';

const sizeSchema = Joi.object({
    name: Joi.string()
        .required()
        .trim()
        .messages({
            'string.empty': 'Tên size không được để trống',
            'any.required': 'Tên size là bắt buộc'
        }),
    value: Joi.string()
        .required()
        .trim()
        .messages({
            'string.empty': 'Giá trị size không được để trống',
            'any.required': 'Giá trị size là bắt buộc'
        }),
    description: Joi.string()
        .required()
        .messages({
            'string.empty': 'Mô tả size không được để trống',
            'any.required': 'Mô tả size là bắt buộc'
        }),
    status: Joi.string()
        .valid('active', 'inactive')
        .default('active')
        .messages({
            'any.only': 'Trạng thái phải là active hoặc inactive'
        })
});

export const validateSize = async (req, res, next) => {
    try {
        // Validate schema
        const { error } = sizeSchema.validate(req.body, { abortEarly: false });
        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.context.key,
                message: detail.message
            }));
            return res.status(400).json({ errors });
        }

        // Check for duplicate size name
        const existingNameSize = await Size.findOne({ 
            name: req.body.name,
            _id: { $ne: req.params.id } // Exclude current size when updating
        });
        if (existingNameSize) {
            return res.status(400).json({
                errors: [{
                    field: 'name',
                    message: 'Tên size đã tồn tại'
                }]
            });
        }

        // Check for duplicate size value
        const existingValueSize = await Size.findOne({ 
            value: req.body.value,
            _id: { $ne: req.params.id } // Exclude current size when updating
        });
        if (existingValueSize) {
            return res.status(400).json({
                errors: [{
                    field: 'value',
                    message: 'Giá trị size đã tồn tại'
                }]
            });
        }

        next();
    } catch (error) {
        next(error);
    }
};

export default { validateSize };
