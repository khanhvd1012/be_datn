import mongoose from 'mongoose';
import Product from "../models/product_MD";
import Category from "../models/category_MD";
import Brand from "../models/brand_MD";
import Variant from "../models/variant_MD";
import Notification from "../models/notification_MD";
import User from "../models/auth_MD";
import { AppError } from "../middleware/errorHandler_MID";
import Order from "../models/order_MD";
import slugify from 'slugify';
import Review from "../models/review_MD";
import orderItem_MD from '../models/orderItem_MD';
import Stock from "../models/stock_MD";
import { setProductTimeout, clearProductTimeout } from '../middleware/timeoutRegistry_MID';

/**
 * Gửi thông báo sản phẩm mới cho tất cả admin
 * @param {Object} product - Thông tin sản phẩm vừa tạo
 */
const sendNewProductNotificationToAdmins = async (product) => {
    try {
        // Lấy danh sách tất cả admin
        const admins = await User.find({
            $or: [
                { role: 'admin' }
            ]
        });

        if (admins.length === 0) {
            console.log('Không tìm thấy admin nào để gửi thông báo');
            return;
        }

        // Tạo thông báo cho từng admin
        const notifications = admins.map(admin => ({
            user_id: admin._id.toString(),
            title: 'Sản phẩm mới đã được tạo! 📦',
            message: `Sản phẩm "${product.name}" đã được thêm vào hệ thống. Hãy kiểm tra và cập nhật thông tin nếu cần thiết.`,
            type: 'product_new_admin',
            data: {
                product_id: product._id,
                product_name: product.name,
                product_slug: product.slug,
                category: product.category?.name || 'Chưa có danh mục',
                brand: product.brand?.name || 'Chưa có thương hiệu',
                created_at: new Date()
            },
            is_read: false,
            created_at: new Date()
        }));

        // Bulk insert để tối ưu performance
        await Notification.insertMany(notifications);
        console.log(`Đã gửi thông báo sản phẩm mới "${product.name}" cho ${admins.length} admin(s)`);

    } catch (error) {
        console.error('Lỗi khi gửi thông báo sản phẩm mới cho admin:', error);
        // Không throw error để không ảnh hưởng đến việc tạo sản phẩm
    }
};

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
            populate: ['category', 'brand']
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
            .populate(['category', 'brand', 'variants']);

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
 * Controller tạo sản phẩm mới và gửi thông báo cho admin
 * @description
 * - Kiểm tra category và brand tồn tại
 * - Tạo sản phẩm mới với thông tin từ request body
 * - Cập nhật danh sách sản phẩm trong category và brand tương ứng
 * - Tự động gửi thông báo cho tất cả admin
 * - Trả về thông tin sản phẩm vừa tạo
 */
export const createProduct = async (req, res, next) => {
    try {
        // Kiểm tra category và brand tồn tại
        const [category, brand] = await Promise.all([
            mongoose.model('Categories').findById(req.body.category),
            mongoose.model('Brands').findById(req.body.brand),
        ]);

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

        // Tạo sản phẩm mới
        const slug = slugify(req.body.name, { lower: true, strict: true });

        const product = await Product.create({
            name: req.body.name,
            slug,
            description: req.body.description,
            brand: brand._id,
            category: category._id,
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
            .populate('brand', 'name');

        // Gửi thông báo cho admin ngay sau khi tạo sản phẩm thành công

        // Chạy bất đồng bộ để không ảnh hưởng đến response time
        setImmediate(async () => {
            await sendNewProductNotificationToAdmins({
                ...populatedProduct.toObject(),
                category: { name: category.name },
                brand: { name: brand.name }
            });
        });

        // Gửi thông báo cho khách hàng sau 1 giờ

        const timeoutId = setTimeout(async () => {
            await sendNewProductNotificationToCustomers({
                ...populatedProduct.toObject()
            });
        }, 36000); // 1 giờ

        setProductTimeout(product._id, timeoutId);

        return res.status(201).json({
            success: true,
            message: 'Tạo sản phẩm thành công. Thông báo đã được gửi đến admin.',
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
        if (req.body.name) {
            req.body.slug = slugify(req.body.name, { lower: true, strict: true });
        }

        const updatedProduct = await Product.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        ).populate(['category', 'brand', 'variants']);

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
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy sản phẩm'
            });
        }

        // Kiểm tra sản phẩm có đơn hàng không (OrderItem hoặc Order)
        const hasOrderItem = await orderItem_MD.exists({ product_id: product._id });
        const hasOrder = await Order.exists({ 'items.product': product._id });
        if (hasOrderItem || hasOrder) {
            return res.status(400).json({
                success: false,
                message: 'Không thể xóa sản phẩm đã có đơn hàng'
            });
        }

        // Kiểm tra biến thể đã có đánh giá
        const variants = await Variant.find({ product_id: product._id });
        for (const variant of variants) {
            const hasReview = await Review.exists({
                product_id: product._id,
                $or: [
                    { product_variant_id: variant._id },
                    { variant_id: variant._id }
                ]
            });
            if (hasReview) {
                return res.status(400).json({
                    success: false,
                    message: 'Không thể xóa sản phẩm đã có đánh giá'
                });
            }
        }
        // Lấy danh sách ID biến thể để xóa stock
        const variantIds = variants.map(v => v._id);
        await Stock.deleteMany({ product_variant_id: { $in: variantIds } });

        // Xóa tất cả biến thể của sản phẩm
        await Variant.deleteMany({ product_id: product._id });

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
        // Xóa timeout cho sản phẩm
        clearProductTimeout(product._id);

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

/**
 * Controller lấy sản phẩm theo slug
 */
export const getProductBySlug = async (req, res) => {
    try {
        const product = await Product.findOne({ slug: req.params.slug })
            .populate("brand")
            .populate("category")
            .populate("variants");

        if (!product) {
            return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
        }

        // Lấy tất cả order đã giao thành công, populate sang OrderItem
        const orders = await Order.find({
            status: "delivered",
        }).populate({
            path: "items",
            match: { variant_id: { $in: product.variants.map((v) => v._id) } },
            select: "variant_id quantity", // chỉ lấy field cần dùng
        });

        // Gom số lượng đã bán theo variant_id
        const soldMap = {};
        orders.forEach((order) => {
            order.items.forEach((item) => {
                const variantId = item.variant_id.toString();
                if (!soldMap[variantId]) soldMap[variantId] = 0;
                soldMap[variantId] += item.quantity;
            });
        });

        // Thêm stock và soldQuantity vào từng variant
        const variantsWithStock = await Promise.all(
            product.variants.map(async (variant) => {
                const stock = await Stock.findOne({ product_variant_id: variant._id });

                return {
                    ...variant.toObject(),
                    stock: {
                        quantity: stock ? stock.quantity : 0,
                        status: variant.status,
                    },
                    soldQuantity: soldMap[variant._id.toString()] || 0,
                };
            })
        );

        const productData = {
            ...product.toObject(),
            variants: variantsWithStock,
        };

        return res.status(200).json({
            success: true,
            data: productData,
        });
    } catch (error) {
        console.error("Lỗi khi lấy sản phẩm theo slug:", error);
        return res.status(500).json({
            success: false,
            message: "Lỗi máy chủ",
            error: error.message,
        });
    }
};

export const getRelatedProducts = async (req, res) => {
    try {
        const { slug } = req.params;

        // Tìm sản phẩm hiện tại theo slug
        const product = await Product.findOne({ slug }).populate("category");
        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy sản phẩm",
            });
        }

        // Lấy sản phẩm liên quan trong cùng category (ngoại trừ chính nó)
        const relatedProducts = await Product.find({
            category: product.category._id,
            _id: { $ne: product._id },
        })
            .limit(10)
            .populate("brand")
            .populate("category")
            .populate({
                path: "variants",
                populate: [
                    { path: "size" },   // nếu Variant có tham chiếu tới Size
                    { path: "color" },  // nếu Variant có tham chiếu tới Color
                ],
            });

        return res.status(200).json({
            success: true,
            data: relatedProducts,
        });
    } catch (error) {
        console.error("Lỗi khi lấy sản phẩm liên quan:", error);
        return res.status(500).json({
            success: false,
            message: "Lỗi máy chủ",
            error: error.message,
        });
    }
};

const sendNewProductNotificationToCustomers = async (product) => {
    try {
        const customers = await User.find({ role: 'user' }); // hoặc lọc theo điều kiện phù hợp

        if (customers.length === 0) return;

        const notifications = customers.map(user => ({
            user_id: user._id.toString(),
            title: 'Sản phẩm mới đã ra mắt! 🎉',
            message: `Khám phá sản phẩm mới "${product.name}" ngay hôm nay!`,
            type: 'product_new_user',
            data: {
                product_id: product._id,
                product_name: product.name,
                product_slug: product.slug,
                created_at: new Date()
            },
            is_read: false,
            created_at: new Date()
        }));

        await Notification.insertMany(notifications);
        console.log(`Đã gửi thông báo sản phẩm mới "${product.name}" cho ${customers.length} khách hàng`);
    } catch (error) {
        console.error('Lỗi khi gửi thông báo sản phẩm mới cho khách hàng:', error);
    }
};

