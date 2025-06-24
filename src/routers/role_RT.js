import { Router } from "express";
import { getRoles, updateUserRole, getUsersByRole } from "../controllers/role_CTL";
import authMiddleware from "../middleware/auth_MID";
import checkRole from "../middleware/checkRole_MID";
import { ROLES } from "../config/roles";

const roleRouter = Router();
// Lấy danh sách vai trò và quyền (chỉ Admin mới có quyền)
roleRouter.get("/", authMiddleware, checkRole(ROLES.ADMIN), getRoles);

// Cập nhật vai trò cho người dùng (chỉ Admin mới có quyền)
roleRouter.put("/update-user-role", authMiddleware, checkRole(ROLES.ADMIN), updateUserRole);

// Lấy danh sách người dùng theo vai trò (Admin và Employee có quyền)
roleRouter.get("/users/:role", authMiddleware, checkRole(ROLES.ADMIN, ROLES.EMPLOYEE), getUsersByRole);

export default roleRouter; 