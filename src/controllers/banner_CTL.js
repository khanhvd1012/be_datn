import banner_MD from "../models/banner_MD.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Lấy tất cả banner có trạng thái hiển thị
export const getAllBanners = async (req, res) => {
  try {
    const banners = await banner_MD.find().sort({ createdAt: -1 });
    res.status(200).json(banners);
  } catch (error) {
    console.error("Lỗi khi lấy banner:", error);
    res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
  }
};

// Lấy banner theo ID
export const getBannerById = async (req, res) => {
  try {
    const banner = await banner_MD.findById(req.params.id);
    if (!banner) return res.status(404).json({ message: "Không tìm thấy banner" });

    res.status(200).json(banner);
  } catch (error) {
    console.error("Lỗi khi lấy banner:", error);
    res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
  }
};

// Tạo banner mới
export const createBanner = async (req, res) => {
  try {
    const { title } = req.body;

    // Kiểm tra trùng tên
    const exists = await banner_MD.findOne({ title });
    if (exists) {
      // Nếu có file upload thì xoá ngay để tránh rác
      if (req.file) {
        const filePath = path.join(__dirname, "../../public/uploads", req.file.filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
      return res.status(400).json({ message: "Tên banner đã tồn tại, vui lòng chọn tên khác" });
    }

    if (req.file) {
      req.body.image = `http://localhost:3000/uploads/${req.file.filename}`;
    }

    const created = await banner_MD.create(req.body);
    res.status(201).json({ message: "Tạo banner thành công", data: created });
  } catch (error) {
    if (req.file) {
      const filePath = path.join(__dirname, "../../public/uploads", req.file.filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    console.error("Lỗi khi tạo banner:", error);
    res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
  }
};

// Cập nhật banner
export const updateBanner = async (req, res) => {
  try {
    const banner = await banner_MD.findById(req.params.id);
    if (!banner) {
      if (req.file) {
        const filePath = path.join(__dirname, "../../public/uploads", req.file.filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
      return res.status(404).json({ message: "Banner không tồn tại" });
    }

    const { title } = req.body;
    if (title) {
      const exists = await banner_MD.findOne({ title, _id: { $ne: req.params.id } });
      if (exists) {
        if (req.file) {
          const filePath = path.join(__dirname, "../../public/uploads", req.file.filename);
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }
        return res.status(400).json({ message: "Tên banner đã tồn tại, vui lòng chọn tên khác" });
      }
    }

    if (req.file) {
      if (banner.image) {
        const oldFilename = banner.image.split("/uploads/")[1];
        const oldPath = path.join(__dirname, "../../public/uploads", oldFilename);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      req.body.image = `http://localhost:3000/uploads/${req.file.filename}`;
    }

    const updated = await banner_MD.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json({ message: "Cập nhật banner thành công", data: updated });
  } catch (error) {
    console.error("Lỗi khi cập nhật banner:", error);

    if (req.file) {
      const filePath = path.join(__dirname, "../../public/uploads", req.file.filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
  }
};

// Xoá banner
export const deleteBanner = async (req, res) => {
  try {
    const banner = await banner_MD.findById(req.params.id);
    if (!banner) return res.status(404).json({ message: "Banner không tồn tại" });

    if (banner.image) {
      const filename = banner.image.split("/uploads/")[1];
      const filePath = path.join(__dirname, "../../public/uploads", filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await banner_MD.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Xoá banner thành công" });
  } catch (error) {
    console.error("Lỗi khi xoá banner:", error);
    res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
  }
};

// Toggle trạng thái ẩn/hiện banner
export const toggleBannerStatus = async (req, res) => {
  try {
    const banner = await banner_MD.findById(req.params.id);
    if (!banner) return res.status(404).json({ message: "Banner không tồn tại" });

    banner.status = !banner.status;
    await banner.save();

    res.status(200).json({ message: "Đổi trạng thái thành công", status: banner.status });
  } catch (error) {
    console.error("Lỗi khi đổi trạng thái banner:", error);
    res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
  }
};
