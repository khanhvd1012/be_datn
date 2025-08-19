import contact_MD from "../models/contact_MD.js";
import contact_MD from "../models/contact_MD.js";
import Notification from "../models/notification_MD.js";
import User from "../models/auth_MD.js";

export const sendNewContactNotificationToAdmins = async (contact) => {
    try {
        // Lấy danh sách tất cả admin & employee
        const admins = await User.find({ role: { $in: ["admin", "employee"] } });

        if (admins.length === 0) {
            console.log("Không tìm thấy admin hoặc nhân viên để gửi thông báo");
            return;
        }

        const notifications = admins.map((admin) => ({
            user_id: admin._id.toString(),
            title: "Liên hệ mới từ khách hàng 📩",
            message: `Người dùng "${contact.username}" đã gửi liên hệ mới.`,
            type: "contact_new_admin",
            data: {
                contact_id: contact._id,
                username: contact.username,
                email: contact.email,
                phone: contact.phone,
                address: contact.address,
                created_at: contact.createdAt || new Date(),
            },
            is_read: false,
            created_at: new Date(),
        }));

        // Bulk insert tối ưu
        await Notification.insertMany(notifications);

    } catch (error) {
        console.error("Lỗi khi gửi thông báo liên hệ mới:", error);
    }
};

export const createContact = async (req, res) => {
    try {
        const { username, email, phone, address, message } = req.body;

        let contactData = { message };

        if (req.user) {
            // Lấy địa chỉ mặc định từ shipping_addresses
            const defaultAddress = req.user.shipping_addresses?.find(addr => addr.is_default);

            if (!defaultAddress) {
                return res.status(400).json({
                    message: "Không tìm thấy địa chỉ mặc định trong hồ sơ người dùng.",
                });
            }

            contactData = {
                ...contactData,
                username: req.user.username,
                email: req.user.email,
                phone: defaultAddress.phone,
                address: defaultAddress.address,
                userId: req.user._id,
            };
        } else {
            // Chưa đăng nhập → bắt buộc nhập đủ các trường
            if (!username || !email || !phone || !address)
                return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin." });

            contactData = { ...contactData, username, email, phone, address };
        }

        const created = await contact_MD.create(contactData);

        sendNewContactNotificationToAdmins(created);

        res.status(201).json({ message: "Liên hệ đã được gửi!", data: created });
    } catch (error) {
        console.error("Lỗi khi gửi liên hệ:", error);
        res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
    }
};

export const getAllContacts = async (req, res) => {
    try {
        const contacts = await contact_MD.find().populate('userId', 'username email phone address').sort({ createdAt: -1 });
        res.status(200).json({ message: "Danh sách liên hệ", data: contacts });
    } catch (error) {
        console.error("Lỗi khi lấy danh sách liên hệ:", error);
        res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
    }
};

export const deleteContact = async (req, res) => {
    try {
        const { id } = req.params;

        const contact = await contact_MD.findById(id);
        if (!contact) {
            return res.status(404).json({ message: "Liên hệ không tồn tại" });
        }

        await contact_MD.findByIdAndDelete(id);

        res.status(200).json({ message: "Xóa liên hệ thành công" });
    } catch (error) {
        console.error("Lỗi khi xóa liên hệ:", error);
        res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
    }
};
