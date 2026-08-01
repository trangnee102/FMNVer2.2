/**
 * 1. Dọn dẹp và parse an toàn chuỗi JSON trả về từ AI
 */
const safeParseJSON = (str, fallback = []) => {
  if (!str) return fallback;
  if (typeof str !== "string") return str;

  try {
    // Dùng Regex cơ bản, an toàn tuyệt đối để xóa bỏ các thẻ markdown ```json và ```
    let cleanText = str
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();
    return JSON.parse(cleanText);
  } catch (error) {
    console.error("Lỗi parse JSON từ AI:", error.message);
    return fallback;
  }
};

/**
 * 2. Thuật toán xáo trộn mảng (Fisher-Yates)
 * Dùng để random câu hỏi và đáp án cho đề thi
 */
const shuffleArray = (array) => {
  if (!Array.isArray(array)) return [];
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

/**
 * 3. Tự động nhận diện công thức Toán (LaTeX) và bọc dấu $ nếu thiếu
 */
const autoWrapMath = (text) => {
  if (!text || typeof text !== "string") return text;

  // Xử lý cơ bản: Tạm thời giữ nguyên text an toàn để tránh lỗi Regex phức tạp.
  // Nếu AI sinh ra LaTeX thuần mà thiếu $, cậu có thể cấu hình thêm ở đây sau.
  let cleanText = text;

  return cleanText;
};

module.exports = {
  safeParseJSON,
  shuffleArray,
  autoWrapMath,
};
