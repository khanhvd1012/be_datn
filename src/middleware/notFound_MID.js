import { AppError } from './errorHandler_MID';

// Xử lý các request không tồn tại
export const notFoundHandler = (req, res, next) => {
    next(new AppError(`Không tìm thấy ${req.method} ${req.originalUrl}`, 404));
};

// Xử lý các request không được phép
export const methodNotAllowedHandler = (allowedMethods) => {
    return (req, res, next) => {
        if (!allowedMethods.includes(req.method)) {
            next(new AppError(`Phương thức ${req.method} không được phép cho route này`, 405));
        }
        next();
    };
}; 