import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail", // hoặc smtp khác
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

export const sendEmailBlock = async (to, subject, html) => {
  try {
    await transporter.sendMail({
      from: `"Sneaker Trend" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
  } catch (error) {
    console.error("Lỗi gửi email:", error);
  }
};

export const sendOTP = async (email, otp) => {
  await transporter.sendMail({
    from: `"Support" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Mã OTP xác thực",
    text: `Mã OTP của bạn là: ${otp}. Hết hạn trong 5 phút.`,
  });
};

export const sendEmailOrder = async (to, order, orderItems) => {
  try {
    const formatCurrency = (value) =>
      (value || 0).toLocaleString("vi-VN") + " đ";

    const formatDateTime = (date) =>
      new Date(date).toLocaleString("vi-VN", { hour12: false });

    const shippingFee = order.phiShip ?? order.shipping_fee ?? 0;

    const itemsHtml = orderItems
      .map(
        (item) => `
        <tr>
          <td style="padding:8px;border:1px solid #ddd;text-align:center;">
            ${item.product_id?.name || "Sản phẩm"} 
          </td>
          <td style="padding:8px;border:1px solid #ddd;text-align:center;">
          ${item.variant_id?.color?.name || ""}
          </td>
          <td style="padding:8px;border:1px solid #ddd;text-align:center;">
          ${item.variant_id?.size?.size || ""}
          </td>
          <td style="padding:8px;border:1px solid #ddd;text-align:center;">
            ${item.quantity}
          </td>
          <td style="padding:8px;border:1px solid #ddd;text-align:center;">
            ${formatCurrency(item.price)}
          </td>
          <td style="padding:8px;border:1px solid #ddd;text-align:center;">
            ${formatCurrency((item.price || 0) * item.quantity)}
          </td>
        </tr>
      `
      )
      .join("");

    let shippingInfo = "";
    if (order.shipping_address && typeof order.shipping_address === "object") {
      shippingInfo = `
    <p><b>Người nhận:</b> ${order.shipping_address.full_name || ""}</p>
    <p><b>SĐT:</b> ${order.shipping_address.phone || ""}</p>
    <p><b>Địa chỉ:</b> ${order.shipping_address.address || ""}, 
      ${order.shipping_address.ward || ""}, 
      ${order.shipping_address.district || ""}, 
      ${order.shipping_address.city || ""}
    </p>
  `;
    } else {
      // shipping_address là chuỗi => parse tạm
      const parts = (order.shipping_address || "").split(" - ");
      shippingInfo = `
    <p><b>Người nhận:</b> ${parts[0] || ""}</p>
    <p><b>SĐT:</b> ${parts[1] || ""}</p>
    <p><b>Địa chỉ:</b> ${parts[2] || ""}</p>
  `;
    }

    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#333;">
        <h2 style="color:#2c3e50;">
          Cảm ơn bạn đã mua hàng tại <span style="color:#e67e22;">Sneaker Trend</span>!
        </h2>
        
        <p><b>Mã đơn hàng:</b> ${order.order_code || order._id}</p>
        <p><b>Ngày đặt:</b> ${formatDateTime(order.createdAt)}</p>
        
        <h3 style="margin-top:20px;">Chi tiết đơn hàng</h3>
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
          <thead>
            <tr style="background:#f2f2f2;">
              <th style="padding:8px;border:1px solid #ddd;">Sản phẩm</th>   
              <th style="padding:8px;border:1px solid #ddd;">Màu sắc</th>
              <th style="padding:8px;border:1px solid #ddd;">Kích cỡ</th>
              <th style="padding:8px;border:1px solid #ddd;">Số lượng</th>
              <th style="padding:8px;border:1px solid #ddd;">Đơn giá</th>
              <th style="padding:8px;border:1px solid #ddd;">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <p><b>Tạm tính:</b> ${formatCurrency(order.tongGoc || order.sub_total)}</p>
        <p><b>Giảm giá:</b> ${formatCurrency(order.giamGia || order.voucher_discount)}</p>
        <p><b>Phí vận chuyển:</b> ${formatCurrency(shippingFee)}</p>
        <p style="font-size:16px;">
          <b>Tổng thanh toán:</b> 
          <span style="color:#e74c3c;">${formatCurrency(order.tongThanhToan || order.total_price)}</span>
        </p>

        <h3 style="margin-top:20px;">Thông tin giao hàng</h3>
        ${shippingInfo}

        <p style="margin-top:30px;">Nếu có thắc mắc về đơn hàng, vui lòng liên hệ <b>hotline 1900 xxx xxx</b>.</p>
        <p>Trân trọng,<br><b>Sneaker Trend</b></p>
      </div>
    `;

    await transporter.sendMail({
      from: `"Sneaker Trend" <${process.env.EMAIL_USER}>`,
      to,
      subject: `[Sneaker Trend] Xác nhận đơn hàng #${order.order_code || order._id}`,
      html,
    });
    console.log(`📧 Email xác nhận đơn hàng gửi tới ${to} thành công`);
  } catch (error) {
    console.error("❌ Gửi email đơn hàng thất bại:", error.message);
  }
};




