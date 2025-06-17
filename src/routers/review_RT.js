import { Router } from "express"
import { getProductReviews, createReview, updateReview, deleteReview } from "../controllers/review_CLT"
import { validateReview } from "../validators/review_VLD"
import authMiddleware from "../middleware/auth_MID"

const reviewRouter = Router()

// Public routes
reviewRouter.get("/:product_id", getProductReviews)

// Protected routes (require authentication)
reviewRouter.post("/", authMiddleware, validateReview, createReview)
reviewRouter.put("/:id", authMiddleware, validateReview, updateReview)
reviewRouter.delete("/:id", authMiddleware, deleteReview)

export default reviewRouter