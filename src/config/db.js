import mongoose from "mongoose";

let isConnected = false;
let listenersAttached = false;

export default async function connectDB(dbUrl) {
    try {
        if (!dbUrl) {
            throw new Error('MongoDB connection URL is not provided');
        }

        // Tránh kết nối lại nếu đã kết nối rồi
        if (isConnected) {
            return;
        }

        await mongoose.connect(dbUrl, {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });

        isConnected = true;

        // Gắn listener chỉ một lần duy nhất
        if (!listenersAttached) {
            mongoose.connection.on('error', (err) => {
                console.error('MongoDB connection error:', err);
            });

            mongoose.connection.on('disconnected', () => {
                console.warn('MongoDB disconnected');
            });

            listenersAttached = true;
        }

        console.log("MongoDB connected successfully");
    } catch (error) {
        console.error("MongoDB connection failed:", error);
        throw error;
    }
}
