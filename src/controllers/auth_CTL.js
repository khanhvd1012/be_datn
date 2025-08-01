import user_MD from "../models/auth_MD";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { tokenBlacklist } from "../middleware/auth_MID";
import path from "path";
import fs from "fs";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: './.env' });


export const register = async (req, res) => {
    try {
        const { email, password } = req.body;

        // kiểm tra email và password có tồn tại không
        if (!email || !password) {
            return res.status(400).json({
                message: "Email và mật khẩu là bắt buộc"
            });
        }

        // kiểm tra email đã tồn tại không
        const existingUser = await user_MD.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "Email đã tồn tại" });
        }

        // mã hóa password
        const hashedPassword = await bcrypt.hash(password, 10);

        // tạo user
        const user = await user_MD.create({
            user_id: Date.now().toString(),
            username: email.split('@')[0], // tạo username từ email
            email,
            password: hashedPassword,
            role: "user" // set default role
        });

        // trả về user đã tạo
        return res.status(201).json({
            success: true,
            message: "Đăng ký thành công",
            user: { ...user.toObject(), password: undefined }
        });

    } catch (error) {
        // xử lý lỗi
        console.error('Register error:', error);
        return res.status(500).json({
            message: "Đăng ký thất bại",
            error: error.message
        });
    }
}

// đăng nhập
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // kiểm tra email có tồn tại không
        const user = await user_MD.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: "Email không tồn tại" });
        }

        // kiểm tra password có chính xác không
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Mật khẩu không chính xác" });
        }

        // tạo token
        const token = jwt.sign({ userId: user._id }, process.env.KEY_SECRET, { expiresIn: "1w" });

        // trả về user và token
        return res.status(200).json({
            user: { ...user.toObject(), password: undefined },
            token,
            message: "Đăng nhập thành công"
        });
    } catch (error) {
        // xử lý lỗi
        return res.status(500).json({ message: "Đăng nhập thất bại" });
    }
}

// đăng xuất
export const logout = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({ message: "Không tìm thấy token" });
        }

        // thêm token vào blacklist
        tokenBlacklist.push(token);

        // xóa cookies
        res.clearCookie('token');
        res.clearCookie('refreshToken');

        return res.status(200).json({
            message: "Đăng xuất thành công",
            success: true
        });
    } catch (error) {
        console.error('Logout error:', error);
        return res.status(500).json({
            message: "Đăng xuất thất bại",
            error: error.message
        });
    }
}

// lấy thông tin người dùng
export const getProfile = async (req, res) => {
    try {
        const user = await user_MD.findById(req.user._id).select("-password");
        if (!user) {
            return res.status(401).json({ message: "Người dùng không tồn tại" });
        }

        return res.status(200).json({
            user: { ...user.toObject(), password: undefined },
            message: "Lấy thông tin người dùng thành công"
        });
    } catch (error) {
        return res.status(500).json({ message: "Lấy thông tin người dùng thất bại" });
    }
}

export const getAllUsers = async (req, res) => {
    try {
        const users = await user_MD.find().select("-password").sort({ createdAt: -1 });

        if (!users || users.length === 0) {
            return res.status(404).json({ message: "Không tìm thấy người dùng nào" });
        }

        return res.status(200).json({
            data: users,
            message: "Lấy danh sách người dùng thành công"
        });
    } catch (error) {
        return res.status(500).json({ message: "Lấy danh sách người dùng thất bại", error });
    }
};

// cập nhật thông tin người dùng
export const updateProfile = async (req, res) => {
    try {
        const { password, ...updateData } = req.body;

        const user = await user_MD.findById(req.user._id);
        if (!user) {
            if (req.file) {
                const uploadedPath = path.join(__dirname, "../../public/uploads", req.file.filename);
                if (fs.existsSync(uploadedPath)) fs.unlinkSync(uploadedPath);
            }
            return res.status(404).json({ message: 'Người dùng không tồn tại' });
        }

        // Nếu có ảnh mới, xử lý xoá ảnh cũ và cập nhật mới
        if (req.file) {
            if (user.image) {
                const oldFilename = user.image.split('/uploads/')[1];
                const oldPath = path.join(__dirname, "../../public/uploads", oldFilename);
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            }

            const baseURL = process.env.BASE_URL || "http://localhost:3000";
            updateData.image = `${baseURL}/uploads/${req.file.filename}`;
        }

        const updatedUser = await user_MD.findByIdAndUpdate(
            req.user._id,
            updateData,
            { new: true }
        ).select("-password");

        res.status(200).json({
            message: "Cập nhật người dùng thành công",
            user: updatedUser
        });
    } catch (error) {
        if (req.file) {
            const filePath = path.join(__dirname, "../../public/uploads", req.file.filename);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }

        console.error("Lỗi khi cập nhật người dùng:", error);
        return res.status(500).json({ message: "Cập nhật thất bại", error: error.message });
    }
};


// Lấy danh sách địa chỉ giao hàng
export const getShippingAddresses = async (req, res) => {
    try {
        const user = await user_MD.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: "Không tìm thấy thông tin người dùng" });
        }

        return res.status(200).json({
            message: "Lấy danh sách địa chỉ thành công",
            addresses: user.shipping_addresses || []
        });
    } catch (error) {
        console.error("Lỗi khi lấy danh sách địa chỉ:", error);
        return res.status(500).json({
            message: "Đã xảy ra lỗi khi lấy danh sách địa chỉ",
            error: error.message
        });
    }
}

// Đặt địa chỉ mặc định
export const setDefaultAddress = async (req, res) => {
    try {
        const { address_id } = req.params;
        const user = await user_MD.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ message: "Không tìm thấy thông tin người dùng" });
        }

        // Tìm địa chỉ cần đặt làm mặc định
        const address = user.shipping_addresses.id(address_id);
        if (!address) {
            return res.status(404).json({ message: "Không tìm thấy địa chỉ" });
        }

        // Bỏ mặc định tất cả các địa chỉ khác
        user.shipping_addresses.forEach(addr => {
            addr.is_default = false;
        });

        // Đặt địa chỉ được chọn làm mặc định
        address.is_default = true;

        await user.save();

        return res.status(200).json({
            message: "Đặt địa chỉ mặc định thành công",
            addresses: user.shipping_addresses
        });
    } catch (error) {
        console.error("Lỗi khi đặt địa chỉ mặc định:", error);
        return res.status(500).json({
            message: "Đã xảy ra lỗi khi đặt địa chỉ mặc định",
            error: error.message
        });
    }
}

// Xóa địa chỉ giao hàng
export const deleteAddress = async (req, res) => {
    try {
        const { address_id } = req.params;
        const user = await user_MD.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ message: "Không tìm thấy thông tin người dùng" });
        }

        // Tìm địa chỉ cần xóa
        const address = user.shipping_addresses.id(address_id);
        if (!address) {
            return res.status(404).json({ message: "Không tìm thấy địa chỉ" });
        }

        // Không cho phép xóa địa chỉ mặc định nếu có nhiều hơn 1 địa chỉ
        if (address.is_default && user.shipping_addresses.length > 1) {
            return res.status(400).json({ message: "Vui lòng đặt địa chỉ mặc định khác trước khi xóa" });
        }

        // Xóa địa chỉ
        address.remove();
        await user.save();

        return res.status(200).json({
            message: "Xóa địa chỉ thành công",
            addresses: user.shipping_addresses
        });
    } catch (error) {
        console.error("Lỗi khi xóa địa chỉ:", error);
        return res.status(500).json({
            message: "Đã xảy ra lỗi khi xóa địa chỉ",
            error: error.message
        });
    }
}