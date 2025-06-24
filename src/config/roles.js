export const ROLES = {
    ADMIN: 'admin',
    EMPLOYEE: 'employee',
    USER: 'user'
};

export const ROLE_DESCRIPTIONS = {
    [ROLES.ADMIN]: 'Quản trị viên - Có toàn quyền trong hệ thống',
    [ROLES.EMPLOYEE]: 'Nhân viên - Có quyền quản lý sản phẩm, đơn hàng và khách hàng',
    [ROLES.USER]: 'Người dùng - Có quyền mua hàng và quản lý tài khoản cá nhân'
};

export const ROLE_PERMISSIONS = {
    [ROLES.ADMIN]: [
        'manage_users',
        'manage_roles',
        'manage_products',
        'manage_orders',
        'manage_categories',
        'manage_brands',
        'manage_vouchers',
        'view_statistics',
        'manage_stock'
    ],
    [ROLES.EMPLOYEE]: [
        'manage_products',
        'manage_orders',
        'manage_categories',
        'manage_brands',
        'manage_stock',
        'view_statistics'
    ],
    [ROLES.USER]: [
        'view_products',
        'place_orders',
        'manage_own_profile',
        'write_reviews'
    ]
}; 