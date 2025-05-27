import Joi from 'joi';
import brand_MD from '../models/brand_MD';

const brandSchema = Joi.object({
    name: Joi.string().required().messages({
        'string.empty': 'Tên thương hiệu không được để trống',
        'any.required': 'Tên thương hiệu là bắt buộc'
    }),
    description: Joi.string().required().messages({
        'string.empty': 'Mô tả thương hiệu không được để trống',
        'any.required': 'Mô tả thương hiệu là bắt buộc'
    }),
    logo_image: Joi.string().uri().required().messages({
        'string.empty': 'Logo thương hiệu không được để trống',
        'string.uri': 'Logo thương hiệu phải là một URL hợp lệ',
        'any.required': 'Logo thương hiệu là bắt buộc'
    }),
});

export const validateCheckDuplicateBrand = async (name) => {
    try {
        // Kiểm tra cauc dữ liệu đầu vào
        const { error } = brandSchema.validate(req.body, { abortEarly: false });
        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.context.key,
                message: detail.message
            }));
            return res.status(400).json({ errors });
        }
        // Kiểm tra xem thương hiệu đã tồn tại chưa
        const existingBrand = await brand_MD.findOne({
            name: { $regex: new RegExp(`^${req.body.name}$`, 'i') } // Kiểm tra không phân biệt chữ hoa chữ thường
        });
        // Nếu không có ID trong yêu cầu và thương hiệu đã tồn tại, trả về lỗi
        if (!req.params.id && existingBrand) {
            return res.status(400).json({
                errors: [{
                    field: 'name',
                    message: 'Tên thương hiệu đã tồn tại'
                }]
            });
        }


        // Nếu đang cập nhật (có id) và tìm thấy brand trùng tên nhưng không phải brand hiện tại
        if (req.params.id && existingBrand && existingBrand._id.toString() !== req.params.id) {
            return res.status(400).json({
                errors: [{
                    field: 'name',
                    message: 'Tên thương hiệu đã tồn tại'
                }]
            });
        }

        next(); // Tiếp tục nếu không có lỗi
    } catch (error) {
        console.error('Lỗi khi kiểm tra trùng lặp thương hiệu:', error);
        return res.status(500).json({
            message: 'Error validating brand data',
            error: error.message
        });
    }
}

export default brandSchema;