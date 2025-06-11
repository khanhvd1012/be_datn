import user_MD from "../models/auth_MD";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { tokenBlacklist } from "../middleware/auth_MID";

dotenv.config({ path: './.env' });


export const register = async (req, res) => {
    try {
        const { username, email, password, full_name, address, phone } = req.body;

        const existingUser = await user_MD.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "Email đã tồn tại" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await user_MD.create({
            user_id: Date.now().toString(),
            username,
            email,
            password: hashedPassword,
            full_name,
            address,
            phone,
        })

        return res.status(201).json({
            user: { ...user.toObject(), password: undefined },
            message: "Đăng ký thành công"
        });

    } catch (error) {
        return res.status(500).json({ message: "Đăng ký thất bại" });
    }
}

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await user_MD.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: "Email không tồn tại" });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Mật khẩu không chính xác" });
        }

        const token = jwt.sign({ userId: user._id }, process.env.KEY_SECRET, { expiresIn: "1d" });

        return res.status(200).json({
            user: { ...user.toObject(), password: undefined },
            token,
            message: "Đăng nhập thành công"
        });
    } catch (error) {
        return res.status(500).json({ message: "Đăng nhập thất bại" });
    }
}

export const logout = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({ message: "Không tìm thấy token" });
        }

        // Add token to blacklist
        tokenBlacklist.push(token);

        // Clear cookies if they exist
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

export const updateProfile = async (req, res) => {
    try {
        // Loại bỏ password khỏi dữ liệu cập nhật
        const { password, ...updateData } = req.body;

        // Cập nhật thông tin và trả về user đã cập nhật
        const user = await user_MD.findByIdAndUpdate(
            req.user._id,
            updateData,
            { new: true }
        ).select("-password");

        return res.status(200).json(user);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
}