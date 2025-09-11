import Product from "../models/product_MD";
import Order from "../models/order_MD";
import OrderItem from "../models/orderItem_MD";
import User from "../models/auth_MD";

export const getDashboardStats = async (req, res) => {
    try {
        const [totalProducts, totalOrders, totalUsers] = await Promise.all([
            Product.countDocuments(),
            Order.countDocuments(),
            User.countDocuments()
        ]);

        const productsByCategory = await Product.aggregate([
            {
                $group: {
                    _id: "$category",
                    count: { $sum: 1 }
                }
            },
            {
                $lookup: {
                    from: "categories",
                    localField: "_id",
                    foreignField: "_id",
                    as: "category"
                }
            },
            {
                $unwind: {
                    path: "$category",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $project: {
                    _id: 0,
                    categoryId: "$category._id",
                    categoryName: "$category.name",
                    count: 1
                }
            }
        ]);

        const topProducts = await OrderItem.aggregate([
            {
                $lookup: {
                    from: "orders",
                    localField: "order_id",
                    foreignField: "_id",
                    as: "order"
                }
            },
            { $unwind: "$order" },
            { $match: { "order.status": "delivered" } },
            {
                $group: {
                    _id: "$variant_id", // group theo variant
                    totalSales: { $sum: "$quantity" },
                    totalRevenue: { $sum: { $multiply: ["$quantity", "$price"] } },
                    product_id: { $first: "$product_id" } // lưu lại product_id
                }
            },
            {
                $lookup: {
                    from: "products",
                    localField: "product_id",   // dùng product_id để join sang products
                    foreignField: "_id",
                    as: "product"
                }
            },
            { $unwind: "$product" },
            {
                $lookup: {
                    from: "variants",
                    localField: "_id",          // _id lúc này là variant_id
                    foreignField: "_id",
                    as: "variant"
                }
            },
            { $unwind: "$variant" },
            {
                $project: {
                    variantId: "$_id",
                    name: "$product.name",
                    sku: "$variant.sku",
                    totalSales: 1,
                    totalRevenue: 1
                }
            },
            { $sort: { totalSales: -1 } },
            { $limit: 5 }
        ]);

        let { startDate, endDate } = req.query;
        let start, end;
        if (startDate && endDate) {
            start = new Date(startDate);
            end = new Date(endDate);
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
        } else {
            const today = new Date();
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(today.getDate() - 6);
            start = new Date(sevenDaysAgo.setHours(0, 0, 0, 0));
            end = new Date(today.setHours(23, 59, 59, 999));
        }

        const ordersByDateAgg = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: start, $lte: end }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
                    },
                    orders: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Tạo mảng ngày liên tục
        const ordersByDate = [];
        let cur = new Date(start.getTime());
        while (cur <= end) {
            const year = cur.getFullYear();
            const month = (cur.getMonth() + 1).toString().padStart(2, "0");
            const day = cur.getDate().toString().padStart(2, "0");
            const dateStr = `${year}-${month}-${day}`;
            const found = ordersByDateAgg.find((item) => item._id === dateStr);
            ordersByDate.push({ date: dateStr, orders: found ? found.orders : 0 });
            cur.setDate(cur.getDate() + 1);
        }

        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        const monthlyRevenueAgg = await Order.aggregate([
            {
                $match: {
                    status: "delivered",
                    delivered_at: { $gte: firstDay, $lte: lastDay } 
                }
            },
            {
                $group: {
                    _id: null,
                    revenue: { $sum: "$total_price" } // tổng tiền của các đơn đã giao
                }
            }
        ]);

        const monthlyRevenue = monthlyRevenueAgg[0]?.revenue || 0;


        res.json({
            success: true,
            data: {
                totalProducts,
                productsByCategory,
                topProducts,
                totalOrders,
                totalUsers,
                ordersByDate,
                monthlyRevenue
            }
        });
    } catch (error) {
        console.error("Dashboard statistics error:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching dashboard statistics",
            error: error.message
        });
    }
};
