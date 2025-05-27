import brand_MD from "../models/brand_MD";

// Hàm xử lý lấy tất cả thương hiệu
export const getAllBrands = async (req, res) => {
    try {
        // Lấy tất cả thương hiệu từ cơ sở dữ liệu
        const brands = await brand_MD.find();
        // Trả về kết quả thành công với status 200 và dữ liệu thương hiệu
        res.status(200).json(brands);
    } catch (error) {
        // Ghi log lỗi vào console
        console.error('Lỗi khi lấy dữ liệu thương hiệu:', error);
        // Trả về thông báo lỗi với status 500
        res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
    }
}
// Hàm xử lý lấy thông tin thương hiệu theo ID

export const getBrandById = async (req, res) => {
    try {
        // Lấy ID thương hiệu từ tham số URL
        // Tìm thương hiệu theo ID và populate dữ liệu sản phẩm liên quan
        const brandData = await brand_MD.findById(req.params.id)
        .populate({
            path: 'products',
            select: 'name description price images category brand status quantity' // Chọn các trường cần thiết từ sản phẩm
        });
        // Kiểm tra nếu không tìm thấy thương hiệu
        if (!brandData) {
            return res.status(404).json({ message: 'Thương hiệu không tồn tại' });
        }
        // Trả về kết quả thành công với status 200 và dữ liệu thương hiệu
        res.status(200).json(brandData);
    } catch (error) {
        // Ghi log lỗi vào console
        console.error('Lỗi khi lấy dữ liệu thương hiệu:', error);
        // Trả về thông báo lỗi với status 500
        res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
    }
}

// Hàm xử lý tạo mới thương hiệu
export const createBrand = async (req, res) => {
    try {
        // Lấy dữ liệu thương hiệu từ yêu cầu
        const brandData = await brand_MD.create(req.body);
        return res.status(201).json({
            message: 'Thương hiệu đã được tạo thành công',
            data: brandData
        });
    } catch (error) {
        console.error('Lỗi khi tạo thương hiệu:', error);
        res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
    }
}

export const updateBrand = async (req, res) => {
    try {
        // Lấy ID thương hiệu từ tham số URL
        const brandId = req.params.id;
        // Cập nhật thương hiệu theo ID với dữ liệu mới
        const updatedBrand = await brand_MD.findByIdAndUpdate(brandId, req.body, { new: true });
        // Kiểm tra nếu không tìm thấy thương hiệu
        if (!updatedBrand) {
            return res.status(404).json({ message: 'Thương hiệu không tồn tại' });
        }
        // Trả về kết quả thành công với status 200 và dữ liệu thương hiệu đã cập nhật
        res.status(200).json(updatedBrand);
    } catch (error) {
        console.error('Lỗi khi cập nhật thương hiệu:', error);
        res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
    }
}

export const deleteBrand = async (req, res) => {
    try {
        // Lấy ID thương hiệu từ tham số URL
        const brandId = req.params.id;
        // Xóa thương hiệu theo ID
        const deletedBrand = await brand_MD.findByIdAndDelete(brandId);
        // Kiểm tra nếu không tìm thấy thương hiệu
        if (!deletedBrand) {
            return res.status(404).json({ message: 'Thương hiệu không tồn tại' });
        }
        // Trả về kết quả thành công với status 200 và thông báo xóa thành công
        res.status(200).json({ message: 'Thương hiệu đã được xóa thành công' });
    } catch (error) {
        console.error('Lỗi khi xóa thương hiệu:', error);
        res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
    }
}

