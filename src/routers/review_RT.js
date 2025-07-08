import { Router } from "express"
import { createReview, updateReview, deleteReview, getProductReviews, adminReplyReview, getAllReviews, } from "../controllers/review_CLT"
import { validateReview } from "../validators/review_VLD"
import authMiddleware from "../middleware/auth_MID"

const reviewRouter = Router()

reviewRouter.get("/:product_id", getProductReviews)
reviewRouter.get("/", getAllReviews)
reviewRouter.post("/", authMiddleware, validateReview, createReview)

// Sửa lại: PUT dùng để update, không cần truyền product_id qua params, chỉ cần truyền qua body khi cần
reviewRouter.post("/:id", authMiddleware, adminReplyReview)
reviewRouter.put("/:id", authMiddleware, validateReview, updateReview)
reviewRouter.delete("/:id", authMiddleware, deleteReview)

export default reviewRouter