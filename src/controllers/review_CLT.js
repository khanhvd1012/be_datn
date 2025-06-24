import review_MD from "../models/review_MD"

// lấy đánh giá sản phẩm
export const getProductReviews = async (req, res) => {
    try {
        const reviews = await review_MD.find({ product_id: req.params.product_id })
        return res.status(200).json({
            success: true,
            reviews
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
        const { user_id, product_id, rating, comment } = req.body
        const reviews = await review_MD.create({
            user_id: req.user._id,
            product_id,
            rating,
            comment
        })

        return res.status(201).json({
            success: true,
            reviews
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