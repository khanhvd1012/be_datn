import RemovedCartItem from "../models/removedCartItem_MD";

// Cập nhật tùy chọn tự động khôi phục cho một sản phẩm cụ thể
export const updateRestorePreference = async (req, res) => {
    try {
        const { auto_restore } = req.body;
        const { variant_id } = req.params;

        const removedItem = await RemovedCartItem.findOne({
            user_id: req.user._id,
            variant_id: variant_id
        });

        if (!removedItem) {
            return res.status(404).json({ 
                message: 'Không tìm thấy sản phẩm đã xóa' 
            });
        }

        removedItem.auto_restore = auto_restore;
        await removedItem.save();

        res.status(200).json({
            message: 'Đã cập nhật tùy chọn khôi phục thành công',
            data: removedItem
        });
    } catch (error) {
        console.error('Lỗi khi cập nhật tùy chọn khôi phục:', error);
        res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
    }
};

// Cập nhật tùy chọn tự động khôi phục cho tất cả sản phẩm
export const updateAllRestorePreferences = async (req, res) => {
    try {
        const { auto_restore } = req.body;

        await RemovedCartItem.updateMany(
            { user_id: req.user._id },
            { auto_restore }
        );

        res.status(200).json({
            message: 'Đã cập nhật tùy chọn khôi phục cho tất cả sản phẩm thành công'
        });
    } catch (error) {
        console.error('Lỗi khi cập nhật tùy chọn khôi phục:', error);
        res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
    }
};

// Lấy danh sách sản phẩm đã xóa và tùy chọn khôi phục
export const getRemovedItems = async (req, res) => {
    try {
        const removedItems = await RemovedCartItem.find({
            user_id: req.user._id
        })
        .populate('product_id', 'name images')
        .populate('variant_id', 'name price')
        .sort({ removed_at: -1 });

        res.status(200).json({
            message: 'Lấy danh sách sản phẩm đã xóa thành công',
            data: removedItems
        });
    } catch (error) {
        console.error('Lỗi khi lấy danh sách sản phẩm đã xóa:', error);
        res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
    }
};

// Cập nhật thời hạn khôi phục cho một sản phẩm
export const updateRestoreExpiry = async (req, res) => {
    try {
        const { restore_days } = req.body;
        const { variant_id } = req.params;

        const removedItem = await RemovedCartItem.findOne({
            user_id: req.user._id,
            variant_id: variant_id
        });

        if (!removedItem) {
            return res.status(404).json({ 
                message: 'Không tìm thấy sản phẩm đã xóa' 
            });
        }

        // Nếu restore_days là null, set restore_expiry là null (khôi phục vĩnh viễn)
        // Ngược lại, tính thời hạn mới từ thời điểm hiện tại
        removedItem.restore_expiry = restore_days 
            ? new Date(Date.now() + restore_days * 24 * 60 * 60 * 1000)
            : null;

        await removedItem.save();

        res.status(200).json({
            message: 'Đã cập nhật thời hạn khôi phục thành công',
            data: removedItem
        });
    } catch (error) {
        console.error('Lỗi khi cập nhật thời hạn khôi phục:', error);
        res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
    }
}; 