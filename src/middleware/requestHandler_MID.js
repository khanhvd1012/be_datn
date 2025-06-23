import { AppError } from './errorHandler_MID';

/**
 * Middleware xử lý phân trang
 * @description
 * - Xử lý và validate các tham số phân trang từ query string
 * - Các tham số:
 *   + page: số trang (mặc định: 1)
 *   + limit: số lượng item mỗi trang (mặc định: 10, tối đa: 100)
 * - Tính toán skip để query trong database
 * - Lưu thông tin phân trang vào req.pagination
 */
export const paginationHandler = (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        
        if (page < 1) {
            throw new AppError('Số trang phải lớn hơn 0', 400);
        }
        if (limit < 1 || limit > 100) {
            throw new AppError('Số lượng item mỗi trang phải từ 1 đến 100', 400);
        }

        req.pagination = {
            page,
            limit,
            skip: (page - 1) * limit
        };
        next();
    } catch (error) {
        next(error);
    }
};

/**
 * Middleware xử lý sắp xếp
 * @description
 * - Xử lý tham số sort từ query string
 * - Format: field1,field2,-field3 
 *   (dấu - đầu field để sắp xếp giảm dần)
 * - Ví dụ: 
 *   + sort=name,-price: sắp xếp theo tên tăng dần, giá giảm dần
 *   + sort=-createdAt: sắp xếp theo thời gian tạo giảm dần
 * - Mặc định sắp xếp theo createdAt giảm dần
 */
export const sortHandler = (req, res, next) => {
    try {
        const sort = {};
        if (req.query.sort) {
            const sortFields = req.query.sort.split(',');
            sortFields.forEach(field => {
                if (field.startsWith('-')) {
                    sort[field.substring(1)] = -1;
                } else {
                    sort[field] = 1;
                }
            });
        } else {
            sort.createdAt = -1; // Mặc định sắp xếp theo thời gian tạo mới nhất
        }

        req.sorting = sort;
        next();
    } catch (error) {
        next(error);
    }
};

/**
 * Middleware xử lý tìm kiếm
 * @description
 * Hỗ trợ nhiều tiêu chí tìm kiếm:
 * 1. Khoảng giá (minPrice, maxPrice)
 * 2. Từ khóa (keyword) - tìm trong tên và mô tả
 * 3. Danh mục (category)
 * 4. Thương hiệu (brand)
 * 5. Trạng thái (status)
 * 
 * Các tham số được kết hợp với nhau bằng điều kiện AND
 * Tìm kiếm từ khóa sử dụng regex và case insensitive
 */
export const searchHandler = (req, res, next) => {
    try {
        const search = {};
        
        // Xử lý tìm kiếm theo khoảng giá
        if (req.query.minPrice || req.query.maxPrice) {
            search.price = {};
            if (req.query.minPrice) {
                search.price.$gte = parseFloat(req.query.minPrice);
            }
            if (req.query.maxPrice) {
                search.price.$lte = parseFloat(req.query.maxPrice);
            }
        }

        // Xử lý tìm kiếm theo từ khóa
        if (req.query.keyword) {
            search.$or = [
                { name: { $regex: req.query.keyword, $options: 'i' } },
                { description: { $regex: req.query.keyword, $options: 'i' } }
            ];
        }

        // Xử lý tìm kiếm theo danh mục
        if (req.query.category) {
            search.category = req.query.category;
        }

        // Xử lý tìm kiếm theo thương hiệu
        if (req.query.brand) {
            search.brand = req.query.brand;
        }

        // Xử lý tìm kiếm theo trạng thái
        if (req.query.status) {
            search.status = req.query.status;
        }

        req.searching = search;
        next();
    } catch (error) {
        next(error);
    }
};

/**
 * Middleware validate ObjectId
 * @description
 * - Kiểm tra tính hợp lệ của MongoDB ObjectId
 * - Sử dụng regex để kiểm tra format: 24 ký tự hex
 * - Ví dụ sử dụng: 
 *   router.get('/:id', validateObjectId('id'), controller)
 */
export const validateObjectId = (paramName) => {
    return (req, res, next) => {
        const id = req.params[paramName];
        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            throw new AppError(`ID không hợp lệ: ${id}`, 400);
        }
        next();
    };
}; 