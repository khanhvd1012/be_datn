import Product from "../models/product_MD";
import Order from "../models/order_MD";
import OrderItem from "../models/orderItem_MD";
import User from "../models/auth_MD";
import dayjs from "dayjs";

export const getDashboardStats = async (req, res) => {
    try {
        const [totalProducts, totalOrders, totalUsers, deliveredPaidOrders] = await Promise.all([
            Product.countDocuments(),
            Order.countDocuments(),
            User.countDocuments(),
            Order.countDocuments({ status: "delivered", payment_status: "paid" })
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

        // Top products - chỉ tính những đơn đã thanh toán thực tế
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
            {
                $match: {
                    "order.status": { $in: ["delivered", "return_rejected"] },
                    "order.payment_status": "paid"
                }
            },
            {
                $group: {
                    _id: "$variant_id",
                    totalSales: { $sum: "$quantity" },
                    totalRevenue: { $sum: { $multiply: ["$quantity", "$price"] } },
                    product_id: { $first: "$product_id" }
                }
            },
            {
                $lookup: {
                    from: "products",
                    localField: "product_id",
                    foreignField: "_id",
                    as: "product"
                }
            },
            { $unwind: "$product" },
            {
                $lookup: {
                    from: "variants",
                    localField: "_id",
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
            sevenDaysAgo.setDate(today.getDate() - 6);
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

        // ===== DOANH THU KÉP: NGÀY ĐẶT + THỰC TẾ =====

        // 1. DOANH THU THEO NGÀY ĐẶT (Order Date Revenue)
        const revenueByOrderDateAgg = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: start, $lte: end },
                    status: { $nin: ["canceled"] }
                }
            },
            {
                $addFields: {
                    orderAmount: { $subtract: ["$sub_total", "$voucher_discount"] },
                    revenueMultiplier: {
                        $cond: {
                            if: { $in: ["$status", ["returned_received", "returned"]] },
                            then: -1,
                            else: 1
                        }
                    }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
                    },
                    revenue: {
                        $sum: {
                            $multiply: ["$orderAmount", "$revenueMultiplier"]
                        }
                    }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // 2. DOANH THU THỰC TẾ (Actual Revenue)
        const actualRevenueByDateAgg = await Order.aggregate([
            {
                $match: {
                    $or: [
                        {
                            payment_method: "COD",
                            payment_status: "paid",
                            payment_date: { $gte: start, $lte: end }
                        },
                        {
                            payment_method: "ZALOPAY",
                            payment_status: "paid",
                            createdAt: { $gte: start, $lte: end }
                        },
                        {
                            payment_method: "ZALOPAY",
                            status: { $in: ["returned_received", "returned"] },
                            returned_received_at: { $gte: start, $lte: end }
                        }
                    ]
                }
            },
            {
                $addFields: {
                    revenueDate: {
                        $cond: {
                            if: { $eq: ["$payment_method", "COD"] },
                            then: "$payment_date",
                            else: {
                                $cond: {
                                    if: { $in: ["$status", ["returned_received", "returned"]] },
                                    then: "$returned_received_at",
                                    else: "$createdAt"
                                }
                            }
                        }
                    },
                    orderAmount: { $subtract: ["$sub_total", "$voucher_discount"] },
                    revenueMultiplier: {
                        $cond: {
                            if: { $in: ["$status", ["returned_received", "returned"]] },
                            then: -1,
                            else: 1
                        }
                    }
                }
            },
            {
                $match: {
                    revenueDate: { $ne: null } // Ensure revenueDate is not null
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$revenueDate" }
                    },
                    actualRevenue: {
                        $sum: {
                            $multiply: ["$orderAmount", "$revenueMultiplier"]
                        }
                    }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // 3. Tổng hợp doanh thu theo ngày
        const revenueByDate = [];
        cur = new Date(start.getTime());
        while (cur <= end) {
            const year = cur.getFullYear();
            const month = (cur.getMonth() + 1).toString().padStart(2, "0");
            const day = cur.getDate().toString().padStart(2, "0");
            const dateStr = `${year}-${month}-${day}`;

            const orderDateRevenue = revenueByOrderDateAgg.find((item) => item._id === dateStr);
            const actualRevenue = actualRevenueByDateAgg.find((item) => item._id === dateStr);

            const orderRevenue = orderDateRevenue ? orderDateRevenue.revenue : 0;
            const actRevenue = actualRevenue ? actualRevenue.actualRevenue : 0;

            revenueByDate.push({
                date: dateStr,
                orderRevenue,
                actualRevenue: actRevenue,
                difference: orderRevenue - actRevenue
            });
            cur.setDate(cur.getDate() + 1);
        }

        // ===== DOANH THU TỔNG =====
        const totalOrderRevenue = revenueByOrderDateAgg.reduce((sum, item) => sum + item.revenue, 0);
        const totalActualRevenue = actualRevenueByDateAgg.reduce((sum, item) => sum + item.actualRevenue, 0);

        // ===== DOANH THU 7 NGÀY GẦN NHẤT =====
        const today7 = new Date();
        const sixDaysAgo = new Date();
        sixDaysAgo.setDate(today7.getDate() - 6);
        const start7 = new Date(sixDaysAgo.setHours(0, 0, 0, 0));
        const end7 = new Date(today7.setHours(23, 59, 59, 999));

        const revenueLast7DaysOrder = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: start7, $lte: end7 },
                    status: { $nin: ["canceled"] }
                }
            },
            {
                $addFields: {
                    orderAmount: { $subtract: ["$sub_total", "$voucher_discount"] },
                    revenueMultiplier: {
                        $cond: {
                            if: { $in: ["$status", ["returned_received", "returned"]] },
                            then: -1,
                            else: 1
                        }
                    }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
                    },
                    revenue: { $sum: { $multiply: ["$orderAmount", "$revenueMultiplier"] } }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const revenueLast7DaysActual = await Order.aggregate([
            {
                $match: {
                    $or: [
                        {
                            payment_method: "COD",
                            payment_status: "paid",
                            payment_date: { $gte: start7, $lte: end7 }
                        },
                        {
                            payment_method: "ZALOPAY",
                            payment_status: "paid",
                            createdAt: { $gte: start7, $lte: end7 }
                        },
                        {
                            payment_method: "ZALOPAY",
                            status: { $in: ["returned_received", "returned"] },
                            returned_received_at: { $gte: start7, $lte: end7 }
                        }
                    ]
                }
            },
            {
                $addFields: {
                    revenueDate: {
                        $cond: {
                            if: { $eq: ["$payment_method", "COD"] },
                            then: "$payment_date",
                            else: {
                                $cond: {
                                    if: { $in: ["$status", ["returned_received", "returned"]] },
                                    then: "$returned_received_at",
                                    else: "$createdAt"
                                }
                            }
                        }
                    },
                    orderAmount: { $subtract: ["$sub_total", "$voucher_discount"] },
                    revenueMultiplier: {
                        $cond: {
                            if: { $in: ["$status", ["returned_received", "returned"]] },
                            then: -1,
                            else: 1
                        }
                    }
                }
            },
            {
                $match: {
                    revenueDate: { $ne: null } // Ensure revenueDate is not null
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$revenueDate" }
                    },
                    actualRevenue: { $sum: { $multiply: ["$orderAmount", "$revenueMultiplier"] } }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const revenueLast7Days = [];
        let curDay = new Date(start7);
        while (curDay <= end7) {
            const y = curDay.getFullYear();
            const m = String(curDay.getMonth() + 1).padStart(2, '0');
            const d = String(curDay.getDate()).padStart(2, '0');
            const dateStr = `${y}-${m}-${d}`;

            const orderRev = revenueLast7DaysOrder.find(item => item._id === dateStr);
            const actualRev = revenueLast7DaysActual.find(item => item._id === dateStr);

            const orderRevenue = orderRev ? orderRev.revenue : 0;
            const actRevenue = actualRev ? actualRev.actualRevenue : 0;

            revenueLast7Days.push({
                date: dateStr,
                orderRevenue,
                actualRevenue: actRevenue,
                difference: orderRevenue - actRevenue
            });
            curDay.setDate(curDay.getDate() + 1);
        }

        // ========================== DOANH THU THEO NĂM ==========================
        const startYear = dayjs().subtract(4, "year").year();
        const endYear = dayjs().year();

        // 1. Doanh thu đơn hàng theo năm (orderRevenue - theo ngày đặt)
        const revenueByYearOrderAgg = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: new Date(`${startYear}-01-01`), $lte: new Date(`${endYear}-12-31`) },
                    status: { $nin: ["canceled"] }
                }
            },
            {
                $addFields: {
                    orderAmount: { $subtract: ["$sub_total", "$voucher_discount"] },
                    revenueMultiplier: {
                        $cond: { if: { $in: ["$status", ["returned_received", "returned"]] }, then: -1, else: 1 }
                    },
                    year: { $year: "$createdAt" }
                }
            },
            {
                $group: {
                    _id: "$year",
                    orderRevenue: { $sum: { $multiply: ["$orderAmount", "$revenueMultiplier"] } }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // 2. Doanh thu thực tế theo năm (actualRevenue)
        const revenueByYearActualAgg = await Order.aggregate([
            {
                $match: {
                    $or: [
                        {
                            payment_method: "COD",
                            payment_status: "paid",
                            payment_date: { $gte: new Date(`${startYear}-01-01`), $lte: new Date(`${endYear}-12-31`) }
                        },
                        {
                            payment_method: "ZALOPAY",
                            payment_status: "paid",
                            createdAt: { $gte: new Date(`${startYear}-01-01`), $lte: new Date(`${endYear}-12-31`) }
                        },
                        {
                            payment_method: "ZALOPAY",
                            status: { $in: ["returned_received", "returned"] },
                            returned_received_at: { $gte: new Date(`${startYear}-01-01`), $lte: new Date(`${endYear}-12-31`) }
                        }
                    ]
                }
            },
            {
                $addFields: {
                    revenueDate: {
                        $cond: {
                            if: { $eq: ["$payment_method", "COD"] },
                            then: "$payment_date",
                            else: {
                                $cond: {
                                    if: { $in: ["$status", ["returned_received", "returned"]] },
                                    then: "$returned_received_at",
                                    else: "$createdAt"
                                }
                            }
                        }
                    },
                    orderAmount: { $subtract: ["$sub_total", "$voucher_discount"] },
                    revenueMultiplier: {
                        $cond: { if: { $in: ["$status", ["returned_received", "returned"]] }, then: -1, else: 1 }
                    }
                }
            },
            {
                $match: {
                    revenueDate: { $ne: null } // Ensure revenueDate is not null
                }
            },
            {
                $group: {
                    _id: { $year: "$revenueDate" },
                    actualRevenue: { $sum: { $multiply: ["$orderAmount", "$revenueMultiplier"] } }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // 3. Kết hợp kết quả thành revenueByYear đầy đủ
        const years = Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i);

        const revenueByYear = years.map((year) => {
            const orderRev = revenueByYearOrderAgg.find(item => item._id === year);
            const actualRev = revenueByYearActualAgg.find(item => item._id === year);

            const orderRevenue = orderRev ? orderRev.orderRevenue : 0;
            const actRevenue = actualRev ? actualRev.actualRevenue : 0;

            return {
                year,
                orderRevenue,
                actualRevenue: actRevenue,
                difference: orderRevenue - actRevenue
            };
        });

        // ===== DOANH THU THEO THÁNG (Dựa trên query hoặc 12 tháng gần nhất) =====
        let { startMonth, endMonth } = req.query;
        const now = new Date();
        let startMonthDate, endMonthDate;

        if (startMonth && endMonth) {
            startMonthDate = new Date(`${startMonth}-01`);
            endMonthDate = new Date(`${endMonth}-01`);
            endMonthDate.setMonth(endMonthDate.getMonth() + 1);
            endMonthDate.setDate(0);
        } else {
            startMonthDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
            endMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        }
        startMonthDate.setHours(0, 0, 0, 0);
        endMonthDate.setHours(23, 59, 59, 999);

        // 1. Doanh thu theo tháng đặt hàng (orderRevenue)
        const revenueByMonthOrderAgg = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: startMonthDate, $lte: endMonthDate },
                    status: { $nin: ["canceled"] }
                }
            },
            {
                $addFields: {
                    orderAmount: { $subtract: ["$sub_total", "$voucher_discount"] },
                    revenueMultiplier: {
                        $cond: {
                            if: { $in: ["$status", ["returned_received", "returned"]] },
                            then: -1,
                            else: 1
                        }
                    }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m", date: "$createdAt" }
                    },
                    orderRevenue: { $sum: { $multiply: ["$orderAmount", "$revenueMultiplier"] } }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // 2. Doanh thu thực tế theo tháng (actualRevenue)
        const revenueByMonthActualAgg = await Order.aggregate([
            {
                $match: {
                    $or: [
                        {
                            payment_method: "COD",
                            payment_status: "paid",
                            payment_date: { $gte: startMonthDate, $lte: endMonthDate }
                        },
                        {
                            payment_method: "ZALOPAY",
                            payment_status: "paid",
                            createdAt: { $gte: startMonthDate, $lte: endMonthDate }
                        },
                        {
                            payment_method: "ZALOPAY",
                            status: { $in: ["returned_received", "returned"] },
                            returned_received_at: { $gte: startMonthDate, $lte: endMonthDate }
                        }
                    ]
                }
            },
            {
                $addFields: {
                    revenueDate: {
                        $cond: {
                            if: { $eq: ["$payment_method", "COD"] },
                            then: "$payment_date",
                            else: {
                                $cond: {
                                    if: { $in: ["$status", ["returned_received", "returned"]] },
                                    then: "$returned_received_at",
                                    else: "$createdAt"
                                }
                            }
                        }
                    },
                    orderAmount: { $subtract: ["$sub_total", "$voucher_discount"] },
                    revenueMultiplier: {
                        $cond: {
                            if: { $in: ["$status", ["returned_received", "returned"]] },
                            then: -1,
                            else: 1
                        }
                    }
                }
            },
            {
                $match: {
                    revenueDate: { $ne: null } // Ensure revenueDate is not null
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m", date: "$revenueDate" }
                    },
                    actualRevenue: { $sum: { $multiply: ["$orderAmount", "$revenueMultiplier"] } }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // 3. Tổng hợp doanh thu theo tháng
        const revenueByMonth = [];
        let curMonth = new Date(startMonthDate);
        while (curMonth <= endMonthDate) {
            const year = curMonth.getFullYear();
            const month = (curMonth.getMonth() + 1).toString().padStart(2, "0");
            const yearMonth = `${year}-${month}`;

            const orderRev = revenueByMonthOrderAgg.find(item => item._id === yearMonth);
            const actualRev = revenueByMonthActualAgg.find(item => item._id === yearMonth);

            const orderRevenue = orderRev ? orderRev.orderRevenue : 0;
            const actRevenue = actualRev ? actualRev.actualRevenue : 0;

            revenueByMonth.push({
                yearMonth,
                orderRevenue,
                actualRevenue: actRevenue,
                difference: orderRevenue - actRevenue
            });

            curMonth.setMonth(curMonth.getMonth() + 1);
        }

        res.json({
            success: true,
            data: {
                totalProducts,
                productsByCategory,
                topProducts,
                totalOrders,
                totalUsers,
                ordersByDate,
                revenueByDate,
                totalOrderRevenue,
                totalActualRevenue,
                revenueByYear,
                revenueLast7Days,
                deliveredPaidOrders,
                revenueByMonth
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