import mongoose from 'mongoose';

/**
 * Class AppError - Lớp xử lý lỗi tùy chỉnh cho ứng dụng
 * @description
 * - Kế thừa từ lớp Error mặc định
 * - Thêm các thuộc tính bổ sung như statusCode, errors, status
 * - Phân biệt lỗi client (4xx) và lỗi server (5xx)
 * - Hỗ trợ capture stack trace để debug
 */
export class AppError extends Error {
    constructor(message, statusCode = 500, errors = []) {
        super(message);
        this.statusCode = statusCode;
        this.errors = errors;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Hàm xử lý các loại lỗi từ Mongoose
 * @description
 * Xử lý 3 loại lỗi chính:
 * 1. ValidationError: Lỗi validate dữ liệu (required, enum, etc.)
 * 2. DuplicateKey (11000): Lỗi trùng lặp unique key
 * 3. CastError: Lỗi không đúng định dạng (ObjectId, Date, etc.)
 */
const handleMongooseError = (err) => {
    if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map(error => ({
            field: error.path,
            message: error.message
        }));
        return new AppError('Dữ liệu không hợp lệ', 400, errors);
    }

    if (err.code === 11000) {
        const field = Object.keys(err.keyPattern)[0];
        return new AppError(
            `Giá trị trường ${field} đã tồn tại`,
            400,
            [{
                field,
                message: `Giá trị này đã được sử dụng`
            }]
        );
    }

    if (err.name === 'CastError') {
        return new AppError(
            `Giá trị không hợp lệ cho trường ${err.path}`,
            400,
            [{
                field: err.path,
                message: 'Giá trị không hợp lệ'
            }]
        );
    }

    return err;
};

/**
 * Hàm xử lý các loại lỗi từ JWT
 * @description
 * Xử lý 2 loại lỗi chính:
 * 1. JsonWebTokenError: Token không hợp lệ (sai format, bị sửa đổi)
 * 2. TokenExpiredError: Token hết hạn
 */
const handleJWTError = (err) => {
    if (err.name === 'JsonWebTokenError') {
        return new AppError('Token không hợp lệ', 401);
    }
    if (err.name === 'TokenExpiredError') {
        return new AppError('Token đã hết hạn', 401);
    }
    return err;
};

/**
 * Middleware xử lý lỗi chính của ứng dụng
 * @description
 * Quy trình xử lý:
 * 1. Log lỗi để debug
 * 2. Phân loại và xử lý các loại lỗi cụ thể (Mongoose, JWT)
 * 3. Trả về response với format thống nhất:
 *    - status: trạng thái lỗi (fail/error)
 *    - message: thông báo lỗi
 *    - errors: chi tiết lỗi (chỉ trong môi trường development)
 */
export const errorHandler = (err, req, res, next) => {
    console.error('Error:', {
        name: err.name,
        message: err.message,
        stack: err.stack,
        errors: err.errors
    });

    // Xử lý các loại lỗi cụ thể
    let error = err;
    if (err instanceof mongoose.Error || err.name === 'MongoError') {
        error = handleMongooseError(err);
    }
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        error = handleJWTError(err);
    }

    // Nếu là lỗi đã được xử lý (AppError)
    if (error instanceof AppError) {
        return res.status(error.statusCode).json({
            status: error.status,
            message: error.message,
            errors: error.errors
        });
    }

    // Lỗi không xác định
    return res.status(500).json({
        status: 'error',
        message: 'Đã xảy ra lỗi không mong muốn',
        errors: process.env.NODE_ENV === 'development' ? [error.message] : []
    });
}; 