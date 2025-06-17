import Joi from 'joi';
import Product from "../models/product_MD.js";

export const productSchema = Joi.object({
    name: Joi.string()
        .min(2)
        .max(100)
        .required()
        .messages({
            'string.empty': 'Tên sản phẩm không được để trống',
            'string.min': 'Tên sản phẩm phải có ít nhất 2 ký tự',
            'string.max': 'Tên sản phẩm không được vượt quá 100 ký tự'
        }),

    description: Joi.string()
        .max(1000)
        .messages({
            'string.max': 'Mô tả không được vượt quá 1000 ký tự'
        }),

    brand: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .required()
        .messages({
            'string.pattern.base': 'ID thương hiệu không hợp lệ',
            'string.empty': 'ID thương hiệu không được để trống'
        }),

    category: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .required()
        .messages({
            'string.pattern.base': 'ID danh mục không hợp lệ',
            'string.empty': 'ID danh mục không được để trống'
        }),

    gender: Joi.string()
        .valid('male', 'female', 'unisex')
        .required()
        .messages({
            'any.only': 'Giới tính phải là male, female hoặc unisex',
            'any.required': 'Giới tính không được để trống'
        }),

    sizes: Joi.array()
        .items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/))
        .min(1)
        .messages({
            'array.min': 'Phải chọn ít nhất một size',
            'string.pattern.base': 'ID size không hợp lệ'
        }),

    colors: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .required()
        .messages({
            'string.pattern.base': 'ID màu không hợp lệ',
            'string.empty': 'ID màu không được để trống',
            'any.required': 'Sản phẩm phải có một màu'
        }),

    images: Joi.array()
        .items(Joi.string().uri())
        .min(1)
        .messages({
            'array.min': 'Phải có ít nhất một hình ảnh',
            'string.uri': 'URL hình ảnh không hợp lệ'
        }),
    price: Joi.number()
        .min(0)
        .required()
        .messages({
            'number.base': 'Giá phải là một số',
            'number.min': 'Giá không được âm',
            'any.required': 'Giá không được để trống'
        }),
    variants: Joi.array()
        .items(Joi.object({
            sizes: Joi.array()
                .items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/))
                .min(1)
                .required()
                .messages({
                    'array.min': 'Biến thể phải có ít nhất một size',
                    'string.pattern.base': 'ID size không hợp lệ',
                    'any.required': 'Size là bắt buộc cho biến thể'
                }),
            quantity: Joi.number()
                .min(0)
                .required()
                .messages({
                    'number.base': 'Số lượng phải là một số',
                    'number.min': 'Số lượng không được âm',
                    'any.required': 'Số lượng là bắt buộc cho biến thể'
                }),
            price: Joi.number()
                .min(0)
                .required()
                .messages({
                    'number.base': 'Giá phải là một số',
                    'number.min': 'Giá không được âm',
                    'any.required': 'Giá là bắt buộc cho biến thể'
                }),
            sku: Joi.string()
                .required()
                .trim()
                .messages({
                    'string.empty': 'SKU không được để trống',
                    'any.required': 'SKU là bắt buộc cho biến thể'
                }),
            color_id: Joi.string()
                .pattern(/^[0-9a-fA-F]{24}$/)
                .required()
                .messages({
                    'string.pattern.base': 'ID màu không hợp lệ',
                    'string.empty': 'ID màu không được để trống',
                    'any.required': 'ID màu là bắt buộc cho biến thể'
                }),
            images: Joi.array()
                .items(Joi.string().uri())
                .min(1)
                .required()
                .messages({
                    'array.min': 'Phải có ít nhất một hình ảnh cho biến thể',
                    'array.base': 'Images phải là một mảng',
                    'string.uri': 'URL hình ảnh không hợp lệ',
                    'any.required': 'Images là bắt buộc cho biến thể'
                }),
            status: Joi.string()
                .valid('active', 'inactive')
                .default('active')
                .messages({
                    'any.only': 'Trạng thái phải là active hoặc inactive'
                })
        }))
        .optional()
});

export const validateProduct = async (req, res, next) => {
    try {
        // Validate schema first
        const { error } = productSchema.validate(req.body, { abortEarly: false });

        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.context.key,
                message: detail.message
            }));
            return res.status(400).json({ errors });
        }

        // Check for duplicate product name
        const existingProductByName = await Product.findOne({
            name: { $regex: new RegExp(`^${req.body.name}$`, 'i') } // Case insensitive search
        });

        // If creating new product (no id) and name exists
        if (!req.params.id && existingProductByName) {
            return res.status(400).json({
                errors: [{
                    field: 'name',
                    message: 'Tên sản phẩm đã tồn tại'
                }]
            });
        }

        // If updating product (has id) and name exists on a different product
        if (req.params.id && existingProductByName && existingProductByName._id.toString() !== req.params.id) {
            return res.status(400).json({
                errors: [{
                    field: 'name',
                    message: 'Tên sản phẩm đã tồn tại'
                }]
            });
        }

        next();
    } catch (error) {
        console.error('Product validation error:', error);
        return res.status(500).json({
            message: 'Error validating product data',
            error: error.message
        });
    }
};