/**
 * Module kết nối MongoDB
 * @param {string} dbUrl - URL kết nối MongoDB, ví dụ: mongodb://localhost:27017/database_name
 */
import mongoose from "mongoose";

export default async function connectDB(dbUrl) {
    try {
        // Kiểm tra xem có URL kết nối không
        if (!dbUrl) {
            throw new Error('MongoDB connection URL is not provided');
        }

        // Thiết lập kết nối với các tùy chọn:
        await mongoose.connect(dbUrl, {
            maxPoolSize: 10,        // Số lượng kết nối tối đa trong pool
            serverSelectionTimeoutMS: 5000,  // Thời gian chờ kết nối tối đa (5 giây)
            socketTimeoutMS: 45000,  // Thời gian timeout cho mỗi operation (45 giây)
        });

        // Lắng nghe sự kiện lỗi kết nối
        mongoose.connection.on('error', (err) => {
            console.error('MongoDB connection error:', err);
        });

        // Lắng nghe sự kiện mất kết nối
        mongoose.connection.on('disconnected', () => {
            console.warn('MongoDB disconnected');
        });

        console.log("MongoDB connected successfully");
    } catch (error) {
        // Xử lý lỗi kết nối và ném ra ngoài để xử lý ở tầng cao hơn
        console.error("MongoDB connection failed:", error);
        throw error;
    }
}