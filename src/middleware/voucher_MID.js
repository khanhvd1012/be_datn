// cập nhật voucher khi lưu
class VoucherMiddleware {
    static async updateVoucherOnSave(next) {
        try {
            const now = new Date();
            if (now > this.endDate || this.usedCount >= this.quantity) {
                this.isActive = false;
            }
            next();
        } catch (error) {
            next(new Error(`Lỗi khi cập nhật voucher: ${error.message}`));
        }   
    }
}

export const { updateVoucherOnSave } = VoucherMiddleware;
