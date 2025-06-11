import Joi from 'joi';
import Filter from 'leo-profanity';

Filter.loadDictionary();
Filter.add(['địt', 'lồn', 'cặc', 'đụ', 'bú', 'dcm', 'dm', 'đm']);

const reviewSchema = Joi.object({
    product_id: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .required()
        .messages({
            'string.pattern.base': 'Định dạng ID sản phẩm không hợp lệ',
            'string.empty': 'ID sản phẩm không được để trống'
        }),

    user_id: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .required()
        .messages({
            'string.pattern.base': 'Định dạng ID người dùng không hợp lệ',
            'string.empty': 'ID người dùng không được để trống'
        }),

    rating: Joi.number()
        .integer()
        .min(1)
        .max(5)
        .required()
        .messages({
            'number.base': 'Đánh giá phải là số',
            'number.integer': 'Đánh giá phải là số nguyên',
            'number.min': 'Đánh giá phải từ 1 sao trở lên',
            'number.max': 'Đánh giá không được quá 5 sao',
            'number.empty': 'Vui lòng cho điểm đánh giá'
        }),

    comment: Joi.string()
        .min(1)
        .max(1000)
        .required()
        .messages({
            'string.empty': 'Nội dung đánh giá không được để trống',
            'string.min': 'Nội dung đánh giá phải có ít nhất 1 ký tự',
            'string.max': 'Nội dung đánh giá không được vượt quá 1000 ký tự'
        }),

    images: Joi.array()
        .items(
            Joi.string()
                .uri()
                .messages({
                    'string.uri': 'Định dạng URL ảnh không hợp lệ'
                })
        )
        .max(5)
        .messages({
            'array.max': 'Không được tải lên quá 5 ảnh'
        })
});

export const validateReview = (req, res, next) => {
    const { error } = reviewSchema.validate(req.body, { abortEarly: false });
    const errors = [];

    const { comment } = req.body;

    if (error) {
        errors.push(
            ...error.details.map(detail => ({
                field: detail.context.key,
                message: detail.message
            }))
        );
    }

    if (comment && Filter.isProfane(comment)) {
        errors.push({
            field: 'comment',
            message: 'Nội dung chứa từ ngữ không phù hợp'
        });
    }

    if (errors.length > 0) {
        return res.status(400).json({ errors });
    }

    // làm sạch comment
    req.body.comment = Filter.clean(comment);
    next();
};
