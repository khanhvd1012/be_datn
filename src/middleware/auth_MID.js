import user_MD from "../models/auth_MD";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config({ path: './.env' });

const authMiddleware = async (req, res, next) => {
    try {
        const token = req.headers['authorization']?.split(' ')[1];
        // lấy token từ header tách chuỗi theo dấu cách và lấy phần tử thứ 2 trong mảng 
        if (!token) {
            return res.status(404).json({ message: "Access token not found" });
        };
        // nếu không có token thì trả về lỗi 404

        const decoded = jwt.verify(token, process.env.KEY_SECRET)
        // giải mã token bằng jwt.verify và truyền vào secret key là "nghiant"
        const user = await user_MD.findById(decoded.id).select("-password");
        // tìm kiếm người dùng trong cơ sở dữ liệu bằng id đã giải mã từ token và loại bỏ trường password khỏi kết quả trả về
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        req.user = user;
        // gán người dùng vào req.user để sử dụng trong các middleware và route tiếp theo`
        next();
        // gọi hàm next để tiếp tục xử lý request
    } catch (error) {
        return res.status(500).json({ message: "Internal server error" });
    }
};

export default authMiddleware;