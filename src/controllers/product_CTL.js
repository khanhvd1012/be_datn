import mongoose from 'mongoose';
import Product from "../models/product_MD";


export const getAllProduct = async (req, res) => {
    try {
          // Lấy tất cả danh mục từ cơ sở dữ liệu
  
          const products = await Product.find();
          res.status(200).json(products);
      } catch (error) {
          console.error('Lỗi khi lấy dữ liệu danh mục:', error);
          res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
      }
};

export const getOneProduct = async (req, res) => {
    try {
        // Tìm sản phẩm theo ID và populate các thông tin liên quan
        const product = await Product.findById(req.params.id)

        // Kiểm tra nếu không tìm thấy sản phẩm
        if (!product) {
            return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
        }

        // Trả về thông tin sản phẩm đầy đủ
        return res.status(200).json(product);
    } catch (error) {
        return res.status(500).json({ message: "Lỗi khi lấy thông tin sản phẩm" });
    }
};

export const createProduct = async (req, res) => {
  try {
    const productData = {
      name: req.body.name,
      description: req.body.description,
      brand: req.body.brand,
      category: req.body.category,
      gender: req.body.gender,
      variants: [] // tạm bỏ variants
    };

    const product = await Product.create(productData);

    return res.status(201).json({
      message: "Tạo sản phẩm thành công",
      data: product
    });
  } catch (error) {
    console.error("Lỗi tạo sản phẩm:", error);
    return res.status(500).json({ message: "Lỗi khi tạo sản phẩm mới", error: error.message });
  }
};

export const updateProduct = async (req, res) => {
    try {
        // Tạo object dữ liệu cập nhật từ request body
        const productData = {
            name: req.body.name,
            description: req.body.description,
            brand: req.body.brand,
            category: req.body.category,
            gender: req.body.gender,
            variants: req.body.variants || []
        };

        // Cập nhật sản phẩm và lấy thông tin mới
        const product = await Product.findByIdAndUpdate(
            req.params.id,
            productData,
            { new: true } // Trả về document sau khi update
        )
        if (!product) {
            return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
        }
        return res.status(200).json({
            message: "Cập nhật sản phẩm thành công",
            data: product
        });
    } catch (error) {
        return res.status(500).json({ message: "Lỗi khi cập nhật sản phẩm" });
    }
};
export const removeProduct = async (req, res) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);
        if (!product) {
            return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
        }
        return res.status(200).json({ message: "Xóa sản phẩm thành công" });
    } catch (error) {
        return res.status(500).json({ message: "Lỗi khi xóa sản phẩm" });
    }
};
export const getProductVariants = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id).populate('variants');
        if (!product) {
            return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
        }
        return res.status(200).json({
            tenSanPham: product.name,
            bienThe: product.variants
        });
    } catch (error) {
        return res.status(500).json({ message: "Lỗi khi lấy danh sách biến thể" });
    }
};