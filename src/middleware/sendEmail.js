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

  const shipping =
    order.user_id?.shipping_addresses?.find(addr => addr.is_default) || {};
  // Tạo danh sách sản phẩm
  const itemsHtml = orderItems.map(item => `
  <tr>
    <td>
      ${item.product_id.name} - 
      ${item.variant_id.color?.name || ""} 
      size ${item.variant_id.size?.size || ""}
    </td>
    <td>${item.quantity}</td>
    <td>${item.price.toLocaleString("vi-VN")}đ</td>
    <td>${(item.price * item.quantity).toLocaleString("vi-VN")}đ</td>
  </tr>
`).join("");

  const html = `
    <h2>Cảm ơn bạn đã mua hàng tại Sneaker Trend!</h2>
    <p>Mã đơn hàng: <b>${order._id}</b></p>
    <p>Ngày đặt: ${new Date(order.createdAt).toLocaleString("vi-VN")}</p>
    <h3>Chi tiết đơn hàng:</h3>
    <table border="1" cellspacing="0" cellpadding="5">
      <tr>
        <th>Sản phẩm</th><th>Số lượng</th><th>Đơn giá</th><th>Thành tiền</th>
      </tr>
      ${itemsHtml}
    </table>
    <p><b>Tạm tính:</b> ${order.sub_total.toLocaleString("vi-VN")}đ</p>
    <p><b>Giảm giá:</b> ${order.voucher_discount.toLocaleString("vi-VN")}đ</p>
    <p><b>Tổng thanh toán:</b> ${order.total_price.toLocaleString("vi-VN")}đ</p>
    <p><b>Giao tới:</b> 
      ${shipping.full_name || ""} - ${shipping.phone || ""} - ${shipping.address || ""}</p>
    `;

  await transporter.sendMail({
    from: `"Sneaker Trend" <${process.env.EMAIL_USER}>`,
    to,
    subject: `Hóa đơn mua hàng #${order._id}`,
    html
  });
};
