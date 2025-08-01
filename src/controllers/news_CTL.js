import news_MD from "../models/news_MD.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Hàm xoá file upload
const deleteImages = (imageUrls) => {
  imageUrls.forEach((url) => {
    const filename = url.split("/uploads/")[1];
    const filePath = path.join(__dirname, "../../public/uploads", filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  });
};

// GET tất cả tin tức
export const getAllNews = async (req, res) => {
  try {
    const newsList = await news_MD
      .find()
      .populate({ path: "author", select: "username" })
      .sort({ createdAt: -1 });

    res.status(200).json(newsList);
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
    const images =
      req.files?.map((file) => `http://localhost:3000/uploads/${file.filename}`) || [];

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
    if (!mongoose.Types.ObjectId.isValid(id)) {
      if (req.files) deleteImages(req.files.map((f) => `http://localhost:3000/uploads/${f.filename}`));
      return res.status(400).json({ message: "ID không hợp lệ" });
    }

    const news = await news_MD.findById(id);
    if (!news) {
      if (req.files) deleteImages(req.files.map((f) => `http://localhost:3000/uploads/${f.filename}`));
      return res.status(404).json({ message: "Tin tức không tồn tại" });
    }

    let newImages = news.images;

    if (req.files && req.files.length > 0) {
      // Xoá ảnh cũ
      if (news.images && news.images.length > 0) {
        deleteImages(news.images);
      }

      // Gán ảnh mới
      newImages = req.files.map((file) => `http://localhost:3000/uploads/${file.filename}`);
    }

    const updated = await news_MD.findByIdAndUpdate(
      id,
      { ...req.body, images: newImages },
      { new: true }
    );

    res.status(200).json({ message: "Cập nhật tin tức thành công", data: updated });
  } catch (error) {
    if (req.files) deleteImages(req.files.map((f) => `http://localhost:3000/uploads/${f.filename}`));

    console.error("Lỗi khi cập nhật tin tức:", error);
    res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
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
