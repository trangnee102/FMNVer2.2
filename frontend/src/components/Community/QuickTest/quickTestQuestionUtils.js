// 👉 Helper dùng chung cho cả 2 chế độ QuickTest (Tự do / Đồng bộ), thay cho 2 đoạn logic
// trộn câu hỏi từng lặp lại riêng (và không nhất quán) trước đây trong QuickTestModalManager.jsx.

export const shuffleArray = (array) => {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

export const parseOptions = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return [String(parsed)];
  } catch {
    return String(raw)
      .split(/[|,;\n]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
};

const mapCardToQuestion = (card) => ({
  id: card.id,
  text: card.question || card.front_content || card.prompt || "",
  options: parseOptions(card.options || card.Options || card.choices || []),
  correctAnswers: card.correct_answers || card.correctAnswer || card.answer || "",
  correctAnswer: card.correct_answers || card.correctAnswer || card.answer || "",
  answer: card.answer || card.correct_answers || "",
  type: card.question_type || card.QuestionType || "SINGLE_CHOICE",
  explanation: card.explanation || card.Explanation || card.note || card.reason || "",
});

// 👉 Chạy MỘT LẦN DUY NHẤT, bên giáo viên, lúc tạo phòng: lọc theo độ khó, trộn thứ tự
// (nếu bật), cắt theo số lượng câu -> ra "hồ câu hỏi gốc" sẽ được chốt lại thành
// questionOrder (mảng id) gửi lên server, làm nguồn sự thật duy nhất cho cả phòng.
export const buildQuestionPool = (cards, settings) => {
  const filtered = (cards || []).filter((card) => {
    if (settings.difficulty !== "ALL" && card.difficulty) {
      return String(card.difficulty).toUpperCase() === settings.difficulty;
    }
    return true;
  });

  const prepared = filtered.map(mapCardToQuestion);
  const ordered = settings.randomQuestions ? shuffleArray(prepared) : prepared;
  return ordered.slice(0, Math.max(1, Number(settings.questionCount) || 1));
};

// 👉 Hàm thống nhất thay cho 2 đoạn logic cũ (loadQuestionsForDeck/fetchQuestionsForRoom):
// - flashcards: toàn bộ câu hỏi gốc của đề (Exam.Flashcards trả về từ getRoom)
// - questionOrder: mảng id đã CHỐT lúc tạo phòng (room.questionOrder từ DB)
// - settings.randomAnswers: trộn thứ tự đáp án — luôn an toàn áp dụng độc lập mỗi client
//   vì chấm điểm dựa vào NỘI DUNG đáp án, không dựa vào vị trí hiển thị.
// - shuffleOrder: true  -> mỗi học sinh tự trộn 1 bản thứ tự câu riêng (chế độ Tự do)
//                 false -> giữ nguyên thứ tự gốc (chế độ Đồng bộ, và bản xem trước của host)
export const hydrateQuestionsFromOrder = (flashcards, questionOrder, settings = {}, { shuffleOrder = false } = {}) => {
  const cardsById = new Map((flashcards || []).map((c) => [c.id, c]));
  const ids = Array.isArray(questionOrder) && questionOrder.length > 0
    ? questionOrder
    : (flashcards || []).map((c) => c.id);

  const orderedIds = shuffleOrder ? shuffleArray(ids) : ids;

  return orderedIds
    .map((id) => cardsById.get(id))
    .filter(Boolean)
    .map((card) => {
      const q = mapCardToQuestion(card);
      return {
        ...q,
        options: settings.randomAnswers && q.options.length > 0 ? shuffleArray(q.options) : q.options,
      };
    });
};

// 👉 Không trộn lại thứ tự câu mỗi lần học sinh tải lại trang — chốt 1 lần, nhớ qua sessionStorage
const shuffleKey = (roomCode) => `quicktest_${roomCode}_shuffle`;

export const getStoredQuestionOrder = (roomCode) => {
  try {
    const raw = sessionStorage.getItem(shuffleKey(roomCode));
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const storeQuestionOrder = (roomCode, orderedIds) => {
  try {
    sessionStorage.setItem(shuffleKey(roomCode), JSON.stringify(orderedIds));
  } catch {
    // sessionStorage không khả dụng (chế độ ẩn danh chặn...) — bỏ qua, không ảnh hưởng luồng chính
  }
};

// 👉 Giữ nguyên danh tính (participantId) khi tải lại trang, tránh tạo participant mới
// (mất điểm cũ) và tránh phá vỡ ý nghĩa "không trộn lại" ở trên.
const identityKey = (roomCode) => `quicktest_${roomCode}_identity`;

export const getStoredIdentity = (roomCode) => {
  try {
    const raw = sessionStorage.getItem(identityKey(roomCode));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const storeIdentity = (roomCode, identity) => {
  try {
    sessionStorage.setItem(identityKey(roomCode), JSON.stringify(identity));
  } catch {
    // sessionStorage không khả dụng — bỏ qua, không ảnh hưởng luồng chính
  }
};

// 👉 Ràng buộc tên học sinh: tối thiểu 2 ký tự sau khi trim, phải có ít nhất 1 ký tự chữ/số thật
// (Unicode-aware nên tên tiếng Việt có dấu không bị hiểu nhầm là "chỉ toàn ký hiệu")
export const isValidParticipantName = (name) => {
  const trimmed = String(name || "").trim();
  if (trimmed.length < 2) return false;
  return /[\p{L}\p{N}]/u.test(trimmed);
};
