import contact_MD from "../models/contact_MD.js";

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

        res.status(201).json({ message: "Liên hệ đã được gửi!", data: created });
    } catch (error) {
        console.error("Lỗi khi gửi liên hệ:", error);
        res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
    }
};

export const getAllContacts = async (req, res) => {
  try {
    const contacts = await contact_MD.find().sort({ createdAt: -1 }); 
    res.status(200).json({ message: "Danh sách liên hệ", data: contacts });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách liên hệ:", error);
    res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
  }
};
