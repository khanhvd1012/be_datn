# be_datn
Git Back_End DATN
# Cấu Trúc Thư Mục Backend Node.js/Express

## Tổng Quan
Đây là cấu trúc thư mục backend cho dự án, được tổ chức theo mô hình MVC (Model-View-Controller) với các middleware và validators.

## Chi Tiết Các Thư Mục

### 📁 config/
- Chứa các file cấu hình cho ứng dụng
- Bao gồm:
  - Cấu hình database (MongoDB)
  - Biến môi trường
  - Cấu hình JWT
  - Cấu hình email
  - Các constants và cấu hình khác

### 📁 controllers/
- Xử lý logic nghiệp vụ chính của ứng dụng
- Mỗi file controller tương ứng với một module chức năng
- Đặt tên theo format: `[tên_module]_CTL.js`
- Nhiệm vụ:
  - Nhận request từ router
  - Xử lý business logic
  - Tương tác với model
  - Trả về response

### 📁 middleware/
- Chứa các middleware xử lý trung gian
- Các loại middleware:
  - Authentication & Authorization
  - Error handling
  - Request validation
  - Response formatting
  - Logging
  - Rate limiting
  - CORS
  - File upload

### 📁 models/
- Định nghĩa cấu trúc dữ liệu (schema) MongoDB
- Mỗi file tương ứng một collection
- Đặt tên theo format: `[tên_collection]_M.js`
- Bao gồm:
  - Schema definition
  - Indexes
  - Middleware
  - Instance/Static methods
  - Virtuals
  - Validation

### 📁 routers/
- Định nghĩa các routes/endpoints của API
- Mỗi file router cho một module
- Đặt tên theo format: `[tên_module]_RT.js`
- Nhiệm vụ:
  - Định tuyến request
  - Áp dụng middleware
  - Gọi controller tương ứng

### 📁 validators/
- Chứa các schema validation và rules
- Kiểm tra tính hợp lệ của:
  - Request body
  - Query parameters
  - URL parameters
  - Headers
- Sử dụng các thư viện như Joi hoặc express-validator

## Quy Ước Đặt Tên
- Files: snake_case với hậu tố chỉ loại file (VD: user_CTL.js, auth_MID.js)
- Folders: lowercase
- Classes: PascalCase
- Functions & Variables: camelCase
- Constants: UPPER_SNAKE_CASE

## Xử Lý Lỗi
- Sử dụng middleware errorHandler tập trung
- Định nghĩa các custom error classes
- Format response lỗi nhất quán
- Logging chi tiết

## API Response Format
```javascript
// Success Response
{
  success: true,
  data: {}, // Data response
  message: "Thông báo thành công"
}

// Error Response
{
  success: false,
  error: {
    code: "ERROR_CODE",
    message: "Thông báo lỗi",
    details: {} // Chi tiết lỗi (optional)
  }
}
``` 