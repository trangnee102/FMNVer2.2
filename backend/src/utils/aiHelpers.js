// backend/src/utils/aiHelpers.js

/**
 * 1. Dọn dẹp và parse an toàn chuỗi JSON trả về từ AI
 */
const safeParseJSON = (str, fallback = { cards: [] }) => {
  if (!str) return fallback;
  if (typeof str !== "string") return str;

  try {
    // Tìm vị trí bắt đầu của JSON (dấu [ hoặc { ) để gọt sạch mọi text rác rưởi do AI lanh chanh chèn vào
    const firstBracket = str.indexOf("{");
    const firstSquare = str.indexOf("[");

    let startIdx = 0;
    if (firstBracket !== -1 && firstSquare !== -1) {
      startIdx = Math.min(firstBracket, firstSquare);
    } else if (firstBracket !== -1) {
      startIdx = firstBracket;
    } else if (firstSquare !== -1) {
      startIdx = firstSquare;
    }

    let cleanText = str.substring(startIdx);

    // Dọn dẹp nốt đuôi markdown
    cleanText = cleanText
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    const parsedData = JSON.parse(cleanText);

    // 👉 ĐÃ FIX: Chìa khóa vàng ở đây! Nếu AI trả thẳng MẢNG, tự động bọc nó vào biến 'cards'
    if (Array.isArray(parsedData)) {
      return { message: "AI đã tạo mảng thẻ thành công!", cards: parsedData };
    }

    // Nếu trả về đúng Object thì cứ thế mà dùng
    return parsedData;
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

/**
 * 4. BỘ LỌC CẮT GỌT VÀ ÉP BUỘC SỐ LƯỢNG (ANTI-HALLUCINATION ENFORCER)
 * Xử lý tình trạng AI đếm sai số lượng hoặc cố tình lấy câu dễ bù cho câu khó
 */
const enforceQuestionConstraints = (aiQuestions, requestedCounts) => {
  if (!Array.isArray(aiQuestions)) return [];

  // requestedCounts: { easy: 30, medium: 10, hard: 10 }
  const { easy = 0, medium = 0, hard = 0 } = requestedCounts;

  // Phân loại rạch ròi câu hỏi do AI trả về, hỗ trợ cả 2 định dạng ngôn ngữ
  const easyQuestions = aiQuestions.filter(
    (q) => q.difficulty === "EASY" || q.difficulty === "Dễ",
  );
  const mediumQuestions = aiQuestions.filter(
    (q) => q.difficulty === "MEDIUM" || q.difficulty === "Vừa",
  );
  const hardQuestions = aiQuestions.filter(
    (q) => q.difficulty === "HARD" || q.difficulty === "Khó",
  );

  // Cắt đúng số lượng TỐI ĐA được yêu cầu
  const finalEasy = easyQuestions.slice(0, parseInt(easy));
  const finalMedium = mediumQuestions.slice(0, parseInt(medium));
  const finalHard = hardQuestions.slice(0, parseInt(hard));

  // Gộp lại thành mảng cuối cùng và trả về
  return [...finalEasy, ...finalMedium, ...finalHard];
};

module.exports = {
  safeParseJSON,
  shuffleArray,
  autoWrapMath,
  enforceQuestionConstraints,
};