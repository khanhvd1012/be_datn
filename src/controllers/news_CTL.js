import news_MD from "../models/news_MD.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import truncate from "truncate-html";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Hàm xoá file upload
const deleteImages = (files = []) => {
  files.forEach(item => {
    let filename = '';
    if (!item) return;
    if (typeof item === 'string') {
      filename = item.split('/uploads/')[1];
    } else if (item.filename) {
      filename = item.filename;
    }
    if (!filename) return;
    const filePath = path.join(__dirname, '../../public/uploads', filename);
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      console.error('Error deleting file:', filePath, err);
    }
  });
};

// GET tất cả tin tức
export const getAllNews = async (req, res) => {
  try {
    const newsList = await news_MD
      .find()
      .populate({ path: "author", select: "username" })
      .sort({ createdAt: -1 });

    const formatted = newsList.map((news) => ({
      ...news.toObject(),
      excerpt: truncate(news.content, 150, { ellipsis: "..." })
    }));

    res.status(200).json(formatted);
  } catch (error) {
    console.error("Lỗi khi lấy danh sách tin tức:", error);
    res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
  }
};

// GET chi tiết 1 tin
export const getNewsById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID không hợp lệ" });
    }

    const news = await news_MD.findById(id).populate({ path: "author", select: "username" });
    if (!news) return res.status(404).json({ message: "Không tìm thấy tin tức" });

    res.status(200).json(news);
  } catch (error) {
    console.error("Lỗi khi lấy tin tức:", error);
    res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
  }
};

// Tạo tin tức
export const createNews = async (req, res) => {
  try {

    const { title } = req.body;

    const exists = await news_MD.findOne({ title });
    if (exists) {
      if (req.files) {
        deleteImages(req.files.map(f => `http://localhost:3000/uploads/${f.filename}`));
      }
      return res.status(400).json({ message: "Tiêu đề đã tồn tại, vui lòng chọn tên khác" });
    }

    const images = req.files?.map((file) => `http://localhost:3000/uploads/${file.filename}`) || [];

    const MAX_IMAGES = 5;

    // Sau khi xử lý ảnh cũ + existingImages + ảnh mới
    if (images.length > MAX_IMAGES) {
      if (req.files && req.files.length > 0) {
        deleteImages(images);
      }
      return res.status(400).json({ message: `Tối đa ${MAX_IMAGES} ảnh` });
    }

    // Gán author từ middleware authMiddleware
    if (!req.user || !req.user._id) {
      if (req.files) deleteImages(images);
      return res.status(400).json({ message: "Người dùng không xác thực" });
    }

    const created = await news_MD.create({
      ...req.body,
      images,
      author: req.user._id
    });

    res.status(201).json({ message: "Tạo tin tức thành công", data: created });
  } catch (error) {
    if (req.files) deleteImages(req.files.map((f) => `http://localhost:3000/uploads/${f.filename}`));

    console.error("Lỗi khi tạo tin tức:", error);
    res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
  }
};

// Cập nhật tin tức
export const updateNews = async (req, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      if (req.files) deleteImages(req.files.map(f => `http://localhost:3000/uploads/${f.filename}`));
      return res.status(400).json({ message: "ID không hợp lệ" });
    }

    const news = await news_MD.findById(id);
    if (!news) {
      if (req.files) deleteImages(req.files.map(f => `http://localhost:3000/uploads/${f.filename}`));
      return res.status(404).json({ message: "Tin tức không tồn tại" });
    }

    if (title) {
      const exists = await news_MD.findOne({ title, _id: { $ne: id } });
      if (exists) {
        if (req.files) {
          deleteImages(req.files.map(f => `http://localhost:3000/uploads/${f.filename}`));
        }
        return res.status(400).json({ message: "Tiêu đề đã tồn tại, vui lòng chọn tên khác" });
      }
    }

    let imageUrls = [...(news.images || [])]; // mặc định giữ lại ảnh cũ

    // Nếu client gửi existingImages => chỉ giữ lại đúng các ảnh đó
    if (req.body.existingImages) {
      if (typeof req.body.existingImages === "string") {
        imageUrls = [req.body.existingImages];
      } else if (Array.isArray(req.body.existingImages)) {
        imageUrls = req.body.existingImages;
      }

      // Xoá ảnh không còn giữ lại
      const removedImages = (news.images || []).filter(
        oldUrl => !imageUrls.includes(oldUrl)
      );
      if (removedImages.length > 0) {
        deleteImages(removedImages);
      }
    }

    // Nếu có ảnh mới, thêm vào
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(file => `http://localhost:3000/uploads/${file.filename}`);
      imageUrls = [...imageUrls, ...newImages];
    }

    const MAX_IMAGES = 5;

    // Sau khi xử lý ảnh cũ + existingImages + ảnh mới
    if (imageUrls.length > MAX_IMAGES) {
      // Xóa ảnh mới vừa upload
      if (req.files && req.files.length > 0) {
        const newImages = req.files.map(f => `http://localhost:3000/uploads/${f.filename}`);
        deleteImages(newImages);
      }
      return res.status(400).json({ message: `Tối đa ${MAX_IMAGES} ảnh` });
    }

    // Bỏ existingImages ra khỏi body để tránh lưu thừa
    delete req.body.existingImages;

    const updated = await news_MD.findByIdAndUpdate(
      id,
      { ...req.body, images: imageUrls },
      { new: true }
    );

    return res.status(200).json({
      message: "Cập nhật tin tức thành công",
      data: updated,
    });
  } catch (error) {
    // Nếu có upload ảnh mới mà bị lỗi thì xoá đi để tránh rác
    if (req.files) {
      deleteImages(req.files.map(f => `http://localhost:3000/uploads/${f.filename}`));
    }

    console.error("Lỗi khi cập nhật tin tức:", error);
    return res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
  }
};

// Xoá tin tức
export const deleteNews = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID không hợp lệ" });
    }

    const news = await news_MD.findById(id);
    if (!news) return res.status(404).json({ message: "Tin tức không tồn tại" });

    if (news.images && news.images.length > 0) deleteImages(news.images);

    await news_MD.findByIdAndDelete(id);
    res.status(200).json({ message: "Xoá tin tức thành công" });
  } catch (error) {
    console.error("Lỗi khi xoá tin tức:", error);
    res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
  }
};
