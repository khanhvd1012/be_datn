
export function updateVoucherOnSave(next) {
  const now = new Date();
  
  if (now > this.endDate || this.usedCount >= this.quantity) {
    this.isActive = false;
  }

  next();
}


