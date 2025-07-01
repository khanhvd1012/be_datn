import Joi from 'joi';
import category_MD from '../models/category_MD';

// Không kiểm tra URI vì ảnh upload từ file
const categorySchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(50)
    .required()
    .messages({
      'string.empty': 'Tên danh mục không được để trống',
      'string.min': 'Tên danh mục phải có ít nhất 2 ký tự',
      'string.max': 'Tên danh mục không được vượt quá 50 ký tự',
      'any.required': 'Tên danh mục là bắt buộc',
    }),

  description: Joi.string()
    .required()
    .max(500)
    .messages({
      'string.empty': 'Mô tả danh mục không được để trống',
      'string.max': 'Mô tả không được vượt quá 500 ký tự',
      'any.required': 'Mô tả danh mục là bắt buộc',
    }),

  logo_image: Joi.string().optional(), 
});

export const validateCategory = async (req, res, next) => {
  try {
    // Nếu có file upload thì gán đường dẫn ảnh vào req.body.logo_image
    if (req.file) {
      req.body.logo_image = `http://localhost:3000/uploads/${req.file.filename}`;
    }

    const { error } = categorySchema.validate(req.body, { abortEarly: false });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.context.key,
        message: detail.message,
      }));
      return res.status(400).json({ errors });
    }

    const existingCategoryByName = await category_MD.findOne({
      name: { $regex: new RegExp(`^${req.body.name}$`, 'i') },
    });

    if (!req.params.id && existingCategoryByName) {
      return res.status(400).json({
        errors: [{ field: 'name', message: 'Tên danh mục đã tồn tại' }],
      });
    }

    if (
      req.params.id &&
      existingCategoryByName &&
      existingCategoryByName._id.toString() !== req.params.id
    ) {
      return res.status(400).json({
        errors: [{ field: 'name', message: 'Tên danh mục đã tồn tại' }],
      });
    }

    next();
  } catch (error) {
    console.error('Category validation error:', error);
    return res.status(500).json({
      message: 'Error validating category data',
      error: error.message,
    });
  }
};
