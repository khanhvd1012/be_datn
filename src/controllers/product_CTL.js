import mongoose from 'mongoose';
import Product from "../models/product_MD";
import Category from "../models/category_MD";
import Brand from "../models/brand_MD";
import Variant from "../models/variant_MD";
import { AppError } from "../middleware/errorHandler_MID";
import Order from "../models/order_MD";
import slugify from 'slugify';

/**
 * Controller lấy danh sách tất cả sản phẩm
 * @description
 * - Sử dụng middleware requestHandler để xử lý phân trang, sắp xếp và tìm kiếm
 * - Populate thông tin category và brand của sản phẩm
 * - Trả về danh sách sản phẩm và thông tin phân trang
 */
export const getAllProduct = async (req, res, next) => {
    try {
        const { pagination, sorting, searching } = req;

        // Lấy danh sách sản phẩm với phân trang
        const products = await Product.paginate(searching, {
            page: pagination.page,
            limit: pagination.limit,
            sort: sorting,
            populate: ['category', 'brand', 'size']
        });

        // Lấy giá thấp nhất từ các biến thể cho mỗi sản phẩm
        const productsWithMinPrice = await Promise.all(products.docs.map(async (product) => {
            const variants = await Variant.find({ product_id: product._id })
                .select('price')
                .sort({ price: 1 })
                .limit(1);

            const productObj = product.toObject();
            productObj.min_price = variants.length > 0 ? variants[0].price : 0;
            return productObj;
        }));

        return res.status(200).json({
            success: true,
            data: {
                products: productsWithMinPrice,
                pagination: {
                    total: products.totalDocs,
                    page: products.page,
                    pages: products.totalPages,
                    limit: products.limit
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Controller lấy thông tin chi tiết một sản phẩm
 * @description
 * - Tìm sản phẩm theo ID
 * - Populate thông tin category, brand và variants của sản phẩm
 * - Trả về lỗi nếu không tìm thấy sản phẩm
 */
export const getOneProduct = async (req, res, next) => {
    try {
        const product = await Product.findById(req.params.id)
            .populate(['category', 'brand', 'variants', 'size']);

        if (!product) {
            throw new AppError('Không tìm thấy sản phẩm', 404);
        }

        return res.status(200).json({
            success: true,
            data: product
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Controller tạo sản phẩm mới
 * @description
 * - Kiểm tra category và brand tồn tại
 * - Tạo sản phẩm mới với thông tin từ request body
 * - Cập nhật danh sách sản phẩm trong category và brand tương ứng
 * - Trả về thông tin sản phẩm vừa tạo
 */
export const createProduct = async (req, res, next) => {
    try {
        // Kiểm tra category và brand tồn tại
        const [category, brand, size] = await Promise.all([
            mongoose.model('Categories').findById(req.body.category),
            mongoose.model('Brands').findById(req.body.brand),
            Promise.all((req.body.size || []).map(id => mongoose.model('Sizes').findById(id)))
        ]);

        const invalidSize = size.find(s => !s);
        if (invalidSize) {
            return res.status(404).json({
                success: false,
                message: `Một hoặc nhiều kích cỡ không hợp lệ`
            });
        }

        if (!category) {
            return res.status(404).json({
                success: false,
                message: `Không tìm thấy danh mục với ID: ${req.body.category}`
            });
        }
        if (!brand) {
            return res.status(404).json({
                success: false,
                message: `Không tìm thấy thương hiệu với ID: ${req.body.brand}`
            });
        }
        if (!size) {
            return res.status(404).json({
                success: false,
                message: `Không tìm thấy kích cỡ với ID: ${req.body.size}`
            });
        }

        // Tạo sản phẩm mới
        const slug = slugify(req.body.name, { lower: true, strict: true });

        const product = await Product.create({
            name: req.body.name,
            slug, // thêm dòng này
            description: req.body.description,
            brand: brand._id,
            category: category._id,
            size: size.map(s => s._id)
        });

        // Cập nhật danh sách sản phẩm trong category và brand
        await Promise.all([
            mongoose.model('Categories').findByIdAndUpdate(
                category._id,
                { $addToSet: { products: product._id } }
            ),
            mongoose.model('Brands').findByIdAndUpdate(
                brand._id,
                { $addToSet: { products: product._id } }
            )
        ]);

        // Populate thông tin category và brand
        const populatedProduct = await Product.findById(product._id)
            .populate('category', 'name')
            .populate('brand', 'name')
            .populate('size', 'name');

        return res.status(201).json({
            success: true,
            message: 'Tạo sản phẩm thành công',
            data: populatedProduct
        });
    } catch (error) {
        // Kiểm tra lỗi ObjectId không hợp lệ
        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: `ID không hợp lệ cho trường ${error.path}`
            });
        }
        next(error);
    }
};

/**
 * Controller cập nhật thông tin sản phẩm
 * @description
 * - Kiểm tra sản phẩm tồn tại
 * - Nếu thay đổi category hoặc brand, kiểm tra category/brand mới có tồn tại không
 * - Cập nhật thông tin sản phẩm
 * - Populate và trả về thông tin sản phẩm sau khi cập nhật
 */
export const updateProduct = async (req, res, next) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            throw new AppError('Không tìm thấy sản phẩm', 404);
        }

        // Kiểm tra category và brand mới nếu có thay đổi
        if (req.body.category && req.body.category !== product.category.toString()) {
            const category = await mongoose.model('Categories').findById(req.body.category);
            if (!category) {
                throw new AppError('Danh mục không tồn tại', 404);
            }
        }
        if (req.body.brand && req.body.brand !== product.brand.toString()) {
            const brand = await mongoose.model('Brands').findById(req.body.brand);
            if (!brand) {
                throw new AppError('Thương hiệu không tồn tại', 404);
            }
        }
        if (req.body.size) {
            const size = await Promise.all(req.body.size.map(id => mongoose.model('Sizes').findById(id)));
            const invalidSize = size.find(s => !s);
            if (invalidSize) {
                throw new AppError('Một hoặc nhiều kích cỡ không hợp lệ', 404);
            }
        }
        if (req.body.name) {
            req.body.slug = slugify(req.body.name, { lower: true, strict: true });
        }

        const updatedProduct = await Product.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        ).populate(['category', 'brand', 'size', 'variants']);

        return res.status(200).json({
            success: true,
            message: 'Cập nhật sản phẩm thành công',
            data: updatedProduct
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Controller xóa sản phẩm
 * @description
 * - Kiểm tra sản phẩm tồn tại
 * - Kiểm tra sản phẩm có trong đơn hàng nào không
 * - Xóa sản phẩm khỏi danh sách trong category và brand
 * - Xóa tất cả biến thể của sản phẩm
 * - Xóa sản phẩm
 */
export const removeProduct = async (req, res, next) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            throw new AppError('Không tìm thấy sản phẩm', 404);
        }

        // Kiểm tra sản phẩm có đơn hàng không
        const hasOrders = await Order.exists({
            'items.product': product._id
        });
        if (hasOrders) {
            throw new AppError('Không thể xóa sản phẩm đã có đơn hàng', 400);
        }

        // Xóa sản phẩm khỏi category và brand
        await Promise.all([
            Category.findByIdAndUpdate(
                product.category,
                { $pull: { products: product._id } }
            ),
            Brand.findByIdAndUpdate(
                product.brand,
                { $pull: { products: product._id } }
            )
        ]);

        // Xóa tất cả biến thể của sản phẩm
        await Variant.deleteMany({ product_id: product._id });

        // Xóa sản phẩm
        await Product.deleteOne({ _id: product._id });

        return res.status(200).json({
            success: true,
            message: 'Xóa sản phẩm thành công'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Controller lấy danh sách biến thể của sản phẩm
 * @description
 * - Tìm sản phẩm theo ID
 * - Populate thông tin variants và stock của từng variant
 * - Trả về danh sách variants của sản phẩm
 */
export const getProductVariants = async (req, res, next) => {
    try {
        const product = await Product.findById(req.params.id)
            .populate({
                path: 'variants',
                populate: {
                    path: 'stock',
                    select: 'quantity'
                }
            });

        if (!product) {
            throw new AppError('Không tìm thấy sản phẩm', 404);
        }

        return res.status(200).json({
            success: true,
            data: product.variants
        });
    } catch (error) {
        next(error);
    }
};

export const getProductBySlug = async (req, res, next) => {
    try {
        const product = await Product.findOne({ slug: req.params.slug })
            .populate('category')
            .populate('brand')
            .populate('size')
            .populate('variants');
        if (!product) return res.status(404).json({ message: 'Not found' });
        res.json({ data: product });
    } catch (error) {
        next(error);
    }
};