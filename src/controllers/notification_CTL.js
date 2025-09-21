import Notification from "../models/notification_MD";

// Lấy tất cả thông báo của user dựa trên role
export const getAllNotifications = async (req, res) => {
    try {
        let query = { user_id: req.user._id };

        // Lọc thông báo dựa trên role
        if (req.user.role === 'admin' || req.user.role === 'employee') {
            // Admin và Employee chỉ nhận thông báo tồn kho và đơn hàng mới
            query.type = { $in: ['low_stock', 'new_order', 'voucher', 'back_in_stock', 'order_status', 'product_new_user', 'product_new_admin', 'voucher_new_user', 'voucher_new_admin', 'out_of_stock', 'contact_new_admin','order_returned'], };
        } else {
            // User thường nhận thêm thông báo trạng thái đơn hàng
            query.type = { $in: ['voucher', 'back_in_stock', 'order_status', 'product_new_user', 'voucher_new_user', 'out_of_stock','order_returned'] };
        }

        const notifications = await Notification.find(query)
            .sort({ createdAt: -1 })
            .populate('data.product_id', 'name images')
            .populate('data.variant_id', 'color size price');

        return res.status(200).json({
            message: "Lấy danh sách thông báo thành công",
            data: notifications
        });
    } catch (error) {
        console.error('Lỗi khi lấy danh sách thông báo:', error);
        return res.status(500).json({
            message: "Đã xảy ra lỗi khi lấy danh sách thông báo",
            error: error.message
        });
    }
};

// Lấy thông báo tồn kho thấp (chỉ cho admin và employee)
export const getLowStockNotifications = async (req, res) => {
    try {
        // Kiểm tra quyền truy cập
        if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'employee')) {
            return res.status(403).json({ message: 'Không có quyền truy cập' });
        }

        const notifications = await Notification.find({
            user_id: req.user._id,
            type: 'low_stock',
            read: false
        })
            .sort({ createdAt: -1 })
            .populate('data.product_id', 'name images')
            .populate('data.variant_id', 'color size price');

        return res.status(200).json({
            message: "Lấy danh sách thông báo tồn kho thấp thành công",
            data: notifications
        });
    } catch (error) {
        console.error('Lỗi khi lấy danh sách thông báo tồn kho thấp:', error);
        return res.status(500).json({
            message: "Đã xảy ra lỗi khi lấy danh sách thông báo tồn kho thấp",
            error: error.message
        });
    }
};

// Đánh dấu thông báo đã đọc
export const markAsRead = async (req, res) => {
    try {
        const notification = await Notification.findOne({
            _id: req.params.id,
            user_id: req.user._id
        });

        if (!notification) {
            return res.status(404).json({
                message: "Không tìm thấy thông báo"
            });
        }

        notification.read = true;
        await notification.save();

        return res.status(200).json({
            message: "Đánh dấu thông báo đã đọc thành công",
            data: notification
        });
    } catch (error) {
        console.error('Lỗi khi đánh dấu thông báo đã đọc:', error);
        return res.status(500).json({
            message: "Đã xảy ra lỗi khi đánh dấu thông báo đã đọc",
            error: error.message
        });
    }
};

// Đánh dấu tất cả thông báo đã đọc
export const markAllAsRead = async (req, res) => {
    try {
        let query = { user_id: req.user._id, read: false };

        // Lọc thông báo dựa trên role khi đánh dấu đã đọc
        if (req.user.role === 'admin' || req.user.role === 'employee') {
            query.type = { $in: ['low_stock', 'new_order', 'voucher', 'back_in_stock', 'order_status', 'product_new_user', 'contact_new_admin'] };
        } else {
            query.type = { $in: ['voucher', 'back_in_stock', 'order_status', 'product_new_user'] };
        }

        await Notification.updateMany(query, { read: true });

        return res.status(200).json({
            message: "Đánh dấu tất cả thông báo đã đọc thành công"
        });
    } catch (error) {
        console.error('Lỗi khi đánh dấu tất cả thông báo đã đọc:', error);
        return res.status(500).json({
            message: "Đã xảy ra lỗi khi đánh dấu tất cả thông báo đã đọc",
            error: error.message
        });
    }
};

// Xóa thông báo
export const deleteNotification = async (req, res) => {
    try {
        const notification = await Notification.findOneAndDelete({
            _id: req.params.id,
            user_id: req.user._id
        });

        if (!notification) {
            return res.status(404).json({
                message: "Không tìm thấy thông báo"
            });
        }

        return res.status(200).json({
            message: "Xóa thông báo thành công",
            data: notification
        });
    } catch (error) {
        console.error('Lỗi khi xóa thông báo:', error);
        return res.status(500).json({
            message: "Đã xảy ra lỗi khi xóa thông báo",
            error: error.message
        });
    }
};

// Xóa tất cả thông báo đã đọc
export const deleteAllRead = async (req, res) => {
    try {
        let query = { user_id: req.user._id, read: true };

        // Lọc thông báo dựa trên role khi xóa
        if (req.user.role === 'admin' || req.user.role === 'employee') {
            query.type = { $in: ['low_stock', 'new_order', 'voucher', 'back_in_stock', 'order_status', 'product_new_user', 'contact_new_admin'] };
        } else {
            query.type = { $in: ['voucher', 'back_in_stock', 'order_status', 'product_new_user'] };
        }

        const result = await Notification.deleteMany(query);

        return res.status(200).json({
            message: "Xóa tất cả thông báo đã đọc thành công",
            data: {
                deleted_count: result.deletedCount
            }
        });
    } catch (error) {
        console.error('Lỗi khi xóa tất cả thông báo đã đọc:', error);
        return res.status(500).json({
            message: "Đã xảy ra lỗi khi xóa tất cả thông báo đã đọc",
            error: error.message
        });
    }
}; 