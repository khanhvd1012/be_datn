import Product from '../models/product_MD.js';
import Message from '../models/message_MD.js';
import User from '../models/auth_MD.js';
import ChatRoom from '../models/chatRoom_MD.js';
import { askGemini } from '../services/geminiService.js';

// Hàm gửi tin nhắn từ khách hàng, AI sẽ trả lời liên tục cho đến khi admin/employee tham gia phòng chat
export const customerSendMessage = async (req, res) => {
  try {
    const { chatRoom_id, content } = req.body;
    const userId = req.user._id;

    // Lưu message khách hàng
    const message = await Message.create({
      chatRoom_id,
      sender_id: userId,
      receiver_id: null,
      content,
      type: 'text',
    });

    // Kiểm tra trạng thái phòng chat: nếu chưa có nhân viên tham gia thì AI trả lời
    // Giả sử ChatRoom có trường isEmployeeJoined (true nếu admin/employee đã join)
    const chatRoom = await ChatRoom.findById(chatRoom_id);

    if (!chatRoom || !chatRoom.isEmployeeJoined) {
      // AI trả lời liên tục cho đến khi admin/employee join phòng chat
      let context = '';
      const sizeMatch = content.match(/size\s*(\d+)|cỡ\s*(\d+)|chân\s*tôi\s*size\s*(\d+)/i);
      let products = [];

      if (sizeMatch) {
        const sizeNum = sizeMatch[1] || sizeMatch[2] || sizeMatch[3];
        products = await Product.find()
          .populate({
            path: 'variants',
            match: { size: sizeNum },
            select: 'price',
            populate: [
              { path: 'product_id', select: 'name' },
              { path: 'size', select: 'size' },
              { path: 'color', select: 'color' }
            ]
          })
          .populate('brand', 'name')
          .populate('category', 'name');
        products = products.filter(p => p.variants && p.variants.length > 0);
        if (products.length > 0) {
          context = `Các sản phẩm phù hợp với size ${sizeNum}:\n` +
            products.map(p => `- ${p.name} (${p.brand?.name || ''})`).join('\n');
        } else {
          context = `Không tìm thấy sản phẩm nào phù hợp với size ${sizeNum}.`;
        }
      } else if (/giày|sản phẩm|tư vấn|phù hợp|mẫu|mua|đặt/i.test(content)) {
        products = await Product.find().limit(3).populate('brand', 'name');
        context = 'Một số sản phẩm nổi bật:\n' +
          products.map(p => `- ${p.name} (${p.brand?.name || ''})`).join('\n');
      }

      // Gọi AI trả lời với context sản phẩm
      const aiReply = await askGemini(content, context);

      // Tạo user AI nếu chưa có, hoặc dùng userId đặc biệt
      const aiUser = await User.findOne({ role: 'ai' });

      // Lưu message AI
      const aiMessage = await Message.create({
        chatRoom_id,
        sender_id: aiUser ? aiUser._id : null,
        receiver_id: userId,
        content: aiReply,
        type: 'text',
      });

      // Trả về cả lịch sử trò chuyện (khách + AI)
      const messages = await Message.find({ chatRoom_id }).sort({ createdAt: 1 });
      return res.status(200).json({
        message: 'Tin nhắn đã được gửi và AI đã trả lời',
        aiReply,
        chatHistory: messages
      });
    }

    // Nếu admin/employee đã tham gia phòng chat, AI sẽ dừng trả lời, chỉ lưu message khách hàng
    // Trả về lịch sử trò chuyện (khách + AI + nhân viên nếu có)
    const messages = await Message.find({ chatRoom_id }).sort({ createdAt: 1 });
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
    const { chatRoom_id } = req.body;
    // Cập nhật trường isEmployeeJoined = true
    await ChatRoom.findByIdAndUpdate(chatRoom_id, { isEmployeeJoined: true });
    res.status(200).json({ message: 'Nhân viên đã tham gia phòng chat, AI sẽ dừng trả lời.' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi nhân viên tham gia phòng chat', error: error.message });
  }
};

// Add other chat functions as needed...
