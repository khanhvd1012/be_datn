import user_MD from "../models/auth_MD";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config({ path: './.env' });

/**
 * Mảng lưu trữ các token đã bị vô hiệu hóa (blacklist)
 * @description
 * - Sử dụng để lưu trữ các token đã logout hoặc bị vô hiệu hóa
 * - Kiểm tra token có trong blacklist trước khi xác thực
 * - Lưu ý: Trong môi trường production nên sử dụng Redis để lưu blacklist
 */
const tokenBlacklist = [];

/**
 * Middleware xác thực người dùng
 * @description
 * Quy trình xác thực:
 * 1. Kiểm tra token trong header Authorization
 * 2. Kiểm tra token có trong blacklist không
 * 3. Giải mã token và verify với secret key
 * 4. Tìm user trong database theo userId từ token
 * 5. Gán thông tin user vào request để sử dụng ở các middleware tiếp theo
 * 
 * Xử lý các trường hợp lỗi:
 * - Token không tồn tại
 * - Token trong blacklist
 * - Token không hợp lệ
 * - Token hết hạn
 * - User không tồn tại
 */
const authMiddleware = async (req, res, next) => {
    try {
        // Lấy token từ header Authorization (format: Bearer <token>)
        const token = req.headers['authorization']?.split(' ')[1];
        if (!token) {
            return res.status(404).json({ message: "Access token not found" });
        };

        // Kiểm tra token có trong blacklist không
        if (tokenBlacklist.includes(token)) {
            return res.status(401).json({ message: "Token đã bị vô hiệu hóa" });
        }

        // Giải mã và verify token
        const decoded = jwt.verify(token, process.env.KEY_SECRET)

        // Tìm user trong database, loại bỏ trường password
        const user = await user_MD.findById(decoded.userId).select("-password");
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Gán thông tin user vào request
        req.user = user;
        next();
    } catch (error) {
        // Xử lý các lỗi liên quan đến token
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: "Token không hợp lệ" });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: "Token đã hết hạn" });
        }
        return res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * Middleware xác thực không bắt buộc (dùng cho trang công khai, ví dụ: liên hệ)
 * - Nếu có token hợp lệ → gán req.user
 * - Nếu không có token hoặc token sai → vẫn tiếp tục mà không gán req.user
 */
authMiddleware.optional = async (req, res, next) => {
    try {
        const token = req.headers['authorization']?.split(' ')[1];
        if (!token) return next(); // Không có token thì bỏ qua

        // Kiểm tra blacklist
        if (tokenBlacklist.includes(token)) return next();

        // Giải mã token
        const decoded = jwt.verify(token, process.env.KEY_SECRET);

        // Tìm user
        const user = await user_MD.findById(decoded.userId).select("-password");
        if (user) req.user = user;
    } catch (error) {
        // Nếu token không hợp lệ hoặc lỗi → bỏ qua, không gán req.user
    }

    next();
};

// Export tokenBlacklist để sử dụng ở các file khác
export { tokenBlacklist };
export default authMiddleware;