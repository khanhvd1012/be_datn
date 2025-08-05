const productTimeouts = new Map();

export const setProductTimeout = (productId, timeoutId) => { // Đặt timeout cho sản phẩm
    productTimeouts.set(productId.toString(), timeoutId);
};

export const getProductTimeout = (productId) => { // Lấy timeout cho sản phẩm
    return productTimeouts.get(productId.toString());
};

export const clearProductTimeout = (productId) => { // Xóa timeout cho sản phẩm
    const timeoutId = productTimeouts.get(productId.toString());
    if (timeoutId) {
        clearTimeout(timeoutId);
        productTimeouts.delete(productId.toString());
    }
};

const voucherTimeouts = new Map();

export const setVoucherTimeout = (voucherId, timeoutId) => { // Đặt timeout cho voucher
    voucherTimeouts.set(voucherId.toString(), timeoutId);
};

export const getVoucherTimeout = (voucherId) => { // Lấy timeout cho voucher
    return voucherTimeouts.get(voucherId.toString());
};

export const clearVoucherTimeout = (voucherId) => { // Xóa timeout cho voucher
    const timeoutId = voucherTimeouts.get(voucherId.toString());
    if (timeoutId) {
        clearTimeout(timeoutId);
        voucherTimeouts.delete(voucherId.toString());
    }
};