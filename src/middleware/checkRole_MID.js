// kiểm tra vai trò của user
const checkRole = (...roles) => {
    // kiểm tra user có đăng nhập không
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: "Vui lòng đăng nhập để tiếp tục" });
        }

        // kiểm tra user có vai trò hợp lệ không
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ 
                message: "Bạn không có quyền thực hiện hành động này",
                required_roles: roles,
                your_role: req.user.role
            });
        }

        next();
    };
};

export default checkRole; 