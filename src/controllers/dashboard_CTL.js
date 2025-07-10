import Product from "../models/product_MD";
import Order from "../models/order_MD";
import OrderItem from "../models/orderItem_MD";
import User from "../models/auth_MD";
import mongoose from "mongoose";

// Get dashboard statistics
export const getDashboardStats = async (req, res) => {
    try {
        // Get total products
        const totalProducts = await Product.countDocuments();

        // Get total products by category
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
            }
        ]);

        // Get top selling products (dựa vào OrderItem)
        const topProducts = await OrderItem.aggregate([
            {
                $group: {
                    _id: "$product_id",
                    totalSales: { $sum: "$quantity" },
                    totalRevenue: { $sum: { $multiply: ["$quantity", "$price"] } }
                }
            },
            {
                $lookup: {
                    from: "products",
                    localField: "_id",
                    foreignField: "_id",
                    as: "product"
                }
            },
            { $unwind: "$product" },
            {
                $project: {
                    _id: 1,
                    name: "$product.name",
                    totalSales: 1,
                    totalRevenue: 1
                }
            },
            { $sort: { totalSales: -1 } },
            { $limit: 5 }
        ]);

        // Lấy tổng số đơn hàng thực tế
        const totalOrders = await Order.countDocuments();

        // Lấy tổng số người dùng thực tế
        const totalUsers = await User.countDocuments();

        // Lấy số lượng đơn hàng theo ngày (theo khoảng ngày truyền vào)
        let { startDate, endDate } = req.query;
        let start, end;
        if (startDate && endDate) {
            start = new Date(startDate);
            end = new Date(endDate);
            start.setHours(0,0,0,0);
            end.setHours(23,59,59,999);
        } else {
            // Mặc định lấy 7 ngày gần nhất
            const today = new Date();
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(today.getDate() - 6);
            start = new Date(sevenDaysAgo.setHours(0,0,0,0));
            end = new Date(today.setHours(23,59,59,999));
        }
        const ordersByDateAgg = await Order.aggregate([
            {
                $match: {
                    createdAt: {
                        $gte: start,
                        $lte: end
                    }
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
        // Tạo mảng ngày liên tục trong khoảng
        const ordersByDate = [];
        let cur = new Date(start.getTime()); // clone để không thay đổi biến start
        while (cur <= end) {
            // Lấy ngày local dạng yyyy-mm-dd
            const year = cur.getFullYear();
            const month = (cur.getMonth() + 1).toString().padStart(2, '0');
            const day = cur.getDate().toString().padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;
            const found = ordersByDateAgg.find(item => item._id === dateStr);
            ordersByDate.push({ date: dateStr, orders: found ? found.orders : 0 });
            cur.setDate(cur.getDate() + 1);
        }

        // Dữ liệu ảo cho doanh thu tháng
        const mockOrders = {
            monthlyRevenue: 125000000
        };

        res.json({
            success: true,
            data: {
                totalProducts,
                productsByCategory,
                topProducts,
                totalOrders,
                totalUsers,
                ordersByDate,
                ...mockOrders
            }
        });

    } catch (error) {
        console.error('Dashboard statistics error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching dashboard statistics',
            error: error.message
        });
    }
};
