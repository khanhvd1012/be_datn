// src/controllers/chat_CTL.js
import ChatRoom from '../models/chatRoom_MD';
import Message from '../models/message_MD';
import { askGemini } from '../services/geminiService';
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';

dotenv.config();

// Sử dụng model đúng tên và phiên bản, ví dụ: 'gemini-1.5-flash' cho v1beta
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

export const askGemini = async (question, context = '') => {
    try {
        const prompt = `Bạn là trợ lý tư vấn bán giày. Hãy trả lời thân thiện và chuyên nghiệp.
        
        Context về sản phẩm:
        ${context}
        
        Câu hỏi của khách hàng: ${question}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        // Bổ sung thông báo lỗi quá tải model Gemini
        if (error.status === 503) {
            return 'Xin lỗi, hệ thống AI đang quá tải. Vui lòng thử lại sau hoặc liên hệ với nhân viên hỗ trợ!';
        }
        console.error('Gemini API error:', error);
        return 'Xin lỗi, hiện tại tôi không thể trả lời câu hỏi này. Bạn có thể thử lại sau hoặc liên hệ với nhân viên của chúng tôi.';
    }
};