import Joi from "joi";

export const contactSchema = Joi.object({
    username: Joi.string()
        .min(2)
        .max(50)
        .required()
        .messages({
            "string.empty": "Tên không được để trống",
            "string.min": "Tên phải có ít nhất 2 ký tự",
            "string.max": "Tên không được vượt quá 50 ký tự",
            "any.required": "Tên là bắt buộc",
        }),

    email: Joi.string()
        .email({ tlds: { allow: false } })
        .required()
        .messages({
            "string.email": "Email không hợp lệ",
            "string.empty": "Email không được để trống",
            "any.required": "Email là bắt buộc",
        }),

    phone: Joi.string()
        .pattern(/^(0|\+84)[0-9]{9,10}$/)
        .required()
        .messages({
            "string.pattern.base": "Số điện thoại không hợp lệ",
            "string.empty": "Số điện thoại không được để trống",
            "any.required": "Số điện thoại là bắt buộc",
        }),

    address: Joi.string()
        .min(5)
        .required()
        .messages({
            "string.empty": "Địa chỉ không được để trống",
            "string.min": "Địa chỉ phải có ít nhất 5 ký tự",
            "any.required": "Địa chỉ là bắt buộc",
        }),

    message: Joi.string()
        .min(10)
        .required()
        .messages({
            "string.empty": "Nội dung không được để trống",
            "string.min": "Nội dung phải có ít nhất 10 ký tự",
            "any.required": "Nội dung là bắt buộc",
        }),
});

export const validateContact = (req, res, next) => {
    try {
        // Nếu đã đăng nhập → dùng thông tin từ req.user
        if (req.user) {
            req.body.username = req.user.username || "";
            req.body.email = req.user.email || "";

            const defaultAddress = req.user.shipping_addresses?.find(addr => addr.is_default);

            if (defaultAddress) {
                req.body.phone = defaultAddress.phone || "";
                req.body.address = defaultAddress.address || "";
            }

            // Nếu vẫn thiếu, dùng fallback
            if (!req.body.phone || !req.body.address) {
                return res.status(400).json({
                    errors: [
                        ...(req.body.phone ? [] : [{ field: "phone", message: "Không tìm thấy số điện thoại từ địa chỉ mặc định" }]),
                        ...(req.body.address ? [] : [{ field: "address", message: "Không tìm thấy địa chỉ mặc định" }]),
                    ],
                });
            }
        }
        console.log("user", req.user);


        const { error } = contactSchema.validate(req.body, { abortEarly: false });

        if (error) {
            const errors = error.details.map((detail) => ({
                field: detail.context.key,
                message: detail.message,
            }));
            return res.status(400).json({ errors });
        }

        next();
    } catch (err) {
        console.error("Lỗi validate contact:", err);
        return res.status(500).json({
            message: "Lỗi xác thực dữ liệu liên hệ",
            error: err.message,
        });
    }
};
