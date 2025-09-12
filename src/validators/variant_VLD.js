import Joi from 'joi';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const variantSchema = Joi.object({
    product_id: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required().messages({
        'string.pattern.base': 'Định dạng ID sản phẩm không hợp lệ',
        'string.empty': 'ID sản phẩm không được để trống'
    }),
    color: Joi.string().required().messages({
        'string.empty': 'Màu sắc không được để trống'
    }),
    size: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).messages({
        'string.pattern.base': 'Định dạng ID size không hợp lệ',
        'string.empty': 'Kích thước không được để trống'
    }),
    image_url: Joi.array().optional(),

    existingImages: Joi.alternatives()
        .try(
            Joi.array().items(Joi.string()),
            Joi.string()
        )
        .optional(),

    price: Joi.number().min(0).required().messages({
        'number.base': 'Giá bán phải là số',
        'number.min': 'Giá bán không được âm',
        'number.empty': 'Giá bán không được để trống'
    }),
    gender: Joi.string().valid('unisex', 'male', 'female').required().messages({
        'any.only': 'Giới tính phải là unisex, male hoặc female',
        'string.empty': 'Giới tính không được để trống'
    }),
    import_price: Joi.number().min(0).max(Joi.ref('price')).required().messages({
        'number.base': 'Giá nhập phải là số',
        'number.min': 'Giá nhập không được âm',
        'number.max': 'Giá nhập không được cao hơn giá bán',
        'number.empty': 'Giá nhập không được để trống'
    }),
    initial_stock: Joi.number().min(0).optional().messages({
        'number.base': 'Số lượng nhập kho ban đầu phải là số',
        'number.min': 'Số lượng nhập kho ban đầu không được âm'
    }),
    status: Joi.string().valid('inStock', 'outOfStock').default('inStock').messages({
        'any.only': 'Trạng thái phải là inStock hoặc outOfStock'
    }),
    weight: Joi.number()
        .min(0)
        .required()
        .messages({
            'number.base': 'Cân nặng phải là số',
            'number.min': 'Cân nặng không được âm',
            'number.empty': 'Cân nặng không được để trống'
        }),
    length: Joi.number()
        .min(0)
        .optional()
        .messages({
            'number.base': 'Chiều dài phải là số',
            'number.min': 'Chiều dài không được âm'
        }),
    width: Joi.number()
        .min(0)
        .optional()
        .messages({
            'number.base': 'Chiều rộng phải là số',
            'number.min': 'Chiều rộng không được âm'
        }),
    height: Joi.number()
        .min(0)
        .optional()
        .messages({
            'number.base': 'Chiều cao phải là số',
            'number.min': 'Chiều cao không được âm'
        })
});

const cartItemSchema = Joi.object({
    variant_id: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .required()
        .messages({
            'string.pattern.base': 'Định dạng ID biến thể không hợp lệ',
            'string.empty': 'ID biến thể không được để trống'
        }),
    size_id: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .required()
        .messages({
            'string.pattern.base': 'Định dạng ID size không hợp lệ',
            'string.empty': 'Vui lòng chọn size'
        }),
    quantity: Joi.number()
        .min(1)
        .default(1)
        .messages({
            'number.base': 'Số lượng phải là số',
            'number.min': 'Số lượng tối thiểu là 1'
        })
});

export const validateVariant = (req, res, next) => {
    try {
        // Chuẩn hóa image_url từ file upload
        if (req.files && Array.isArray(req.files) && req.files.length > 0) {
            req.body.image_url = req.files.map(file => `http://localhost:3000/uploads/${file.filename}`);
        }

        // Nếu image_url là chuỗi (từ client) → chuyển về mảng
        if (typeof req.body.image_url === 'string') {
            req.body.image_url = [req.body.image_url];
        }

        if (typeof req.body.existingImages === 'string') {
            req.body.existingImages = [req.body.existingImages];
        }

        // Validate với Joi
        const { error } = variantSchema.validate(req.body, { abortEarly: false });

        if (error) {
            // Nếu có file upload → xóa
            if (req.files && Array.isArray(req.files)) {
                req.files.forEach(file => {
                    const filePath = path.join(__dirname, '../../public/uploads', file.filename);
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                    }
                });
            }

            const errors = error.details.map(detail => ({
                field: detail.context.key,
                message: detail.message
            }));

            return res.status(400).json({ errors });
        }

        next();
    } catch (err) {
        // Nếu có lỗi hệ thống → xóa file
        if (req.files && Array.isArray(req.files)) {
            req.files.forEach(file => {
                const filePath = path.join(__dirname, '../../public/uploads', file.filename);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            });
        }

        console.error('Lỗi validate biến thể:', err);
        return res.status(500).json({
            message: 'Lỗi xác thực dữ liệu biến thể',
            error: err.message
        });
    }
};

export { cartItemSchema };
export default variantSchema;
