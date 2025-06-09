import stock_MD from "../models/stock_MD";
import stockHistory_MD from "../models/stockHistory_MD";

export const getOneStock = async (req, res) => {
    try {   
        // Kiểm tra xem có truyền ID biến thể không
        const stock = await stock_MD.findOne({ product_variant_id: req.params.id })
            .populate('product_variant_id');

        if (!stock) {
            return res.status(404).json({ message: 'Không tìm thấy thông tin kho' });
        }

        res.status(200).json({
            message: 'Lấy thông tin kho thành công',
            data: stock
        }); 
    } catch (error) {
        console.error('Lỗi khi lấy thông tin kho:', error);
        res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
    }
}

export const updateStock = async (req, res) => {
    try {
        // Kiểm tra xem có truyền dữ liệu không
        const { quantity, reason } = req.body;
        const stock = await stock_MD.findOne({ product_variant_id: req.params.id });
        if (!stock) {
            return res.status(404).json({ message: 'Không tìm thấy thông tin kho' });
        }
        // Kiểm tra xem quantity có phải là số và lớn hơn hoặc bằng 0 không
        const previousQuantity = stock.quantity;
        stock.quantity = quantity;
        stock.last_updated = new Date();
        await stock.save();
        // Lưu lịch sử kho
        await stockHistory_MD.create({
            stock_id: stock._id,
            quantity_change: quantity - previousQuantity,
            reason: reason || 'Cập nhật kho',
        })
        return res.status(200).json({
            message: 'Cập nhật kho thành công',
            data: stock
        });
    } catch (error) {
        console.error('Lỗi khi cập nhật kho:', error);
        res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
    }
}

export const getStockHistory = async (req, res) => {
    try {
        // Kiểm tra xem có truyền ID biến thể không
        const stock = await stock_MD.findOne({ product_variant_id: req.params.id });
        if (!stock) {
            return res.status(404).json({ message: 'Không tìm thấy thông tin kho' });
        }
        // Lấy lịch sử kho theo ID kho
        // Sắp xếp theo ngày tạo mới nhất trước
        const history = await stockHistory_MD.find({ stock_id: stock._id })
            .sort({ createdAt: -1 });
        return res.status(200).json({
            message: 'Lấy lịch sử kho thành công',
            data: history
        });
    } catch (error) {
        console.error('Lỗi khi lấy lịch sử kho:', error);
        res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
    }
}