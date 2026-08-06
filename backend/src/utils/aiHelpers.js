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

/**
 * 5. KIỂM TRA "BÁM SÁT TÀI LIỆU" (GROUNDING CHECK) — KHÔNG CẦN GỌI THÊM AI
 * Prompt chỉ NHẮC AI đừng bịa, không RÀNG BUỘC được — hàm này so trực tiếp
 * "source_reference" AI trả về với tài liệu gốc bằng string-matching thuần,
 * để phát hiện khả năng câu hỏi/trích dẫn bị AI bịa ra chứ không thật sự có
 * trong tài liệu người dùng cung cấp.
 */
const normalizeForMatch = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFC")
    .replace(/\s+/g, " ")
    .trim();

const computeGroundingScore = (reference, sourceText) => {
  const normRef = normalizeForMatch(reference);
  const normSource = normalizeForMatch(sourceText);
  if (!normRef) return 0;

  // Fast path: khớp gần như nguyên văn (sau khi chuẩn hoá khoảng trắng/hoa-thường)
  if (normSource.includes(normRef)) return 1;

  // Fallback: bao nhiêu % từ "có nghĩa" (>=4 ký tự, bỏ qua từ nối ngắn) của
  // source_reference thực sự xuất hiện đâu đó trong tài liệu gốc — AI thường
  // diễn đạt lại đôi chút nên không đòi khớp nguyên văn, chỉ cần đủ trùng khớp
  const words = normRef.split(" ").filter((w) => w.length >= 4);
  if (words.length === 0) return 0;
  const matched = words.filter((w) => normSource.includes(w)).length;
  return matched / words.length;
};

// 👉 threshold mặc định 0.6: dưới mức này coi là "khả nghi", cần giáo viên xem lại
const verifyQuestionsGrounding = (questions, sourceText, threshold = 0.6) => {
  if (!Array.isArray(questions)) return [];
  return questions.map((q) => {
    const groundingScore = computeGroundingScore(q.source_reference, sourceText);
    return {
      ...q,
      groundingScore: Math.round(groundingScore * 100) / 100,
      groundingSuspicious: !!q.source_reference && groundingScore < threshold,
    };
  });
};

// 👉 Đếm số câu văn trong trích dẫn (dựa vào dấu kết câu . ! ?) — tín hiệu chính xác hơn
// đếm từ để nhận ra "trích dẫn chỉ gói gọn trong ĐÚNG 1 câu văn", khớp sát nghĩa với chính
// định nghĩa EASY đã viết trong prompt ("chỉ cần tìm và chép lại đúng 1 câu duy nhất")
const countSentences = (text) => {
  const trimmed = String(text || "").trim();
  if (!trimmed) return 0;
  const matches = trimmed.match(/[.!?]+/g);
  return matches ? matches.length : 1;
};

/**
 * 6. DÒ NHÃN "KHÓ"/"VỪA" GIẢ (KHÔNG CẦN GỌI THÊM AI) — CHỈ CẢNH BÁO, KHÔNG TỰ ĐỔI GIÁ TRỊ
 * Bắt đúng kiểu lỗi thực tế đã gặp: AI dán nhãn HARD/MEDIUM cho câu hỏi thực chất chỉ là
 * NHỚ LẠI đơn thuần (để cho đủ số lượng đã cấu hình). Kết hợp 2 nguồn tín hiệu ĐỘC LẬP:
 * (a) thuật toán tự đo — trích dẫn (source_reference) chỉ gói gọn trong 1 câu văn (hoặc rất
 *     ngắn) VÀ gần như NGUYÊN VĂN so với tài liệu gốc (groundingScore cao);
 * (b) chính AI tự thú nhận qua "requires_reasoning: false" (xem prompt — được dặn trả lời
 *     TRUNG THỰC, độc lập với "difficulty" đã chọn theo ma trận).
 * CHỈ gắn cờ để giáo viên tự xem lại và tự quyết định — KHÔNG tự ý đổi trường "difficulty"
 * (giáo viên không muốn hệ thống tự hạ nhãn thay mình, kể cả khi tín hiệu khá chắc chắn).
 * PHẢI chạy SAU verifyQuestionsGrounding (cần groundingScore đã tính sẵn).
 */
const flagDifficultyMismatch = (questions, { maxWords = 25, minGroundingScore = 0.9 } = {}) => {
  if (!Array.isArray(questions)) return [];
  return questions.map((q) => {
    if ((q.difficulty !== "HARD" && q.difficulty !== "MEDIUM") || !q.source_reference) return q;

    const sentenceCount = countSentences(q.source_reference);
    const wordCount = normalizeForMatch(q.source_reference).split(" ").filter(Boolean).length;
    const isNearVerbatim = (q.groundingScore ?? 0) >= minGroundingScore;
    const heuristicSuspicious = isNearVerbatim && (sentenceCount <= 1 || wordCount <= maxWords);
    const selfCheckSuspicious = q.requires_reasoning === false;
    const difficultySuspicious = heuristicSuspicious || selfCheckSuspicious;

    return { ...q, difficultySuspicious, difficultySelfCheckFlagged: selfCheckSuspicious };
  });
};

module.exports = {
  safeParseJSON,
  shuffleArray,
  autoWrapMath,
  enforceQuestionConstraints,
  computeGroundingScore,
  verifyQuestionsGrounding,
  flagDifficultyMismatch,
};