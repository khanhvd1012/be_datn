import Joi from 'joi';
import Filter from 'leo-profanity';

// Thêm từ tiếng Việt vào filter
Filter.add(['địt', 'lồn', 'cặc', 'đụ', 'bú', 'dcm', 'dm', 'đm']);

// Schema cho tạo mới review (bắt buộc product_id)
const createReviewSchema = Joi.object({
    product_id: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .required()
        .messages({
            'string.pattern.base': 'Định dạng ID sản phẩm không hợp lệ',
            'string.empty': 'ID sản phẩm không được để trống'
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
        .custom((value, helpers) => {
            if (Filter.check(value)) {
                return helpers.error('comment.profane');
            }
            return value;
        })
        .messages({
            'string.empty': 'Nội dung đánh giá không được để trống',
            'string.min': 'Nội dung đánh giá phải có ít nhất 1 ký tự',
            'string.max': 'Nội dung đánh giá không được vượt quá 1000 ký tự',
            'comment.profane': 'Nội dung chứa từ ngữ không phù hợp'
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

// Schema cho update review (không bắt buộc product_id)
const updateReviewSchema = Joi.object({
    product_id: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .messages({
            'string.pattern.base': 'Định dạng ID sản phẩm không hợp lệ',
            'string.empty': 'ID sản phẩm không được để trống'
        }),
    rating: Joi.number()
        .integer()
        .min(1)
        .max(5)
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
        .custom((value, helpers) => {
            if (Filter.check(value)) {
                return helpers.error('comment.profane');
            }
            return value;
        })
        .messages({
            'string.empty': 'Nội dung đánh giá không được để trống',
            'string.min': 'Nội dung đánh giá phải có ít nhất 1 ký tự',
            'string.max': 'Nội dung đánh giá không được vượt quá 1000 ký tự',
            'comment.profane': 'Nội dung chứa từ ngữ không phù hợp'
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
    // Nếu là tạo mới (POST /reviews) thì bắt buộc product_id, nếu là update (PUT /reviews/:id) thì không
    const isUpdate = !!req.params.id;
    const schema = isUpdate ? updateReviewSchema : createReviewSchema;

    const { error } = schema.validate(req.body, { abortEarly: false });

    if (error) {
        const errors = error.details.map(detail => ({
            field: detail.context.key,
            message: detail.message
        }));
        return res.status(400).json({ errors });
    }

    // Làm sạch comment trước khi lưu
    if (req.body.comment) {
        req.body.comment = Filter.clean(req.body.comment);
    }

    next();
};