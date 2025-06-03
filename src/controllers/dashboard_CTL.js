import Product from "../models/product_MD";
import Category from "../models/category_MD";
import Brand from "../models/brand_MD";

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

        // Get top selling products
        const topProducts = await Product.aggregate([
            {
                $lookup: {
                    from: "variants",
                    localField: "variants",
                    foreignField: "_id",
                    as: "variantDetails"
                }
            },
            {
                $project: {
                    name: 1,
                    totalSales: { $sum: "$variantDetails.sales" },
                    totalRevenue: { $sum: "$variantDetails.revenue" }
                }
            },
            { $sort: { totalSales: -1 } },
            { $limit: 5 }
        ]);

        // Mock data for orders and revenue (replace with real implementation)
        const mockOrders = {
            totalOrders: 1250,
            monthlyRevenue: 125000000,
            ordersByDate: [
                { date: '2024-05-25', orders: 45 },
                { date: '2024-05-26', orders: 52 },
                { date: '2024-05-27', orders: 38 },
                { date: '2024-05-28', orders: 65 },
                { date: '2024-05-29', orders: 48 }
            ]
        };

        // Mock data for total users (replace with real implementation)
        const mockUsers = {
            totalUsers: 350
        };

        res.json({
            success: true,
            data: {
                totalProducts,
                productsByCategory,
                topProducts,
                ...mockOrders,
                ...mockUsers
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
