import express from "express"
import { getProductReviews, createReview, updateReview, deleteReview } from "../controllers/review_CLT"

const reviewRouter = express.Router()

reviewRouter.get("/:product_id", getProductReviews)
reviewRouter.post("/", createReview)
reviewRouter.put("/:id", updateReview)
reviewRouter.delete("/:id", deleteReview)

export default reviewRouter