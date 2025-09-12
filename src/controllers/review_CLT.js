import review_MD from "../models/review_MD"
import Order from "../models/order_MD.js"
import orderItem_MD from "../models/orderItem_MD.js";

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
            })
            .populate({
                path: "product_variant_id",
                select: "color",
                populate: {
                    path: "size",
                    select: "size"
                }
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

// Lấy tất cả đánh giá của chính user hiện tại
export const getMyReviews = async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const skip = (page - 1) * limit;

        const reviews = await review_MD.find({ user_id: req.user._id })
            .populate({
                path: "order_item",
                populate: [
                    {
                        path: "order_id",
                        select: "status"
                    },
                    {
                        path: "product_id",
                        select: "name"
                    },
                    {
                        path: "variant_id",
                        select: "color",
                        populate: {
                            path: "size",
                            select: "size"
                        }
                    }
                ]
            })
            .populate({
                path: "product_id",
                select: "name"
            })
            .populate({
                path: "product_variant_id",
                select: "color",
                populate: {
                    path: "size",
                    select: "size"
                }
            })
            .skip(skip)
            .limit(Number(limit))
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            reviews
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Lỗi khi lấy đánh giá của chính bạn",
            error: error.message
        });
    }
};


// lấy tất cả đánh giá
export const getAllReviews = async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const skip = (page - 1) * limit;
        const reviews = await review_MD.find()
            .populate({
                path: "user_id",
                select: "username email image"
            })
            .populate({
                path: "order_item",
                populate: [
                    {
                        path: "order_id",
                        select: "status"
                    },
                    {
                        path: "product_id",
                        select: "name"
                    },
                    {
                        path: "variant_id",
                        select: "color",
                        populate: {
                            path: "size",
                            select: "size"
                        }
                    }
                ]
            })
            .populate({
                path: "product_id",
                select: "name"
            })
            .populate({
                path: "product_variant_id",
                select: "color",
                populate: {
                    path: "size",
                    select: "size"
                }
            })
            .skip(skip)
            .limit(Number(limit))
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            reviews
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Lỗi khi lấy danh sách đánh giá",
            error: error.message
        });
    }
};

const deleteUploadedImages = (filesOrUrls = []) => {
    filesOrUrls.forEach(item => {
        let filename = '';
        if (typeof item === 'string') {
            filename = item.split('/uploads/')[1];
        } else if (item?.filename) {
            filename = item.filename;
        }
        const filePath = path.join(__dirname, '../../public/uploads', filename);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    });
};

// tạo đánh giá sản phẩm
export const createReview = async (req, res) => {
    try {
        const { product_id, product_variant_id, rating, comment, order_id } = req.body;

        // Kiểm tra đơn hàng đã giao thành công chứa sản phẩm này
        const deliveredOrder = await Order.findOne({
            _id: order_id,
            user_id: req.user._id,
            status: "delivered"
        });

        if (!deliveredOrder) {
            return res.status(400).json({
                success: false,
                message: "Bạn chưa mua sản phẩm này hoặc đơn hàng chưa được giao thành công"
            });
        }

        // Tìm order_item tương ứng với sản phẩm và biến thể trong đơn hàng đã giao
        const orderItem = await orderItem_MD.findOne({
            order_id: deliveredOrder._id,
            product_id: product_id,
            variant_id: product_variant_id
        });

        if (!orderItem) {
            return res.status(400).json({
                success: false,
                message: "Không tìm thấy thông tin đơn hàng cho sản phẩm và biến thể này"
            });
        }

        // Kiểm tra đã đánh giá order_item này chưa (dựa trên cả product_id và product_variant_id)
        const existedReview = await review_MD.findOne({
            user_id: req.user._id,
            product_id,
            product_variant_id,
            order_item: orderItem._id
        });

        if (existedReview) {
            return res.status(400).json({
                success: false,
                message: "Bạn đã đánh giá cho lượt mua biến thể này rồi"
            });
        }

        let imageUrls = [];
        if (req.files && req.files.length > 0) {
            const baseUrl = process.env.BASE_URL || "http://localhost:3000";
            imageUrls = req.files.map(file => `${baseUrl}/uploads/${file.filename}`);
        }

        const review = await review_MD.create({
            user_id: req.user._id,
            product_id,
            product_variant_id,
            rating,
            comment,
            order_item: orderItem._id,
            images: imageUrls
        });

        return res.status(201).json({
            success: true,
            review,
        });
    } catch (error) {
        if (req.files && req.files.length > 0) {
            deleteUploadedImages(req.files);
        }
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
        // Tìm review hiện tại theo id + user_id
        const currentReview = await review_MD.findOne({
            _id: req.params.id,
            user_id: req.user._id
        });

        if (!currentReview) {
            return res.status(404).json({
                success: false,
                message: "Đánh giá sản phẩm không tồn tại"
            });
        }

        let imageUrls = [...(currentReview.images || [])];

        // Chuẩn hóa existingImages từ client
        let existingImages = [];
        if (req.body.existingImages) {
            if (typeof req.body.existingImages === "string") {
                existingImages = req.body.existingImages.split(",");
            } else if (Array.isArray(req.body.existingImages)) {
                existingImages = req.body.existingImages;
            }

            // Giữ lại ảnh client yêu cầu
            const removedImages = imageUrls.filter(oldUrl => !existingImages.includes(oldUrl));
            if (removedImages.length > 0) {
                deleteUploadedImages(removedImages); // xoá file cũ
            }

            imageUrls = existingImages;
        }

        // Nếu có ảnh mới, thêm vào
        if (req.files && req.files.length > 0) {
            const baseUrl = process.env.BASE_URL || "http://localhost:3000";
            const newImages = req.files.map(file => `${baseUrl}/uploads/${file.filename}`);
            imageUrls = [...imageUrls, ...newImages];
        }

        req.body.images = imageUrls;
        delete req.body.existingImages;

        const updatedReview = await review_MD.findByIdAndUpdate(
            currentReview._id,
            req.body,
            { new: true }
        );

        return res.status(200).json({
            success: true,
            review: updatedReview
        });
    } catch (error) {
        if (req.files && req.files.length > 0) {
            deleteUploadedImages(req.files);
        }
        return res.status(500).json({
            success: false,
            message: "Lỗi khi cập nhật đánh giá sản phẩm",
            error: error.message
        });
    }
};

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