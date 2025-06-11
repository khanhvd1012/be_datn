import Voucher_MD from "../models/voucher_MD";

export const updateVoucherOnSave = async (next) => {
    try {
        const now = new Date();
        if (now > this.endDate || this.usedCount >= this.quantity) {
            this.isActive = false;
        }
        next();
    } catch (error) {
        next(new Error(`Lỗi khi cập nhật voucher: ${error.message}`));
    }   
    
};

Voucher_MD.pre('save', updateVoucherOnSave);
