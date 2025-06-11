import Voucher_MD from "../models/voucher_MD";

Voucher_MD.pre('save', function(next) {
    const now = new Date();
    if (now > this.endDate || this.usedCount >= this.quantity) {
        this.isActive = false;
    }
    next();
});
