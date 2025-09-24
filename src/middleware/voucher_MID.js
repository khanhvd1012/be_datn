class VoucherMiddleware {
    static async updateVoucherOnSave(next) {
        try {
            const now = new Date();
            if (this.startDate && now < this.startDate) {
                this.status = 'inactive'; // Chưa đến ngày bắt đầu
            } else if (this.endDate && now > this.endDate) {
                this.status = 'inactive'; // Hết hạn
            } else if (this.quantity && this.usedCount >= this.quantity) {
                this.status = 'inactive'; // Hết lượt dùng
            } else {
                this.status = 'active'; // Còn hiệu lực và chưa hết lượt
            }
            next();
        } catch (error) {
            next(new Error(`Lỗi khi cập nhật voucher: ${error.message}`));
        }
    }
}

export const { updateVoucherOnSave } = VoucherMiddleware;