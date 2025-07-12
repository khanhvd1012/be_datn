import Message from '../models/message_MD.js';
import User from '../models/auth_MD.js';
import ChatRoom from '../models/chatRoom_MD.js';
import { askGemini } from '../services/geminiService.js';
import size_MD from '../models/size_MD.js';
import Colors_MD from '../models/color_MD.js';
import stock_MD from '../models/stock_MD.js';
import Variant_MD from '../models/variant_MD.js';


// Hàm gửi tin nhắn từ khách hàng, AI sẽ trả lời liên tục cho đến khi admin/employee tham gia phòng chat
export const customerSendMessage = async (req, res) => {
  try {
    const { content } = req.body;
    const userId = req.user._id;

    // Tìm phòng chat đang active của user, nếu chưa có thì tạo mới
    let chatRoom = await ChatRoom.findOne({
      participants: userId,
      isEmployeeJoined: false
    });

    if (!chatRoom) {
      chatRoom = await ChatRoom.create({ participants: [userId] });
    }

    // Lưu message khách hàng
    const message = await Message.create({
      chatRoom_id: chatRoom._id,
      sender_id: userId,
      receiver_id: null,
      content,
      type: 'text',
    });

    // Kiểm tra trạng thái phòng chat: nếu chưa có nhân viên tham gia thì AI trả lời
    // Giả sử ChatRoom có trường isEmployeeJoined (true nếu admin/employee đã join)
    const currentChatRoom = await ChatRoom.findById(chatRoom._id);

    if (!currentChatRoom || !currentChatRoom.isEmployeeJoined) {
      // AI trả lời liên tục cho đến khi admin/employee join phòng chat
      let context = '';
      const sizeMatch = content.match(/size\s*(\d+)|cỡ\s*(\d+)|chân\s*tôi\s*size\s*(\d+)/i);
      let variants = [];

      if (sizeMatch) {
        const sizeNum = sizeMatch[1] || sizeMatch[2] || sizeMatch[3];
        // Truy vấn thêm color nếu khách hỏi màu
        const colorMatch = content.match(/màu\s*(\w+)/i);
        let colorDoc = null;
        if (colorMatch) {
          const colorName = colorMatch[1];
          colorDoc = await Colors_MD.findOne({ name: { $regex: colorName, $options: 'i' } });
        }

        // Tìm size ObjectId từ bảng Size
        const sizeDoc = await size_MD.findOne({ size: Number(sizeNum) });
        if (sizeDoc) {
          const variantQuery = { size: sizeDoc._id };
          if (colorDoc) {
            variantQuery.color = colorDoc._id;
          }
          variants = await Variant_MD.find(variantQuery)
            .populate({
              path: 'product_id',
              select: 'name',
              populate: [
                { path: 'brand', select: 'name' },
                { path: 'category', select: 'name' }
              ]
            })
            .populate({ path: 'size', select: 'size' })
            .populate({ path: 'color', select: 'name' });

          // Lấy thông tin stock riêng cho từng variant
          for (let variant of variants) {
            const stock = await stock_MD.findOne({ product_variant_id: variant._id });
            variant.stockInfo = stock ? stock.quantity : 0;
          }

          if (variants.length > 0) {
            let colorText = colorDoc ? ` màu ${colorDoc.name}` : '';
            context = `Các sản phẩm phù hợp với size ${sizeNum}${colorText}:\n` +
              variants.map(v => {
                // Hiển thị chi tiết từng biến thể về màu sắc và kích cỡ (fix phần size)
                let sizeText = Array.isArray(v.size)
                  ? v.size.map(s => s.size).join(', ')
                  : v.size?.size || 'N/A';
                return `Tên sản phẩm: ${v.product_id?.name || 'N/A'} | Giá: ${v.price} | Màu: ${v.color?.name || 'N/A'} | Size: ${sizeText} | Tồn kho: ${v.stockInfo || 'Không rõ'} | Thương hiệu: ${v.product_id?.brand?.name || 'N/A'} | Danh mục: ${v.product_id?.category?.name || 'N/A'}`;
              }).join('\n');
          } else {
            context = `Không tìm thấy sản phẩm nào phù hợp với size ${sizeNum}${colorDoc ? ` màu ${colorDoc.name}` : ''}.`;
          }
        } else {
          context = `Không tìm thấy sản phẩm nào phù hợp với size ${sizeNum}.`;
        }
      } else if (/giày|sản phẩm|tư vấn|phù hợp|mẫu|mua|đặt/i.test(content)) {
        variants = await Variant_MD.find().limit(10)
          .populate({
            path: 'product_id',
            select: 'name',
            populate: [
              { path: 'brand', select: 'name' },
              { path: 'category', select: 'name' }
            ]
          })
          .populate({ path: 'size', select: 'size' })
          .populate({ path: 'color', select: 'name' });
        
        // Lấy thông tin stock riêng cho từng variant
        for (let variant of variants) {
          const stock = await stock_MD.findOne({ product_variant_id: variant._id });
          variant.stockInfo = stock ? stock.quantity : 0;
        }
        
        context = 'Một số sản phẩm nổi bật:\n' +
          variants.map(v => `- ${v.product_id?.name || 'N/A'} (${v.product_id?.brand?.name || 'N/A'}) - Size: ${v.size?.size || 'N/A'} - Màu: ${v.color?.name || 'N/A'} - Giá: ${v.price}`).join('\n');
      }

      // Gọi AI trả lời với context sản phẩm
      // Truy vấn tồn kho cho từng biến thể và truyền đầy đủ thông tin cho AI
      let productDetails = '';
      if (variants.length > 0) {
        productDetails = variants.map(v => {
          return [
            `Tên: ${v.product_id?.name || 'N/A'}`,
            `Giá: ${v.price}`,
            `Màu: ${v.color?.name || 'N/A'}`,
            `Size: ${v.size?.size || 'N/A'}`,
            `Tồn kho: ${v.stockInfo || 'Không rõ'}`,
            `Thương hiệu: ${v.product_id?.brand?.name || 'N/A'}`,
            `Danh mục: ${v.product_id?.category?.name || 'N/A'}`
          ].join(' | ');
        }).join('\n');
      }
      
      // Ghép context và productDetails để AI có dữ liệu chi tiết hơn
      const fullContext = context + (productDetails ? `\nChi tiết sản phẩm:\n${productDetails}` : '');

      const aiReply = await askGemini(content, fullContext);

      // Tạo user AI nếu chưa có, hoặc dùng userId đặc biệt
      let aiUser = await User.findOne({ user_id: 'ai-gemini' });
      if (!aiUser) {
        // Nếu chưa có user AI, tạo user AI tạm thời với user_id duy nhất (random nếu cần)
        aiUser = await User.create({
          user_id: `ai-gemini-${Date.now()}`, // đảm bảo không trùng lặp
          username: 'AI Gemini',
          email: `ai-gemini-${Date.now()}@yourdomain.com`,
          password: 'ai-gemini-temp',
          role: 'employee'
        });
      }

      // Lưu message AI
      const aiMessage = await Message.create({
        chatRoom_id: chatRoom._id,
        sender_id: aiUser._id,
        receiver_id: userId,
        content: aiReply,
        type: 'text',
      });

      // Trả về cả lịch sử trò chuyện (khách + AI)
      const messages = await Message.find({ chatRoom_id: chatRoom._id }).sort({ createdAt: 1 });
      return res.status(200).json({
        message: 'Tin nhắn đã được gửi và AI đã trả lời',
        aiReply,
        chatHistory: messages
      });
    }

    // Nếu admin/employee đã tham gia phòng chat, AI sẽ dừng trả lời, chỉ lưu message khách hàng
    // Trả về lịch sử trò chuyện (khách + AI + nhân viên nếu có)
    const messages = await Message.find({ chatRoom_id: chatRoom._id }).sort({ createdAt: 1 });
    res.status(200).json({
      message: 'Tin nhắn đã được gửi cho nhân viên',
      data: message,
      chatHistory: messages
    });

  } catch (error) {
    res.status(500).json({
      message: 'Lỗi khi gửi tin nhắn',
      error: error.message
    });
  }
};

// Khi admin/employee join phòng chat, cập nhật trạng thái phòng chat để AI dừng trả lời
export const employeeJoinChatRoom = async (req, res) => {
  try {
    // Nhân viên cần truyền chatRoom_id vào body để xác định phòng chat cần tham gia
    const { chatRoom_id } = req.body;
    // Cập nhật trường isEmployeeJoined = true
    await ChatRoom.findByIdAndUpdate(chatRoom_id, { isEmployeeJoined: true });
    res.status(200).json({ message: 'Nhân viên đã tham gia phòng chat, AI sẽ dừng trả lời.' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi nhân viên tham gia phòng chat', error: error.message });
  }
}

// Tạo phòng chat mới (chatRoom_id được tạo khi gọi hàm này)
export const createChatRoom = async (req, res) => {
  try {
    const { participants } = req.body; // mảng user_id (ví dụ: [userId, employeeId])
    const chatRoom = await ChatRoom.create({ participants });
    return res.status(201).json({
      message: "Tạo phòng chat thành công",
      chatRoom_id: chatRoom._id,
      chatRoom
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi tạo phòng chat", error: error.message });
  }
}

// Add other chat functions as needed...