// backend/checkKey.js
require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function checkApiKey() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log("❌ Không tìm thấy GEMINI_API_KEY trong file .env!");
    return;
  }

  console.log("🔍 Đang kiểm tra API Key...");
  const genAI = new GoogleGenerativeAI(apiKey);

  try {
    // 👉 ĐÃ FIX: Dùng "gemini-3.5-flash-lite" để có quota 1000 lượt/ngày
    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash-lite" });
    const result = await model.generateContent("Hello");

    console.log("✅ API Key HOẠT ĐỘNG TỐT!");
    console.log("🔑 Khóa đang dùng:", apiKey.substring(0, 10) + "...");
    console.log("💡 Phản hồi từ Google:", result.response.text().trim());
  } catch (error) {
    console.error("❌ API Key bị lỗi hoặc không hợp lệ!");
    console.error("Chi tiết lỗi từ Google:", error.message);
  }
}

checkApiKey();
