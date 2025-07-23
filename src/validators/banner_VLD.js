import Joi from "joi";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import banner_MD from "../models/banner_MD.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const bannerSchema = Joi.object({
    title: Joi.string()
        .min(5)
        .max(100)
        .trim()
        .required()
        .messages({
            "string.empty": "Tiêu đề không được để trống",
            "string.min": "Tiêu đề phải có ít nhất 5 ký tự",
            "string.max": "Tiêu đề không được vượt quá 100 ký tự",
            "any.required": "Tiêu đề là bắt buộc"
        }),
    image: Joi.string().optional(),
    
    status: Joi.boolean().messages({
        "boolean.base": "Trạng thái phải là true hoặc false"
    }),
});

export const validateBanner = async (req, res, next) => {
    try {
        // Gán đường dẫn ảnh nếu có file upload
        if (req.file) {
            req.body.image = `http://localhost:3000/uploads/${req.file.filename}`;
        }

        // Validate schema
        const { error } = bannerSchema.validate(req.body, { abortEarly: false });

        if (error) {
            if (req.file) {
                const filePath = path.join(__dirname, "../../public/uploads", req.file.filename);
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            }

            const errors = error.details.map(detail => ({
                field: detail.context.key,
                message: detail.message
            }));

            return res.status(400).json({ errors });
        }

        // Kiểm tra trùng title nếu tạo mới hoặc chỉnh sửa khác ID
        const existingBanner = await banner_MD.findOne({
            title: { $regex: new RegExp(`^${req.body.title}$`, "i") }
        });

        if (!req.params.id && existingBanner) {
            if (req.file) {
                const filePath = path.join(__dirname, "../../public/uploads", req.file.filename);
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            }

            return res.status(400).json({
                errors: [{ field: "title", message: "Tiêu đề banner đã tồn tại" }]
            });
        }

        if (req.params.id && existingBanner && existingBanner._id.toString() !== req.params.id) {
            if (req.file) {
                const filePath = path.join(__dirname, "../../public/uploads", req.file.filename);
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            }

            return res.status(400).json({
                errors: [{ field: "title", message: "Tiêu đề banner đã tồn tại" }]
            });
        }

        next();
    } catch (err) {
        console.error("Lỗi validate banner:", err);

        if (req.file) {
            const filePath = path.join(__dirname, "../../public/uploads", req.file.filename);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }

        return res.status(500).json({
            message: "Lỗi xác thực dữ liệu banner",
            error: err.message
        });
    }
};

export default bannerSchema;
