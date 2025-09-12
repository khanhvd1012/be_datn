import Joi from 'joi';
import Filter from 'leo-profanity';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Thêm từ tiếng Việt vào filter
Filter.add(['địt', 'lồn', 'cặc', 'đụ', 'bú', 'dcm', 'dm', 'đm']);

// Schema cho tạo mới review (bắt buộc product_id và order_id)
const createReviewSchema = Joi.object({
    product_variant_id: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .required()
        .messages({
            'string.pattern.base': 'Định dạng ID sản phẩm không hợp lệ',
            'string.empty': 'ID sản phẩm không được để trống'
        }),
    product_id: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .required()
        .messages({
            'string.pattern.base': 'Định dạng ID sản phẩm không hợp lệ',
            'string.empty': 'ID sản phẩm không được để trống'
        }),
    order_id: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .required()
        .messages({
            'string.pattern.base': 'Định dạng ID đơn hàng không hợp lệ',
            'string.empty': 'ID đơn hàng không được để trống'
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

    images: Joi.array().optional(),

    existingImages: Joi.alternatives()
        .try(
            Joi.array().items(Joi.string()),
            Joi.string()
        )
        .optional(),
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

    images: Joi.array().optional(),

    existingImages: Joi.alternatives()
        .try(
            Joi.array().items(Joi.string()),
            Joi.string()
        )
        .optional(),

});

export const validateReview = (req, res, next) => {
    const isUpdate = !!req.params.id;
    const schema = isUpdate ? updateReviewSchema : createReviewSchema;

    try {
        // Làm sạch comment (nếu muốn clean tự động)
        if (req.body.comment) {
            req.body.comment = Filter.clean(req.body.comment);
        }

        // Chuẩn hóa images
        if (req.files?.length > 0) {
            req.body.images = req.files.map(file => `http://localhost:3000/uploads/${file.filename}`);
        }
        if (typeof req.body.images === 'string') {
            req.body.images = [req.body.images];
        }
        if (typeof req.body.existingImages === 'string') {
            req.body.existingImages = [req.body.existingImages];
        }

        // Validate cuối cùng
        const { error } = schema.validate(req.body, { abortEarly: false });
        if (error) {
            if (req.files?.length > 0) {
                req.files.forEach(file => {
                    const filePath = path.join(__dirname, '../../public/uploads', file.filename);
                    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                });
            }
            return res.status(400).json({
                errors: error.details.map(detail => ({
                    field: detail.context.key,
                    message: detail.message
                }))
            });
        }

        next();
    } catch (err) {
        if (req.files?.length > 0) {
            req.files.forEach(file => {
                const filePath = path.join(__dirname, '../../public/uploads', file.filename);
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            });
        }
        console.error('Lỗi validate review:', err);
        return res.status(500).json({ message: 'Lỗi xác thực dữ liệu review', error: err.message });
    }
};
