import mongoose from 'mongoose';
import Product from "../models/product_MD";


export const getAllProduct = async (req, res) => {
    try {
        const filters = JSON.parse(req.query.filters || '{}');
        // Lấy các tham số phân trang và lọc từ query
        const {
            page = 1,
            limit = 10,
            category,
            brand,
            search,
            sku,
            minPrice,
            maxPrice,
        } = filters

        let filter = {};
        if (category) {
            filter.category = category;
        }
        if (brand) {
            filter.brand = brand;
        }
        if (search) {
            filter.name = { $regex: search, $options: 'i' }; // Tìm kiếm không phân biệt chữ hoa chữ thường
        }

        const options = {
            page: parseInt(page),
            limit: parseInt(limit),
            sort: { createdAt: -1 }, // Sắp xếp theo ngày tạo mới nhất
            populate: ['category', 'brand']
        }
        // Tạo điều kiện cho bảng Variant (query phụ)
        let variantMatch = {};


        if (sku) {
            variantMatch.sku = { $regex: sku, $options: 'i' }; // Tìm kiếm SKU không phân biệt chữ hoa chữ thường
        }

        if (minPrice || maxPrice) {
            variantMatch.price = {};
            if (minPrice) variantMatch.price.$gte = parseFloat(minPrice);
            if (maxPrice) variantMatch.price.$lte = parseFloat(maxPrice);
        }

        if (Object.keys(variantMatch).length > 0) {
            const matchingVariants = await mongoose.model('Variant').find(variantMatch);
            filter.variants = { $in: matchingVariants.map(v => v._id) }; // Lọc sản phẩm có biến thể phù hợp
        }

        const products = await Product.paginate(filter, options);

        // Populate thông tin variants cho từng sản phẩm
        const populatedProducts = await Promise.all(
            products.docs.map(async (product) => {
                const variants = await mongoose.model('Variant')
                    .find({ product_id: product._id })
                    .select('sku color size price image_url');
                return {
                    ...product.toObject(),
                    variants
                };
            })
        );

        // Trả kết quả
        return res.status(200).json({
            ...products,
            docs: populatedProducts
        });
    } catch (error) {
        console.error("Lỗi getAllProduct:", error);
        return res.status(500).json({ message: "Lỗi khi lấy danh sách sản phẩm" });
    }
};

export const getOneProduct = async (req, res) => {
    try {
        // Tìm sản phẩm theo ID và populate các thông tin liên quan
        const product = await Product.findById(req.params.id)
            .populate('category')
            .populate('brand')
            .populate('variants');

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
            variants: req.body.variants || [] // tạm bỏ variants
        };

        const product = await Product.create(productData);
        // Lấy thông tin sản phẩm vừa tạo với đầy đủ thông tin liên quan
        const populatedProduct = await Product.findById(product._id)
            .populate('category')
            .populate('brand')
            .populate('variants');

        // Trả về sản phẩm đã được tạo
        return res.status(201).json({
            message: "Tạo sản phẩm thành công",
            data: populatedProduct
        });
    } catch (error) {
        return res.status(500).json({ message: "Lỗi khi tạo sản phẩm mới" });
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
            .populate('category')
            .populate('brand')
            .populate('variants');

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
        await mongoose.model('Variant').deleteMany({ product_id: req.params.id }); // Xóa tất cả biến thể liên quan
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