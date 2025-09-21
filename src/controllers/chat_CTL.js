import crypto from 'crypto';
import Message from '../models/message_MD.js';
import User from '../models/auth_MD.js';
import ChatRoom from '../models/chatRoom_MD.js';
import { askGemini } from '../services/geminiService.js';
import size_MD from '../models/size_MD.js';
import Colors_MD from '../models/color_MD.js';
import stock_MD from '../models/stock_MD.js';
import Variant_MD from '../models/variant_MD.js';
import mongoose from 'mongoose';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import cron from 'node-cron';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Bộ giới hạn tốc độ
const lastMessageAt = new Map();
const MESSAGE_COOLDOWN_MS = 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000; // 1 ngày
const ONE_HOUR_MS = 60 * 60 * 1000; // 1 giờ

// Hàm trợ giúp: gọi askGemini với timeout
const askGeminiWithTimeout = async (userMessage, context, timeoutMs = 8000) => {
  try {
    const p = askGemini(userMessage, context);
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('AI timeout')), timeoutMs));
    return await Promise.race([p, timeout]);
  } catch (err) {
    console.error('askGemini thất bại:', err);
    return 'Xin lỗi, hiện tại bot gặp sự cố. Nhân viên sẽ hỗ trợ bạn sớm nhất.';
  }
};

// Chuẩn hóa và trích xuất size và màu sắc
const extractSizeAndColor = (content) => {
  if (!content || typeof content !== 'string') return { size: null, color: null };
  const sizePattern = new RegExp('(?:size|cỡ|chân(?: của)?\\s*tôi(?:\\s*size)?)\\s*[:\\-\\s]*([0-9]{1,3}(?:[\\.,][0-9]+)?)', 'iu');
  const colorPattern = new RegExp('màu\\s*([\\p{L}\\s\\-]+)', 'iu');
  const sizeMatch = content.match(sizePattern);
  const colorMatch = content.match(colorPattern);
  const sizeNum = sizeMatch ? sizeMatch[1].replace(',', '.') : null;
  const colorText = colorMatch ? colorMatch[1].trim() : null;
  return { size: sizeNum, color: colorText };
};

// Tạo hoặc lấy bot user
const getOrCreateBotUser = async () => {
  const BOT_USER_ID = 'ai-gemini';
  const randomPassword = crypto.randomBytes(16).toString('hex');
  const aiUser = await User.findOneAndUpdate(
    { user_id: BOT_USER_ID },
    {
      $setOnInsert: {
        user_id: BOT_USER_ID,
        username: 'AI Gemini',
        email: 'ai-gemini@yourdomain.com',
        password: randomPassword,
        role: 'employee',
        isBot: true,
      },
    },
    { upsert: true, new: true }
  );
  return aiUser;
};

// Endpoint: User xem lịch sử trò chuyện của họ
export const getMessageUser = async (req, res) => {
  try {
    const userId = req.user?._id;

    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng' });

    // Tìm phòng chat duy nhất của user
    let chatRoom = await ChatRoom.findOne({ participants: userId })
      .populate('participants', 'username email')
      .populate('lastMessage', 'content createdAt')
      .lean();

    // Nếu không có phòng chat, tạo phòng mới và gửi lời chào AI
    if (!chatRoom) {
      const newChatRoom = await ChatRoom.create({ participants: [userId], isEmployeeJoined: false });
      const aiUser = await getOrCreateBotUser();
      const welcomeMessage = `Chào ${user.username}, đây là dịch vụ tư vấn có hỗ trợ AI. Tôi có thể giúp gì cho bạn hôm nay?`;
      const aiWelcomeMessage = await Message.create({
        chatRoom_id: newChatRoom._id,
        sender_id: aiUser._id,
        receiver_id: userId,
        content: welcomeMessage,
        type: 'text',
      });

      await ChatRoom.findByIdAndUpdate(newChatRoom._id, { $set: { lastMessage: aiWelcomeMessage._id } });

      chatRoom = {
        ...newChatRoom.toObject(),
        participants: [{ _id: userId, username: user.username, email: user.email }],
        lastMessage: { _id: aiWelcomeMessage._id, content: welcomeMessage, createdAt: aiWelcomeMessage.createdAt },
      };
    }

    // Lấy lịch sử tin nhắn
    const messages = await Message.find({ chatRoom_id: chatRoom._id })
      .populate('sender_id', 'username role')
      .sort({ createdAt: 1 })
      .lean();

    let aiShouldReply = true;
    if (chatRoom.lastEmployeeMessageAt) {
      const timeSinceLastAdminMessage = Date.now() - new Date(chatRoom.lastEmployeeMessageAt).getTime();
      aiShouldReply = timeSinceLastAdminMessage > ONE_DAY_MS;
    }

    return res.status(200).json({
      message: messages.length === 1 ? 'Phòng chat mới được tạo với lời chào AI' : 'Lịch sử trò chuyện',
      chatRoom,
      chatHistory: messages,
      aiActive: chatRoom.isEmployeeJoined && aiShouldReply,
    });
  } catch (error) {
    console.error('Lỗi getMessageUser:', error);
    return res.status(500).json({ message: 'Lỗi khi lấy lịch sử trò chuyện', error: error.message });
  }
};

// Endpoint: Admin xem tất cả phòng chat của các user
export const getMessageAdmin = async (req, res) => {
  try {
    const chatRooms = await ChatRoom.find()
      .populate('participants', 'username email')
      .populate('lastMessage', 'content createdAt')
      .sort({ updatedAt: -1 })
      .lean();

    return res.status(200).json({
      message: 'Danh sách phòng chat',
      chatRooms,
    });
  } catch (error) {
    console.error('Lỗi getMessageAdmin:', error);
    return res.status(500).json({ message: 'Lỗi khi lấy danh sách phòng chat', error: error.message });
  }
};

// Endpoint: Admin xem lịch sử một phòng chat
export const getOneMessageUser = async (req, res) => {
  try {
    const { chatRoomId } = req.params;

    if (!chatRoomId) return res.status(400).json({ message: 'Yêu cầu chatRoomId' });

    const chatRoom = await ChatRoom.findById(chatRoomId)
      .populate('participants', 'username email')
      .lean();
    if (!chatRoom) return res.status(404).json({ message: 'Không tìm thấy phòng chat' });

    const messages = await Message.find({ chatRoom_id: chatRoomId })
      .populate('sender_id', 'username role')
      .sort({ createdAt: 1 })
      .lean();

    let aiShouldReply = true;
    if (chatRoom.lastEmployeeMessageAt) {
      const timeSinceLastAdminMessage = Date.now() - new Date(chatRoom.lastEmployeeMessageAt).getTime();
      aiShouldReply = timeSinceLastAdminMessage > ONE_DAY_MS;
    }

    return res.status(200).json({
      message: 'Lịch sử trò chuyện',
      chatRoom,
      chatHistory: messages,
      aiActive: chatRoom.isEmployeeJoined && aiShouldReply,
    });
  } catch (error) {
    console.error('Lỗi getOneMessageUser:', error);
    return res.status(500).json({ message: 'Lỗi khi lấy lịch sử trò chuyện', error: error.message });
  }
};

const UPLOAD_DIR = path.join(__dirname, '../../public/uploads');
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export const deleteOldUploadedImages = async () => {
  try {
    const files = await fs.readdir(UPLOAD_DIR);

    for (const file of files) {
      const filePath = path.join(UPLOAD_DIR, file);
      const stats = await fs.stat(filePath);

      if (Date.now() - stats.mtimeMs > SEVEN_DAYS_MS) {
        try {
          await fs.unlink(filePath);
          console.log(`Đã xóa file cũ: ${file}`);
        } catch (err) {
          console.error(`Không thể xóa file ${file}:`, err.message);
        }
      }
    }
  } catch (err) {
    console.error('Lỗi khi quét thư mục uploads:', err.message);
  }
};

cron.schedule('0 0 * * *', async () => {
  console.log('Bắt đầu xoá các ảnh cũ > 7 ngày');
  await deleteOldUploadedImages();
});

// Endpoint: User gửi tin nhắn vào phòng chat duy nhất
export const postMessageUser = async (req, res) => {
  try {
    const { content } = req.body;
    const userId = req.user?._id;

    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ message: 'Yêu cầu nội dung tin nhắn' });
    }

    let imageUrls = [];
    if (req.files && req.files.length > 0) {
      imageUrls = req.files.map(file => `http://localhost:3000/uploads/${file.filename}`);
    }

    const MAX_IMAGES = 5;
    if (imageUrls.length > MAX_IMAGES) {
      if (req.files && req.files.length > 0) deleteOldUploadedImages(req.files);
      return res.status(400).json({ message: `Tối đa ${MAX_IMAGES} ảnh` });
    }

    // Tìm phòng chat duy nhất của user
    const chatRoom = await ChatRoom.findOne({ participants: userId });
    if (!chatRoom) {
      return res.status(404).json({ message: 'Không tìm thấy phòng chat, vui lòng mở bong bóng chat trước' });
    }

    const now = Date.now();
    const last = lastMessageAt.get(String(userId)) || 0;
    if (now - last < MESSAGE_COOLDOWN_MS) {
      return res.status(429).json({ message: 'Gửi quá nhanh, vui lòng đợi một chút' });
    }
    lastMessageAt.set(String(userId), now);

    const customerMessage = await Message.create({
      chatRoom_id: chatRoom._id,
      sender_id: userId,
      receiver_id: null,
      content: content.trim(),
      type: 'text',
      images: imageUrls,
    });

    await ChatRoom.findByIdAndUpdate(chatRoom._id, { $set: { lastMessage: customerMessage._id } });


    let aiReply = null;
    let aiShouldReply = !chatRoom.isEmployeeJoined;
    if (chatRoom.isEmployeeJoined && chatRoom.lastEmployeeMessageAt) {
      const timeSinceLastAdminMessage = Date.now() - new Date(chatRoom.lastEmployeeMessageAt).getTime();
      aiShouldReply = timeSinceLastAdminMessage > ONE_DAY_MS;
    }

    if (aiShouldReply) {
      const user = await User.findById(userId);
      const contextMessage = content;
      const { size: sizeNum, color: colorText } = extractSizeAndColor(content);

      let variants = [];
      let context = '';

      if (sizeNum) {
        const numericSize = Number(sizeNum);
        const sizeDoc = await size_MD.findOne({ size: numericSize }).lean();
        if (sizeDoc) {
          const variantQuery = { size: sizeDoc._id };
          if (colorText) {
            const colorDoc = await Colors_MD.findOne({ name: new RegExp(colorText, 'iu') }).lean();
            if (colorDoc) variantQuery.color = colorDoc._id;
          }
          variants = await Variant_MD.find(variantQuery)
            .limit(10)
            .populate({ path: 'product_id', select: 'name brand category' })
            .populate({ path: 'size', select: 'size' })
            .populate({ path: 'color', select: 'name' })
            .lean();

          if (variants.length > 0) {
            const stockPromises = variants.map((v) => stock_MD.findOne({ product_variant_id: v._id }).lean());
            const stocks = await Promise.all(stockPromises);
            variants.forEach((v, i) => {
              v.stockInfo = stocks[i] ? stocks[i].quantity : 0;
            });

            context = `Các sản phẩm phù hợp với size ${sizeNum}${colorText ? ` màu ${colorText}` : ''}:\n` +
              variants.map((v) => {
                const sizeText = Array.isArray(v.size) ? v.size.map((s) => s.size).join(', ') : v.size?.size ?? 'N/A';
                return `Tên: ${v.product_id?.name || 'N/A'} | Giá: ${v.price ?? 'N/A'} | Màu: ${v.color?.name || 'N/A'} | Size: ${sizeText} | Tồn kho: ${v.stockInfo ?? 'Không rõ'} | Thương hiệu: ${v.product_id?.brand?.name || 'N/A'} | Danh mục: ${v.product_id?.category?.name || 'N/A'}`;
              }).join('\n');
          } else {
            context = `Không tìm thấy sản phẩm nào phù hợp với size ${sizeNum}${colorText ? ` màu ${colorText}` : ''}.`;
          }
        } else {
          context = `Không tìm thấy size ${sizeNum} trong hệ thống.`;
        }
      } else if (/giày|sản phẩm|tư vấn|phù hợp|mẫu|mua|đặt/i.test(contextMessage)) {
        variants = await Variant_MD.find()
          .limit(10)
          .populate({ path: 'product_id', select: 'name brand category' })
          .populate({ path: 'size', select: 'size' })
          .populate({ path: 'color', select: 'name' })
          .lean();

        const stockPromises = variants.map((v) => stock_MD.findOne({ product_variant_id: v._id }).lean());
        const stocks = await Promise.all(stockPromises);
        variants.forEach((v, i) => {
          v.stockInfo = stocks[i] ? stocks[i].quantity : 0;
        });

        context = 'Một số sản phẩm nổi bật:\n' +
          variants.map((v) => `- ${v.product_id?.name || 'N/A'} (${v.product_id?.brand?.name || 'N/A'}) - Size: ${v.size?.size || 'N/A'} - Màu: ${v.color?.name || 'N/A'} - Giá: ${v.price ?? 'N/A'}`).join('\n');
      }

      const productDetails = variants.length > 0
        ? variants.map((v) => [
          `Tên: ${v.product_id?.name || 'N/A'}`,
          `Giá: ${v.price ?? 'N/A'}`,
          `Màu: ${v.color?.name || 'N/A'}`,
          `Size: ${Array.isArray(v.size) ? v.size.map((s) => s.size).join(', ') : v.size?.size ?? 'N/A'}`,
          `Tồn kho: ${v.stockInfo ?? 'Không rõ'}`,
          `Thương hiệu: ${v.product_id?.brand?.name || 'N/A'}`,
          `Danh mục: ${v.product_id?.category?.name || 'N/A'}`,
        ].join(' | ')).join('\n')
        : '';

      const fullContext = (context ? context + '\n' : '') + (productDetails ? `Chi tiết sản phẩm:\n${productDetails}` : '');

      aiReply = await askGeminiWithTimeout(contextMessage, fullContext, 8000);
      if (aiReply.includes('bot gặp sự cố')) {
        aiReply = await askGeminiWithTimeout(contextMessage, fullContext, 8000);
      }

      const aiUser = await getOrCreateBotUser();
      if (!aiUser || !aiUser._id) {
        return res.status(500).json({ message: 'Lỗi hệ thống AI' });
      }

      const aiMessage = await Message.create({
        chatRoom_id: chatRoom._id,
        sender_id: aiUser._id,
        receiver_id: userId,
        content: aiReply,
        type: 'text',
      });

      await ChatRoom.findByIdAndUpdate(chatRoom._id, { $set: { lastMessage: aiMessage._id } });

    }

    const messages = await Message.find({ chatRoom_id: chatRoom._id })
      .populate('sender_id', 'username role')
      .sort({ createdAt: 1 })
      .lean();

    return res.status(200).json({
      message: 'Tin nhắn đã được gửi và AI đã trả lời',
      aiReply,
      chatHistory: messages,
    });
  } catch (error) {
    console.error('Lỗi postMessageUser:', error);
    return res.status(500).json({ message: 'Lỗi khi gửi tin nhắn', error: error.message });
  }
};

//  Endpoint: Admin gửi tin nhắn và tham gia phòng chat
export const postMessageAdmin = async (req, res) => {
  try {
    const { chatRoomId } = req.params;
    const { content } = req.body;
    const adminId = req.user._id;

    if (!chatRoomId || !mongoose.Types.ObjectId.isValid(chatRoomId)) {
      return res.status(400).json({ message: 'Yêu cầu chatRoomId hợp lệ' });
    }
    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ message: 'Yêu cầu nội dung tin nhắn' });
    }

    let imageUrls = [];
    if (req.files && req.files.length > 0) {
      imageUrls = req.files.map(file => `http://localhost:3000/uploads/${file.filename}`);
    }

    const MAX_IMAGES = 5;
    if (imageUrls.length > MAX_IMAGES) {
      if (req.files && req.files.length > 0) deleteOldUploadedImages(req.files);
      return res.status(400).json({ message: `Tối đa ${MAX_IMAGES} ảnh` });
    }

    const admin = await User.findById(adminId, 'username');
    if (!admin) {
      return res.status(404).json({ message: 'Không tìm thấy admin' });
    }

    let chatRoom = await ChatRoom.findById(chatRoomId);
    if (!chatRoom) return res.status(404).json({ message: 'Không tìm thấy phòng chat' });

    if (!chatRoom.participants.includes(adminId)) {
      const systemMessage = await Message.create({
        chatRoom_id: chatRoom._id,
        sender_id: adminId,
        receiver_id: null,
        content: `${admin.username} đã tham gia cuộc trò chuyện.`,
        type: 'system',
      });

      chatRoom = await ChatRoom.findByIdAndUpdate(
        chatRoomId,
        {
          $addToSet: { participants: adminId },
          $set: { isEmployeeJoined: true, lastMessage: systemMessage._id },
        },
        { new: true }
      );

    }

    const newMessage = await Message.create({
      chatRoom_id: chatRoom._id,
      sender_id: adminId,
      receiver_id: chatRoom.participants.find((id) => id.toString() !== adminId.toString()) || null,
      content: content.trim(),
      type: 'text',
      images: imageUrls,
    });

    await ChatRoom.findByIdAndUpdate(
      chatRoomId,
      {
        $set: {
          lastMessage: newMessage._id,
          lastEmployeeMessageAt: new Date()
        }
      }
    );


    const populatedMessage = await Message.findById(newMessage._id)
      .populate('sender_id', 'username role')
      .lean();

    return res.status(200).json({
      message: 'Tin nhắn đã được gửi',
      newMessage: populatedMessage,
    });

  } catch (error) {
    console.error('Lỗi postMessageAdmin:', error);
    return res.status(500).json({ message: 'Lỗi khi gửi tin nhắn', error: error.message });
  }
};

// Endpoint: Admin chỉnh sửa tin nhắn trong vòng 1 giờ
export const putMessage = async (req, res) => {
  try {
    const { messageId, content } = req.body;
    const adminId = req.user?._id;

    if (!messageId || !content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ message: 'Yêu cầu messageId và nội dung tin nhắn' });
    }

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ message: 'Không tìm thấy tin nhắn' });
    if (message.sender_id.toString() !== adminId.toString()) {
      return res.status(403).json({ message: 'Bạn chỉ có thể chỉnh sửa tin nhắn của chính mình' });
    }

    const timeSinceSent = Date.now() - new Date(message.createdAt).getTime();
    if (timeSinceSent > ONE_HOUR_MS) {
      return res.status(403).json({ message: 'Chỉ có thể chỉnh sửa tin nhắn trong vòng 1 giờ sau khi gửi' });
    }

    message.content = content.trim();
    await message.save();


    return res.status(200).json({
      message: 'Tin nhắn đã được chỉnh sửa',
      updatedMessage: message,
    });
  } catch (error) {
    console.error('Lỗi putMessage:', error);
    return res.status(500).json({ message: 'Lỗi khi chỉnh sửa tin nhắn', error: error.message });
  }
};