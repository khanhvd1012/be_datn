import Product from "../models/product_MD";
import Order from "../models/order_MD";
import OrderItem from "../models/orderItem_MD";
import User from "../models/auth_MD";

// Hàm hỗ trợ để lấy tên ngày trong tuần
function getDayOfWeek(dayIndex) {
    const days = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    return days[dayIndex];
}

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
            { $match: { $or: [{ "order.status": "delivered" }, { "order.status": "return_rejected" }, { "order.status": "return_requested" }, { "order.status": "return_accepted" }], "order.payment_status": { $in: ["paid", "unpaid"] } } },
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
            { $sort: { totalSales: -1 } }
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
            sevenDaysAgo.setDate(today.getDate() - 7); // 7 ngày trước (bao gồm cả hôm nay)
            start = new Date(sevenDaysAgo.setHours(0, 0, 0, 0));
            end = new Date(today.setHours(23, 59, 59, 999));
        }

        // --- thống kê đơn hàng theo ngày ---
        const ordersByDateAgg = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: start, $lte: end },
                },
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
                    },
                    orders: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ]);

        const ordersByDate = [];
        let currentDate = new Date(start.getTime());
        while (currentDate <= end) {
            const year = currentDate.getFullYear();
            const month = (currentDate.getMonth() + 1).toString().padStart(2, "0");
            const day = currentDate.getDate().toString().padStart(2, "0");
            const dateStr = `${year}-${month}-${day}`;
            const found = ordersByDateAgg.find((item) => item._id === dateStr);
            ordersByDate.push({ date: dateStr, orders: found ? found.orders : 0 });
        
            currentDate.setDate(currentDate.getDate() + 1); // ✅ dùng đúng biến
        }

        // --- doanh thu theo ngày (tính delivered, return_rejected, return_requested, return_accepted, trừ khi returned_received) ---
        const revenueByDateAgg = await Order.aggregate([
            {
                $match: {
                    $or: [
                        { status: "delivered", delivered_at: { $gte: start, $lte: end } },
                        { status: "return_rejected", return_rejected_at: { $gte: start, $lte: end } },
                        { status: "return_requested", return_requested_at: { $gte: start, $lte: end } },
                        { status: "return_accepted", return_accepted_at: { $gte: start, $lte: end } }
                    ],
                    payment_status: { $in: ["paid", "unpaid"] }
                },
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: { 
                            $ifNull: ["$delivered_at", "$return_rejected_at", "$return_requested_at", "$return_accepted_at"] 
                        } }
                    },
                    revenue: { $sum: { $subtract: ["$sub_total", "$voucher_discount"] } },
                    orderCount: { $sum: 1 }
                },
            },
            { $sort: { _id: 1 } },
        ]);

        // --- trừ doanh thu khi trạng thái là returned_received theo ngày ---
        const refundByDateAgg = await Order.aggregate([
            {
                $match: {
                    status: "returned_received",
                    return_received_at: { $gte: start, $lte: end },
                    payment_status: { $in: ["refunded", "unpaid"] }
                },
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$return_received_at" }
                    },
                    refund: { $sum: { $subtract: ["$sub_total", "$voucher_discount"] } },
                    refundCount: { $sum: 1 }
                },
            },
            { $sort: { _id: 1 } },
        ]);

        // Tạo bảng doanh thu theo ngày
        const dailyRevenue = [];
        let cur = new Date(start.getTime());
        while (cur <= end) {
            const year = cur.getFullYear();
            const month = (cur.getMonth() + 1).toString().padStart(2, "0");
            const day = cur.getDate().toString().padStart(2, "0");
            const dateStr = `${year}-${month}-${day}`;
            const formattedDate = `${day}/${month}/${year}`; // Định dạng ngày dd/mm/yyyy

            const revenueItem = revenueByDateAgg.find((item) => item._id === dateStr);
            const refundItem = refundByDateAgg.find((item) => item._id === dateStr);

            dailyRevenue.push({
                date: formattedDate,
                dayOfWeek: getDayOfWeek(cur.getDay()),
                revenue: revenueItem ? revenueItem.revenue : 0,
                refund: refundItem ? refundItem.refund : 0,
                netRevenue: (revenueItem ? revenueItem.revenue : 0) - (refundItem ? refundItem.refund : 0),
                orderCount: revenueItem ? revenueItem.orderCount : 0,
                refundCount: refundItem ? refundItem.refundCount : 0
            });

            cur.setDate(cur.getDate() + 1);
        }

        // Tính tổng doanh thu, hoàn lại, và net revenue
        const totalRevenue = dailyRevenue.reduce((sum, day) => sum + day.revenue, 0);
        const totalRefund = dailyRevenue.reduce((sum, day) => sum + day.refund, 0);
        const totalNetRevenue = dailyRevenue.reduce((sum, day) => sum + day.netRevenue, 0);

        // --- doanh thu theo khoảng ngày (tổng hợp) ---
        const revenueAgg = await Order.aggregate([
            {
                $match: {
                    $or: [
                        { status: "delivered", delivered_at: { $gte: start, $lte: end } },
                        { status: "return_rejected", return_rejected_at: { $gte: start, $lte: end } },
                        { status: "return_requested", return_requested_at: { $gte: start, $lte: end } },
                        { status: "return_accepted", return_accepted_at: { $gte: start, $lte: end } }
                    ],
                    payment_status: { $in: ["paid", "unpaid"] }
                },
            },
            {
                $group: {
                    _id: null,
                    revenue: { $sum: { $subtract: ["$sub_total", "$voucher_discount"] } },
                },
            },
        ]);

        // --- trừ doanh thu khi trạng thái là returned_received (tổng hợp) ---
        const refundAgg = await Order.aggregate([
            {
                $match: {
                    status: "returned_received",
                    return_received_at: { $gte: start, $lte: end },
                    payment_status: { $in: ["refunded", "unpaid"] }
                },
            },
            {
                $group: {
                    _id: null,
                    refund: { $sum: { $subtract: ["$sub_total", "$voucher_discount"] } },
                },
            },
        ]);

        let { startYear, endYear } = req.query;
        const currentYear = new Date().getFullYear();

        if (!startYear || !endYear) {
            endYear = currentYear;
            startYear = endYear - 4;
        } else {
            startYear = parseInt(startYear, 10);
            endYear = parseInt(endYear, 10);
        }

        // --- doanh thu theo năm (tính delivered, return_rejected, return_requested, return_accepted, trừ khi returned_received) ---
        const revenueByYearAgg = await Order.aggregate([
            {
                $match: {
                    $or: [
                        { status: "delivered", delivered_at: { $gte: new Date(`${startYear}-01-01`), $lte: new Date(`${endYear}-12-31`) } },
                        { status: "return_rejected", return_rejected_at: { $gte: new Date(`${startYear}-01-01`), $lte: new Date(`${endYear}-12-31`) } },
                        { status: "return_requested", return_requested_at: { $gte: new Date(`${startYear}-01-01`), $lte: new Date(`${endYear}-12-31`) } },
                        { status: "return_accepted", return_accepted_at: { $gte: new Date(`${startYear}-01-01`), $lte: new Date(`${endYear}-12-31`) } }
                    ],
                    payment_status: { $in: ["paid", "unpaid"] }
                },
            },
            {
                $group: {
                    _id: { $year: { $ifNull: ["$delivered_at", "$return_rejected_at", "$return_requested_at", "$return_accepted_at"] } },
                    revenue: { $sum: { $subtract: ["$sub_total", "$voucher_discount"] } },
                },
            },
            { $sort: { _id: 1 } },
            {
                $project: {
                    year: "$_id",
                    revenue: 1,
                    _id: 0,
                },
            },
        ]);

        // --- trừ doanh thu theo năm khi trạng thái là returned_received ---
        const refundByYearAgg = await Order.aggregate([
            {
                $match: {
                    status: "returned_received",
                    return_received_at: { $gte: new Date(`${startYear}-01-01`), $lte: new Date(`${endYear}-12-31`) },
                    payment_status: { $in: ["refunded", "unpaid"] }
                },
            },
            {
                $group: {
                    _id: { $year: "$return_received_at" },
                    refund: { $sum: { $subtract: ["$sub_total", "$voucher_discount"] } },
                },
            },
            { $sort: { _id: 1 } },
            {
                $project: {
                    year: "$_id",
                    refund: 1,
                    _id: 0,
                },
            },
        ]);

        const years = Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i);
        const revenueByYear = years.map((year) => {
            const revenueItem = revenueByYearAgg.find((item) => item.year === year) || { year, revenue: 0 };
            const refundItem = refundByYearAgg.find((item) => item.year === year) || { year, refund: 0 };
            return {
                year: revenueItem.year,
                revenue: revenueItem.revenue - refundItem.refund
            };
        });

        const revenue = (revenueAgg[0]?.revenue || 0) - (refundAgg[0]?.refund || 0);

        res.json({
            success: true,
            data: {
                totalProducts,
                productsByCategory,
                topProducts,
                totalOrders,
                totalUsers,
                ordersByDate,
                dailyRevenue,
                revenue,
                revenueByYear,
                summary: {
                    totalRevenue,
                    totalRefund,
                    totalNetRevenue
                }
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