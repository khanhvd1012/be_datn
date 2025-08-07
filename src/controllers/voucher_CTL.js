import Voucher_MD from "../models/voucher_MD";
import Notification from "../models/notification_MD";
import User from "../models/auth_MD";
import { setVoucherTimeout, clearVoucherTimeout } from "../middleware/timeoutRegistry_MID";

/**
 * Gửi thông báo voucher mới cho tất cả admin
 * @param {Object} voucher - Thông tin voucher
 */
const sendVoucherNotificationToAdmins = async (voucher) => {
    try {
        // Lấy danh sách tất cả admin
        const admins = await User.find({ 
            $or: [
                { role: 'admin' },
                { is_admin: true }
            ]
        });
        
        if (admins.length === 0) {
            console.log('Không tìm thấy admin nào để gửi thông báo voucher');
            return;
        }

        // Tạo thông báo cho từng admin
        const notifications = admins.map(admin => ({
            user_id: admin._id.toString(),
            title: 'Voucher mới đã được tạo! 🎟️',
            message: `Voucher "${voucher.code}" với giá trị ${voucher.type === 'percentage' ? voucher.value + '%' : voucher.value + 'đ'} đã được tạo thành công. Thông báo sẽ được gửi cho khách hàng sau 1 giờ.`,
            type: 'voucher_new_admin',
            data: {
                voucher_id: voucher._id,
                voucher_code: voucher.code,
                discount_value: voucher.value,
                discount_type: voucher.type,
                expires_at: voucher.expires_at,
                created_at: new Date(),
                action: 'created'
            },
            is_read: false,
            created_at: new Date()
        }));

        // Bulk insert để tối ưu performance
        await Notification.insertMany(notifications);
        console.log(`Đã gửi thông báo voucher mới "${voucher.code}" cho ${admins.length} admin(s)`);
        
    } catch (error) {
        console.error('Lỗi khi gửi thông báo voucher cho admin:', error);
        // Không throw error để không ảnh hưởng đến việc tạo voucher
    }
};

/**
 * Gửi thông báo voucher mới cho tất cả khách hàng (user)
 * @param {Object} voucher - Thông tin voucher
 */
const sendVoucherNotificationToAllUsers = async (voucher) => {
    try {
        const users = await User.find({ 
            $or: [
                { role: 'user' },
                { role: { $exists: false } }
            ]
        });

        if (users.length === 0) {
            console.log('Không tìm thấy user nào để gửi thông báo voucher');
            return;
        }

        const notifications = users.map(user => ({
            user_id: user._id.toString(),
            title: 'Voucher mới đã có sẵn! 🎉',
            message: `Sử dụng mã ${voucher.code} để nhận ưu đãi ${
                voucher.type === 'percentage' ? voucher.value + '%' : voucher.value + 'đ'
            } cho đơn hàng của bạn! Có hiệu lực từ ${new Date(voucher.startDate).toLocaleDateString('vi-VN')} đến ${new Date(voucher.endDate).toLocaleDateString('vi-VN')}.`,
            type: 'voucher_new_user',
            data: {
                voucher_id: voucher._id,
                voucher_code: voucher.code,
                discount_value: voucher.value,
                discount_type: voucher.type,
                start_date: voucher.startDate,
                end_date: voucher.endDate,
                min_order_value: voucher.minOrderValue,
                created_at: new Date()
            },
            is_read: false,
            created_at: new Date()
        }));

        await Notification.insertMany(notifications);
        console.log(`Đã gửi thông báo voucher "${voucher.code}" cho ${users.length} khách hàng`);
        
    } catch (error) {
        console.error('Lỗi khi gửi thông báo voucher cho user:', error);
        throw error;
    }
};


/**
 * Tạo voucher mới, gửi thông báo ngay cho admin và lên lịch gửi thông báo cho user sau 1 giờ
 * @param {Object} req - Request object chứa thông tin voucher cần tạo
 * @param {Object} res - Response object
 * @returns {Object} Voucher đã tạo thành công hoặc thông báo lỗi
 */
export const createVoucher = async (req, res) => {
    try {
        // Kiểm tra xem voucher đã tồn tại chưa
        const existingVoucher = await Voucher_MD.findOne({ code: req.body.code });
        if (existingVoucher) {
            return res.status(400).json({
                message: "Voucher đã tồn tại",
            });
        }

        // Tạo voucher mới
        const voucher = await Voucher_MD.create(req.body);

        // Gửi thông báo ngay lập tức cho admin
        setImmediate(async () => {
            await sendVoucherNotificationToAdmins(voucher);
        });

        // Lên lịch gửi thông báo cho user sau 1 giờ (3600000 milliseconds)
        const timeoutId = setTimeout(async () => {
            try {
                await sendVoucherNotificationToAllUsers(voucher);
                console.log(`[SCHEDULED] Đã gửi thông báo voucher ${voucher.code} cho tất cả khách hàng sau 1 giờ`);
            } catch (error) {
                console.error('[SCHEDULED] Lỗi khi gửi thông báo voucher cho user:', error);
            }
        }, 36000); // ✅ đúng 1 giờ
        
        setVoucherTimeout(voucher._id, timeoutId);

        return res.status(201).json({
            message: "Tạo voucher thành công. Admin đã được thông báo ngay lập tức. Thông báo sẽ được gửi cho khách hàng sau 1 giờ.",
            data: voucher
        });
    } catch (error) {
        return res.status(500).json({
            message: "Lỗi khi tạo voucher",
            error: error.message
        });
    }
};

/**
 * Lấy danh sách tất cả voucher
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Array} Danh sách voucher hoặc thông báo lỗi
 */
export const getAllVouchers = async (req, res) => {
    try {
        const vouchers = await Voucher_MD.find().sort({ createdAt: -1 });
        return res.status(200).json(vouchers);
    } catch (error) {
        return res.status(500).json({
            message: "Lỗi khi lấy danh sách voucher",
            error: error.message
        });
    }
};

/**
 * Lấy thông tin voucher theo ID
 * @param {Object} req - Request object chứa ID trong params
 * @param {Object} res - Response object
 * @returns {Object} Thông tin voucher hoặc thông báo lỗi
 */
export const getOneVoucher = async (req, res) => {
    try {
        const voucher = await Voucher_MD.findById(req.params.id);

        if (!voucher) {
            return res.status(404).json({ message: "Voucher không tồn tại" });
        }
        return res.status(200).json(voucher);
    } catch (error) {
        return res.status(500).json({ 
            message: "Lỗi khi lấy voucher", 
            error: error.message 
        });
    }
};

/**
 * Cập nhật thông tin voucher
 * @param {Object} req - Request object chứa id và thông tin cần cập nhật
 * @param {Object} res - Response object
 * @returns {Object} Voucher đã cập nhật hoặc thông báo lỗi
 */
export const updateVoucher = async (req, res) => {
    try {
        // Kiểm tra usedCount không vượt quá quantity
        if (req.body.usedCount && req.body.quantity && req.body.usedCount > req.body.quantity) {
            return res.status(400).json({
                message: "Số lượng đã sử dụng không được vượt quá tổng số lượng"
            });
        }

        const voucher = await Voucher_MD.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );

        if (!voucher) {
            return res.status(404).json({ message: "Không tìm thấy voucher" });
        }

        return res.status(200).json({
            message: "Cập nhật voucher thành công",
            data: voucher
        });
    } catch (error) {
        return res.status(500).json({
            message: "Lỗi khi cập nhật voucher",
            error: error.message
        });
    }
};

/**
 * Xóa voucher
 * @param {Object} req - Request object chứa id voucher cần xóa
 * @param {Object} res - Response object
 * @returns {Object} Thông báo xóa thành công hoặc lỗi
 */
export const deleteVoucher = async (req, res) => {
    try {
        const voucher = await Voucher_MD.findByIdAndDelete(req.params.id);

        if (!voucher) {
            return res.status(404).json({ message: "Không tìm thấy voucher" });
        }

        // Xóa timeout cho voucher
        clearVoucherTimeout(voucher._id);

        return res.status(200).json({ message: "Xóa voucher thành công" });
    } catch (error) {
        return res.status(500).json({
            message: "Lỗi khi xóa voucher",
            error: error.message
        });
    }
};

// /**
//  * Gửi thông báo voucher ngay lập tức cho user (dành cho admin test)
//  * @param {Object} req - Request object chứa voucher_id
//  * @param {Object} res - Response object
//  */
// export const sendVoucherNotificationToUsersNow = async (req, res) => {
//     try {
//         const voucher = await Voucher_MD.findById(req.params.id);
        
//         if (!voucher) {
//             return res.status(404).json({ message: "Voucher không tồn tại" });
//         }

//         await sendVoucherNotificationToAllUsers(voucher);

//         return res.status(200).json({
//             message: "Đã gửi thông báo voucher cho tất cả khách hàng"
//         });
//     } catch (error) {
//         return res.status(500).json({
//             message: "Lỗi khi gửi thông báo",
//             error: error.message
//         });
//     }
// };

// /**
//  * Gửi thông báo voucher ngay lập tức cho admin (dành cho test)
//  * @param {Object} req - Request object chứa voucher_id
//  * @param {Object} res - Response object
//  */
// export const sendVoucherNotificationToAdminsNow = async (req, res) => {
//     try {
//         const voucher = await Voucher_MD.findById(req.params.id);
        
//         if (!voucher) {
//             return res.status(404).json({ message: "Voucher không tồn tại" });
//         }

//         await sendVoucherNotificationToAdmins(voucher);

//         return res.status(200).json({
//             message: "Đã gửi thông báo voucher cho tất cả admin"
//         });
//     } catch (error) {
//         return res.status(500).json({
//             message: "Lỗi khi gửi thông báo",
//             error: error.message
//         });
//     }
// };