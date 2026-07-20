// DÁN LẠI CHÌA KHÓA AIza... CỦA CẬU VÀO ĐÂY NHÉ
require("dotenv").config();

const API_KEY = process.env.GEMINI_API_KEY;
async function scanModels() {
  try {
    console.log("🔍 Đang ép Google khai báo danh sách AI khả dụng...");
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`,
    );
    const data = await response.json();

    if (data.models && data.models.length > 0) {
      console.log("✅ TÌM THẤY RỒI! Cậu được phép dùng các model này:");
      const names = data.models.map((m) => m.name.replace("models/", ""));
      console.log("- " + names.join("\n- "));
    } else {
      console.log("❌ TÀI KHOẢN BỊ CHẶN! Google trả về:", data);
    }
  } catch (error) {
    console.error("Lỗi mạng:", error);
  }
}

scanModels();
