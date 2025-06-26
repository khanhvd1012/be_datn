import Image from "../models/upload_MD";
import fs from "fs"; // Thêm module fs để xóa file
import path from "path"; // Thêm module path để xử lý đường dẫn file
import { fileURLToPath } from "url"; // Thêm module url

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Lấy tất cả ảnh
export const getAllImages = async (req, res) => {
  try {
    const images = await Image.find(); // hoặc có thể dùng .sort({ createdAt: -1 }) nếu muốn mới nhất trước

    res.status(200).json({
      message: "Lấy danh sách ảnh thành công",
      images,
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi lấy ảnh", error: error.message });
  }
};


export const uploadImage = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'Không có file nào được upload' });
    }

    const imageUrls = req.files.map(file => `http://localhost:3000/uploads/${file.filename}`);

    // Lưu vào MongoDB nếu muốn
    const savedImages = await Image.insertMany(imageUrls.map(url => ({ url })));

    res.status(200).json({
      message: 'Upload ảnh thành công',
      images: savedImages.map(img => ({ _id: img._id, url: img.url })),
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi upload ảnh', error: error.message });
  }
};
// Xóa ảnh
export const deleteImage = async (req, res) => {
  try {
    const { id } = req.params; // Lấy ID ảnh từ params

    // Tìm ảnh trong database
    const image = await Image.findById(id);
    if (!image) {
      return res.status(404).json({ message: "Không tìm thấy ảnh" });
    }

    // Lấy đường dẫn file từ URL
    const filename = path.basename(image.url);
    const filePath = path.join(__dirname, "../uploads", filename);

    // Xóa file khỏi thư mục uploads
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Xóa bản ghi trong database
    await Image.findByIdAndDelete(id);

    res.status(200).json({ message: "Xóa ảnh thành công" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi xóa ảnh", error: error.message });
  }
};