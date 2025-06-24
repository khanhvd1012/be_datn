import Joi from 'joi';

const productSchema = Joi.object({
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
            'string.pattern.base': 'Định dạng ID thương hiệu không hợp lệ',
            'string.empty': 'ID thương hiệu không được để trống'
        }),

    category: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .required()
        .messages({
            'string.pattern.base': 'Định dạng ID danh mục không hợp lệ',
            'string.empty': 'ID danh mục không được để trống'
        }),
    variants: Joi.array()
        .items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/))
        .messages({
            'string.pattern.base': 'Định dạng ID biến thể không hợp lệ'
        }),

    images: Joi.array()
        .items(Joi.string().uri().messages({
            'string.uri': 'URL hình ảnh không hợp lệ'
        }))
        .min(1)
        .required()
        .messages({
            'array.base': 'Danh sách hình ảnh phải là một mảng',
            'array.min': 'Phải có ít nhất 1 hình ảnh'
        })
});

import Product from "../models/product_MD.js";

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