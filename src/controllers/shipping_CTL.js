import {
    getAutoShippingFee,
    getProvinces,
    getDistricts,
    getWards
} from "../services/ghnService.js";
import Cart_MD from "../models/cart_MD.js";
import Variant_MD from "../models/variant_MD.js";

export const getShippingFee = async (req, res) => {
  try {
    const { cart_id, variant_id, size, quantity, toDistrictId, toWardCode, shipping_address_id } = req.body;

    let cartItems = [];
    let finalDistrictId = toDistrictId;
    let finalWardCode = toWardCode;

    if (cart_id) {
      // 🛒 Tính phí từ giỏ hàng
      const cart = await Cart_MD.findById(cart_id)
        .populate({
          path: "cart_items",
          populate: { path: "variant_id", select: "price weight" }
        });

      if (!cart || !cart.cart_items?.length) {
        return res.status(404).json({ message: "Không tìm thấy giỏ hàng hoặc giỏ hàng trống" });
      }

      cartItems = cart.cart_items.map(item => ({
        variant_id: item.variant_id,
        quantity: item.quantity
      }));

    } else if (variant_id && quantity) {
      // ⚡ Mua ngay
      const variant = await Variant_MD.findById(variant_id).select("price weight");
      if (!variant) {
        return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
      }

      cartItems = [{ variant_id: variant, quantity }];
    } else {
      return res.status(400).json({ message: "Thiếu cart_id hoặc dữ liệu mua ngay" });
    }

    // 👉 Nếu chưa có địa chỉ thì check shipping_address_id
    if (!finalDistrictId || !finalWardCode) {
      if (shipping_address_id) {
        const addr = await Address_MD.findById(shipping_address_id);
        if (!addr) {
          return res.status(404).json({ message: "Không tìm thấy địa chỉ nhận hàng" });
        }
        finalDistrictId = addr.district_id;
        finalWardCode = addr.ward_code;
      } else {
        // 👉 fallback: lấy địa chỉ mặc định của user
        const user = await User_MD.findById(req.user._id).populate("default_address");
        if (!user?.default_address) {
          return res.status(400).json({ message: "Chưa có địa chỉ nhận hàng mặc định" });
        }
        finalDistrictId = user.default_address.district_id;
        finalWardCode = user.default_address.ward_code;
      }
    }

    if (!finalDistrictId || !finalWardCode) {
      return res.status(400).json({ message: "Thiếu thông tin địa chỉ nhận hàng" });
    }

    // 👉 Tính tổng trọng lượng
    const totalWeight = cartItems.reduce((sum, item) => {
      return sum + ((item.variant_id?.weight || 200) * item.quantity);
    }, 0);

    // 👉 Tính tổng giá trị đơn hàng
    const totalValue = cartItems.reduce((sum, item) => {
      return sum + ((item.variant_id?.price || 0) * item.quantity);
    }, 0);

    // 👉 Gọi GHN service
    const { service, fee } = await getAutoShippingFee({
      toDistrictId: finalDistrictId,
      toWardCode: finalWardCode,
      weight: totalWeight,
      length: 15,
      width: 15,
      height: 15,
      insuranceValue: totalValue,
      items: cartItems.map(item => ({
        name: item.variant_id?._id?.toString() || "SP",
        quantity: item.quantity,
        weight: item.variant_id?.weight || 200
      }))
    });

    res.json({
      message: "Tính phí thành công",
      service,
      fee,
      total:fee.total // 👉 tổng tiền cần thanh toán (hàng + ship)
    });
  } catch (error) {
    console.error("Lỗi tính phí ship:", error);
    res.status(500).json({
      message: "Không tính được phí vận chuyển",
      error: error.message
    });
  }
};

// Lấy tỉnh/thành
export const getGhnProvinces = async (req, res) => {
    try {
        const provinces = await getProvinces();
        res.status(200).json({ message: "Lấy danh sách tỉnh/thành công", data: provinces });
    } catch (error) {
        res.status(500).json({ message: "Không lấy được tỉnh/thành", error: error?.response?.data || error.message });
    }
};

// Lấy quận/huyện theo province_id
export const getGhnDistricts = async (req, res) => {
    try {
        const { province_id } = req.body;
        if (!province_id) return res.status(400).json({ message: "Thiếu province_id" });

        const districts = await getDistricts(province_id);
        res.status(200).json({ message: "Lấy danh sách quận/huyện thành công", data: districts });
    } catch (error) {
        res.status(500).json({ message: "Không lấy được quận/huyện", error: error?.response?.data || error.message });
    }
};

// Lấy phường/xã theo district_id
export const getGhnWards = async (req, res) => {
    try {
        const { district_id } = req.body;
        if (!district_id) return res.status(400).json({ message: "Thiếu district_id" });

        const wards = await getWards(district_id);
        res.status(200).json({ message: "Lấy danh sách phường/xã thành công", data: wards });
    } catch (error) {
        res.status(500).json({ message: "Không lấy được phường/xã", error: error?.response?.data || error.message });
    }
};

export default {
    getShippingFee,
    getGhnProvinces,
    getGhnDistricts,
    getGhnWards
};
