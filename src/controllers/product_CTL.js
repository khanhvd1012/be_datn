import mongoose from 'mongoose';
import Product from "../models/product_MD";
import Category from "../models/category_MD";
import Brand from "../models/brand_MD";


export const getAllProduct = async (req, res) => {    try {
          // Lấy tất cả sản phẩm và sắp xếp theo thời gian tạo mới nhất
          const products = await Product.find().sort({ createdAt: -1 });
          res.status(200).json(products);
      } catch (error) {
          console.error('Lỗi khi lấy dữ liệu sản phẩm:', error);
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

    // Thêm product ID vào danh sách products của category
    await Category.findByIdAndUpdate(
      product.category,
      { $push: { products: product._id } }
    );

    // Thêm product ID vào danh sách products của brand
    await Brand.findByIdAndUpdate(
      product.brand,
      { $push: { products: product._id } }
    );

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
        // Lấy thông tin sản phẩm cũ trước khi cập nhật
        const oldProduct = await Product.findById(req.params.id);
        if (!oldProduct) {
            return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
        }

        // Tạo object dữ liệu cập nhật từ request body
        const productData = {
            name: req.body.name,
            description: req.body.description,
            brand: req.body.brand,
            category: req.body.category,
            gender: req.body.gender,
            variants: []
        };

        // Cập nhật sản phẩm và lấy thông tin mới
        const product = await Product.findByIdAndUpdate(
            req.params.id,
            productData,
            { new: true } // Trả về document sau khi update
        );

        // Nếu category thay đổi, cập nhật danh sách products trong cả category cũ và mới
        if (oldProduct.category.toString() !== product.category.toString()) {
            // Xóa product khỏi category cũ
            await Category.findByIdAndUpdate(
                oldProduct.category,
                { $pull: { products: product._id } }
            );

            // Thêm product vào category mới
            await Category.findByIdAndUpdate(
                product.category,
                { $push: { products: product._id } }
            );
        }

        // Nếu brand thay đổi, cập nhật danh sách products trong cả brand cũ và mới
        if (oldProduct.brand.toString() !== product.brand.toString()) {
            // Xóa product khỏi brand cũ
            await Brand.findByIdAndUpdate(
                oldProduct.brand,
                { $pull: { products: product._id } }
            );

            // Thêm product vào brand mới
            await Brand.findByIdAndUpdate(
                product.brand,
                { $push: { products: product._id } }
            );
        }

        return res.status(200).json({
            message: "Cập nhật sản phẩm thành công",
            data: product
        });
    } catch (error) {
        console.error("Lỗi khi cập nhật sản phẩm:", error);
        return res.status(500).json({ message: "Lỗi khi cập nhật sản phẩm" });
    }
};
export const removeProduct = async (req, res) => {
    try {
        // Tìm sản phẩm trước khi xóa để lấy thông tin
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
        }

        // Xóa reference trong category
        await Category.findByIdAndUpdate(
            product.category,
            { $pull: { products: product._id } }
        );

        // Xóa reference trong brand
        await Brand.findByIdAndUpdate(
            product.brand,
            { $pull: { products: product._id } }
        );

        // Xóa sản phẩm
        await Product.findByIdAndDelete(req.params.id);

        return res.status(200).json({ message: "Xóa sản phẩm thành công" });
    } catch (error) {
        console.error("Lỗi khi xóa sản phẩm:", error);
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