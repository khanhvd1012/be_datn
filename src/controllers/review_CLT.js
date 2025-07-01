import review_MD from "../models/review_MD"
import Order from "../models/order_MD.js"
import orderItem_MD from "../models/orderItem_MD.js";


export const getAllReviews = async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const skip = (page - 1) * limit;

        const reviews = await review_MD.find()
            .populate({ path: "user_id", select: "username image" })
            .populate({
                path: "order_item",
                populate: {
                    path: "variant_id",
                    select: "color",
                    populate: { path: "size", select: "size" }
                }
            })
            .skip(skip)
            .limit(Number(limit))
            .sort({ createdAt: -1 });

        const total = await review_MD.countDocuments();

        return res.status(200).json({
            success: true,
            data: reviews,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Lỗi khi lấy danh sách đánh giá",
            error: error.message
        });
    }
};

// lấy đánh giá sản phẩm
export const getProductReviews = async (req, res) => {
    try {
        // Lấy tất cả review của sản phẩm, populate user, order_item, variant, size
        const reviews = await review_MD.find({
            product_id: req.params.product_id
        })
            .populate({
                path: "user_id",
                select: "username image"
            });
        // Gắn purchasedOrders vào từng review theo user_id
        const reviewsWithOrders = await Promise.all(
            reviews.map(async (review) => {
                let purchasedOrders = [];
                // Lấy order_item liên quan đến user, sản phẩm này và đơn hàng đã giao thành công
                if (review.user_id && review.user_id._id && review.product_id) {
                    // Tìm các đơn hàng đã giao thành công của user này với sản phẩm này
                    const deliveredOrders = await Order.find({
                        user_id: review.user_id._id,
                        status: "delivered"
                    }).select("_id");

                    const deliveredOrderIds = deliveredOrders.map(o => o._id);

                    // Tìm các order_item thuộc các đơn hàng đã giao thành công và đúng product_id
                    purchasedOrders = await orderItem_MD.find({
                        order_id: { $in: deliveredOrderIds },
                        //
                        product_id: review.product_id
                    })
                    .populate({
                        path: "order_id",
                        select: "status"
                    })
                    .populate({
                        path: "product_id",
                        select: "name"
                    })
                    .populate({
                        path: "variant_id",
                        select: "color",
                        populate: {
                            path: "size",
                            select: "size"
                        }
                    });
                }
                const reviewObj = review.toObject ? review.toObject() : review;
                return {
                    ...reviewObj,
                    purchasedOrders
                };
            })
        );

        return res.status(200).json({
            success: true,
            reviews: reviewsWithOrders
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "lỗi khi đánh giá sản phẩm",
            error: error.message
        })
    }
}

// tạo đánh giá sản phẩm
export const createReview = async (req, res) => {
    try {
        const { product_id, rating, comment } = req.body

        // Kiểm tra đơn hàng đã giao thành công chứa sản phẩm này
        const deliveredOrder = await Order.findOne({
            user_id: req.user._id,
            status: "delivered"
        });

        if (!deliveredOrder) {
            return res.status(400).json({
                success: false,
                message: "Bạn chưa mua sản phẩm này hoặc đơn hàng chưa được giao thành công"
            });
        }

        // Tìm order_item tương ứng với sản phẩm trong đơn hàng đã giao
        // deliveredOrder.products có thể undefined nếu không có trường này trong schema
        // => phải lấy từ OrderItem collection
        const orderItem = await orderItem_MD.findOne({
            order_id: deliveredOrder._id,
            product_id: product_id
        });

        // Nếu không tìm thấy order_item, trả về lỗi
        if (!orderItem) {
            return res.status(400).json({
                success: false,
                message: "Không tìm thấy thông tin đơn hàng cho sản phẩm này"
            });
        }

        const review = await review_MD.create({
            user_id: req.user._id,
            product_id,
            rating,
            comment,
            order_item: orderItem._id // Lưu order_item vào review
        })

        // Lấy các đơn hàng mà user đã mua sản phẩm này (có thể chỉ lấy đơn hàng đã giao thành công)
        const orders = await Order.find({
            user_id: req.user._id,
            status: "delivered"
        });

        return res.status(201).json({
            success: true,
            review,
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "lỗi khi đánh giá sản phẩm",
            error: error.message
        })
    }
}

// cập nhật đánh giá sản phẩm
export const updateReview = async (req, res) => {
    try {
        const review = await review_MD.findByIdAndUpdate({
            _id: req.params.id,
            user_id: req.user._id
        }, req.body, { new: true })

        if (!review) {
            return res.status(404).json({
                success: false,
                message: "đánh giá sản phẩm không tồn tại"
            })
        }

        return res.status(200).json({
            success: true,
            review
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "lỗi khi cập nhật đánh giá sản phẩm",
            error: error.message
        })
    }
}

// xóa đánh giá sản phẩm
export const deleteReview = async (req, res) => {
    try {
        const review = await review_MD.findByIdAndDelete({
            _id: req.params.id,
            user_id: req.user._id
        })
        if (!review) {
            return res.status(404).json({
                success: false,
                message: "đánh giá sản phẩm không tồn tại"
            })
        }
        return res.status(200).json({
            success: true,
            message: "đánh giá sản phẩm đã được xóa"
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "lỗi khi xóa đánh giá sản phẩm",
            error: error.message
        })
    }
}

// Admin phản hồi bình luận
export const adminReplyReview = async (req, res) => {
    try {
        // Kiểm tra quyền admin
        if (!req.user || req.user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Chỉ admin mới được phép phản hồi bình luận."
            });
        }

        const { reply } = req.body;
        const review = await review_MD.findByIdAndUpdate(
            req.params.id,
            { admin_reply: reply },
            { new: true }
        );

        if (!review) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy bình luận để phản hồi."
            });
        }

        return res.status(200).json({
            success: true,
            review
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Lỗi khi phản hồi bình luận",
            error: error.message
        });
    }
}