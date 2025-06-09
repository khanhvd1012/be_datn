import stockHistory_MD from "../models/stockHistory_MD";


export const getAllStockHistory = async (req, res) => {
    try {
        // Lấy tất cả lịch sử kho và sắp xếp theo ngày tạo mới nhất
        const stockHistory = await stockHistory_MD.find()
            .populate('stock_id', 'product_variant_id')
            .sort({ createdAt: -1 });

        return res.status(200).json({
            message: 'Lấy lịch sử kho thành công',
            data: stockHistory
        });
    } catch (error) {
        console.error('Lỗi khi lấy lịch sử kho:', error);
        return res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
    }
}

export const getStockHistoryById = async (req, res) => {
    try {   
        // Kiểm tra xem có truyền ID lịch sử kho không
        const stockHistory = await stockHistory_MD.findById(req.params.id)
            .populate('stock_id', 'product_variant_id');

        if (!stockHistory) {
            return res.status(404).json({ message: 'Không tìm thấy lịch sử kho' });
        }

        return res.status(200).json({
            message: 'Lấy lịch sử kho thành công',
            data: stockHistory
        });
    } catch (error) {
        console.error('Lỗi khi lấy lịch sử kho:', error);
        return res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
    }
}

export const deleteStockHistory = async (req, res) => {
    try {
        // Kiểm tra xem có truyền ID lịch sử kho không
        const stockHistory = await stockHistory_MD.findByIdAndDelete(req.params.id);
        if (!stockHistory) {
            return res.status(404).json({ message: 'Không tìm thấy lịch sử kho' });
        }
        
        return res.status(200).json({
            message: 'Xóa lịch sử kho thành công',
            data: stockHistory
        });
    } catch (error) {
        console.error('Lỗi khi xóa lịch sử kho:', error);
        return res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
    }
}

