import Joi from 'joi';
import Size from '../models/size_MD.js';

const sizeSchema = Joi.object({
    size: Joi.number()
        .required()
        .messages({
            'number.base': 'Giá trị size phải là số',
            'any.required': 'Giá trị size là bắt buộc'
        }),
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

        // Check for duplicate size value
        const existingSize = await Size.findOne({
            size: req.body.size,
            _id: { $ne: req.params.id } // Exclude current size when updating
        });
        if (existingSize) {
            return res.status(400).json({
                errors: [{
                    field: 'size',
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
