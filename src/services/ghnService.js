import axios from "axios";

const GHN_BASE_URL =
  process.env.GHN_BASE_URL || "https://online-gateway.ghn.vn/shiip/public-api";
const GHN_TOKEN = process.env.GHN_TOKEN;
const GHN_SHOP_ID = process.env.GHN_SHOP_ID
  ? Number(process.env.GHN_SHOP_ID)
  : undefined;

// Địa chỉ mặc định của shop (HN - FPT Polytechnic, Xuân Phương, Nam Từ Liêm)
const SHOP_ADDRESS = {
  province_id: 201,
  district_id: 3440,
  ward_code: "13010",
};

function assertEnv() {
  if (!GHN_TOKEN) throw new Error("Thiếu GHN_TOKEN trong biến môi trường");
  if (!GHN_SHOP_ID) throw new Error("Thiếu GHN_SHOP_ID trong biến môi trường");
}

// 👉 axios instance với baseURL và headers chung
const ghnClient = axios.create({
  baseURL: GHN_BASE_URL,
  headers: {
    Token: GHN_TOKEN,
    ShopId: GHN_SHOP_ID,
    "Content-Type": "application/json",
  },
});

// ------------------- Fee & Services -------------------
export async function calculateShippingFee(input) {
  assertEnv();

  const payload = {
    from_district_id: SHOP_ADDRESS.district_id,
    from_ward_code: SHOP_ADDRESS.ward_code,
    to_district_id: input.toDistrictId,
    to_ward_code: String(input.toWardCode),
    service_id: input.serviceId, // bắt buộc
    service_type_id: input.serviceTypeId || null,
    height: input.height || 10,
    length: input.length || 10,
    weight: input.weight || 200,
    width: input.width || 10,
    insurance_value: input.insuranceValue || 0,
    coupon: input.coupon || null,
    items: input.items || [],
  };

  const { data } = await ghnClient.post("/v2/shipping-order/fee", payload);
  if (data.code !== 200) throw new Error(data.message || "GHN fee API error");
  return data.data;
}

export async function getAvailableServices(input) {
  assertEnv();

  const payload = {
    shop_id: GHN_SHOP_ID,
    from_district: SHOP_ADDRESS.district_id,
    to_district: input.toDistrictId,
  };

  const { data } = await ghnClient.post(
    "/v2/shipping-order/available-services",
    payload
  );

  if (data.code !== 200)
    throw new Error(data.message || "GHN services API error");

  return data.data;
}

// ------------------- Combo: Auto Fee -------------------
export async function getAutoShippingFee(input) {
  assertEnv();

  // 1. Lấy danh sách dịch vụ khả dụng
  const services = await getAvailableServices({
    toDistrictId: input.toDistrictId,
  });

  if (!services || services.length === 0) {
    throw new Error("Không tìm thấy dịch vụ vận chuyển khả dụng");
  }

  // 2. Lấy serviceId đầu tiên
  const service = services[0];

  // 3. Tính phí ship
  const fee = await calculateShippingFee({
    toDistrictId: input.toDistrictId,
    toWardCode: input.toWardCode,
    serviceId: service.service_id,        // ✅ đúng field
    serviceTypeId: service.service_type_id, // ✅ đúng field
    weight: input.weight,
    length: input.length,
    width: input.width,
    height: input.height,
    insuranceValue: input.insuranceValue,
    coupon: input.coupon,
    items: input.items,
  });

  return {
    service,
    fee,
  };
}

// ------------------- Master Data -------------------
export async function getProvinces() {
  const { data } = await ghnClient.get("/master-data/province");
  if (data.code !== 200) throw new Error(data.message || "GHN provinces API error");
  return data.data;
}

export async function getDistricts(provinceId) {
  const { data } = await ghnClient.post("/master-data/district", {
    province_id: provinceId,
  });
  if (data.code !== 200) throw new Error(data.message || "GHN districts API error");
  return data.data;
}

export async function getWards(districtId) {
  const { data } = await ghnClient.post("/master-data/ward", {
    district_id: districtId,
  });
  if (data.code !== 200) throw new Error(data.message || "GHN wards API error");
  return data.data;
}

export default {
  calculateShippingFee,
  getAvailableServices,
  getAutoShippingFee,
  getProvinces,
  getDistricts,
  getWards,
};
