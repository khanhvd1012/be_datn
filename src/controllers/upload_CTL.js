import Image from "../models/upload_MD";

export const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Không có file được upload' });
    }
    const imageUrl = `http://localhost:8080/uploads/${req.file.filename}`;
    
    // Lưu URL vào MongoDB
    const newImage = new Image({ url: imageUrl });
    await newImage.save();
    
    res.status(200).json({ message: 'Upload ảnh thành công', imageUrl });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi upload ảnh', error: error.message });
  }
};