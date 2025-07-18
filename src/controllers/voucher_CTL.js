import Voucher_MD from "../models/voucher_MD";
import mongoose from "mongoose";

/**
 * Tạo voucher mới
 * @param {Object} req - Request object chứa thông tin voucher cần tạo
 * @param {Object} res - Response object
 * @returns {Object} Voucher đã tạo thành công hoặc thông báo lỗi
 */
export const createVoucher = async (req, res) => {
    try {
        // kiểm tra xem voucher đã tồn tại chưa
        const existingVoucher = await Voucher_MD.findOne({ code: req.body.code });
        if (existingVoucher) {
            return res.status(400).json({
                message: "Voucher đã tồn tại",
            });
        }
        const voucher = await Voucher_MD.create(req.body);
        return res.status(201).json({
            message: "Tạo voucher thành công",
            data: voucher
        });
    } catch (error) {
        return res.status(500).json({
            message: "Lỗi khi tạo voucher",
            error: error.message
        });
    }
};

/**
 * Lấy danh sách tất cả voucher
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Array} Danh sách voucher hoặc thông báo lỗi
 */
export const getAllVouchers = async (req, res) => {
    try {
        const vouchers = await Voucher_MD.find().sort({ createdAt: -1 });
        return res.status(200).json(vouchers);
    } catch (error) {
        return res.status(500).json({
            message: "Lỗi khi lấy danh sách voucher",
            error: error.message
        });
    }
};

/**
 * Lấy thông tin voucher theo mã code
 * @param {Object} req - Request object chứa mã code trong params
 * @param {Object} res - Response object
 * @returns {Object} Thông tin voucher hoặc thông báo lỗi
 */
export const getOneVoucher = async (req, res) => {
    try {
        const voucher = await Voucher_MD.findById(req.params.id);

        if (!voucher) {
            return res.status(404).json({ message: "Voucher không tồn tại" });
        }
        return res.status(200).json(voucher);
    } catch (error) {
        return res.status(500).json({ message: "Lỗi khi lấy voucher", error: error.message });
    }
};

/**
 * Cập nhật thông tin voucher
 * @param {Object} req - Request object chứa id và thông tin cần cập nhật
 * @param {Object} res - Response object
 * @returns {Object} Voucher đã cập nhật hoặc thông báo lỗi
 */
export const updateVoucher = async (req, res) => {
    try {
        // Kiểm tra usedCount không vượt quá quantity
        if (req.body.usedCount && req.body.quantity && req.body.usedCount > req.body.quantity) {
            return res.status(400).json({
                message: "Số lượng đã sử dụng không được vượt quá tổng số lượng"
            });
        }

        const voucher = await Voucher_MD.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );

        if (!voucher) {
            return res.status(404).json({ message: "Không tìm thấy voucher" });
        }

        return res.status(200).json({
            message: "Cập nhật voucher thành công",
            data: voucher
        });
    } catch (error) {
        return res.status(500).json({
            message: "Lỗi khi cập nhật voucher",
            error: error.message
        });
    }
};

/**
 * Xóa voucher
 * @param {Object} req - Request object chứa id voucher cần xóa
 * @param {Object} res - Response object
 * @returns {Object} Thông báo xóa thành công hoặc lỗi
 */
export const deleteVoucher = async (req, res) => {
    try {
        const voucher = await Voucher_MD.findByIdAndDelete(req.params.id);

        if (!voucher) {
            return res.status(404).json({ message: "Không tìm thấy voucher" });
        }

        return res.status(200).json({ message: "Xóa voucher thành công" });
    } catch (error) {
        return res.status(500).json({
            message: "Lỗi khi xóa voucher",
            error: error.message
        });
    }
};