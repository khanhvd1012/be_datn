import express from 'express';        // Framework web cho Node.js
import cors from 'cors';             // Middleware xử lý CORS
import connectDB from './src/config/db'; // Module kết nối MongoDB
import dotenv from 'dotenv';         // Quản lý biến môi trường
import router from './src/routers';
import { zaloPayCallback } from './src/controllers/order_CTL';

dotenv.config({ path: './.env' });

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('public/uploads'));
app.post("/payment/zalopay/callback", (req, res) => {
    console.log("📩 Callback nhận được:", req.body);
    res.json({ return_code: 1, return_message: "success" });
}, zaloPayCallback);

app.use('/api', router);

// Add basic health check
app.get('/', (req, res) => {
    res.json({ status: 'ok' });
});

// Start server function
const startServer = async () => {
    try {
        // Kết nối đến MongoDB
        await connectDB(process.env.MONGO_URI);
        // Lấy PORT từ biến môi trường
        const PORT = process.env.PORT;
        // Khởi động server
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    } catch (error) {
        // Xử lý lỗi khi khởi động server
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};
startServer();

export { app };