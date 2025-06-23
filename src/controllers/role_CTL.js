import user_MD from "../models/auth_MD";
import { ROLES, ROLE_DESCRIPTIONS, ROLE_PERMISSIONS } from "../config/roles";

// lấy danh sách vai trò và quyền
export const getRoles = async (req, res) => {
    try {
        // lấy danh sách vai trò và quyền
        const roles = Object.keys(ROLES).map(key => ({
            name: ROLES[key],
            description: ROLE_DESCRIPTIONS[ROLES[key]],
            permissions: ROLE_PERMISSIONS[ROLES[key]]
        }));

        // trả về danh sách vai trò và quyền
        return res.status(200).json({
            success: true,
            data: roles
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Lỗi khi lấy danh sách vai trò",
            error: error.message
        });
    }
};

// cập nhật vai trò cho người dùng (chỉ Admin mới có quyền)
export const updateUserRole = async (req, res) => {
    try {
        const { userId, newRole } = req.body;

        // kiểm tra role hợp lệ
        if (!Object.values(ROLES).includes(newRole)) {
            return res.status(400).json({
                success: false,
                message: "Vai trò không hợp lệ",
                validRoles: Object.values(ROLES)
            });
        }

        // kiểm tra user tồn tại
        const user = await user_MD.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy người dùng"
            });
        }

        // không cho phép thay đổi role của chính mình
        if (user._id.toString() === req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: "Không thể thay đổi vai trò của chính mình"
            });
        }

        // cập nhật role
        user.role = newRole;
        await user.save();

        // trả về danh sách vai trò và quyền
        return res.status(200).json({
            success: true,
            message: "Cập nhật vai trò thành công",
            data: {
                userId: user._id,
                email: user.email,
                newRole: user.role
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Lỗi khi cập nhật vai trò",
            error: error.message
        });
    }
};

// lấy danh sách người dùng theo vai trò
export const getUsersByRole = async (req, res) => {
    try {
        const { role } = req.params;

        // kiểm tra role hợp lệ
        if (!Object.values(ROLES).includes(role)) {
            return res.status(400).json({
                success: false,
                message: "Vai trò không hợp lệ",
                validRoles: Object.values(ROLES)
            });
        }

        // lấy danh sách người dùng theo vai trò
        const users = await user_MD.find({ role })
            .select('-password')
            .sort({ createdAt: -1 });
        
        // trả về danh sách người dùng
        return res.status(200).json({
            success: true,
            count: users.length,
            data: users
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Lỗi khi lấy danh sách người dùng",
            error: error.message
        });
    }
}; 