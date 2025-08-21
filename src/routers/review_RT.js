import { Router } from "express"
import { createReview, updateReview, deleteReview, getProductReviews, adminReplyReview, getAllReviews, getMyReviews, } from "../controllers/review_CLT"
import { validateReview } from "../validators/review_VLD"
import authMiddleware from "../middleware/auth_MID"
import checkRole from "../middleware/checkRole_MID"
import { ROLES } from "../config/roles"

const reviewRouter = Router()

reviewRouter.get("/user", authMiddleware, getMyReviews)
reviewRouter.get("/:product_id", getProductReviews)

reviewRouter.post("/", authMiddleware, validateReview, createReview)
reviewRouter.get("/", getAllReviews)

// Sửa lại: PUT dùng để update, không cần truyền product_id qua params, chỉ cần truyền qua body khi cần
reviewRouter.post("/:id", authMiddleware, adminReplyReview)
reviewRouter.put("/:id", authMiddleware, validateReview, updateReview)
reviewRouter.delete("/:id", authMiddleware, deleteReview)


export default reviewRouter