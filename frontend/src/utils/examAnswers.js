// frontend/src/utils/examAnswers.js
//
// Chuẩn hoá việc so khớp "đáp án đúng" cho câu hỏi trắc nghiệm (SINGLE_CHOICE,
// MULTIPLE_CHOICE, TRUE_FALSE). Tuỳ luồng tạo đề, correct_answers trong DB có thể ở
// MỘT TRONG BA định dạng khác nhau:
//   - Mảng chỉ số 0-based, ví dụ "[0,1,3]" (tạo đề thủ công lưu index của checkbox)
//   - Chữ cái, ví dụ "A" hoặc "A, C" (đề do AI sinh)
//   - Nguyên văn nội dung lựa chọn, ví dụ "Có, cÓ, có" (chỉnh sửa qua ManageDeckModal)
// Trước đây các trang thi (ExamQuestion/ExamResult) chỉ đoán "chữ cái" bằng cách lấy
// KÝ TỰ ĐẦU của text lựa chọn — sai hoàn toàn khi nhiều lựa chọn trùng ký tự đầu
// (vd "Có" / "cÓ" / "có") hoặc khi correct_answers là mảng chỉ số thô. Ở đây so khớp
// theo VỊ TRÍ (index) của option trong mảng options, không phụ thuộc nội dung text.

export const parseOptionsList = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const parseRawAnswerList = (raw) => {
  if (raw === null || raw === undefined || raw === "") return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return String(raw)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
};

export const getOptionLetter = (index) => String.fromCharCode(65 + index);

// Trả về mảng index (0-based, đã loại trùng) của các lựa chọn ĐÚNG.
// Thứ tự ưu tiên: khớp nguyên văn nội dung > chữ cái theo vị trí > chỉ số theo vị trí
// (nguyên văn được ưu tiên vì rõ ràng nhất, ít khả năng trùng lặp/nhầm lẫn nhất).
export const resolveCorrectIndexes = (correctAnswersRaw, options) => {
  const answers = parseRawAnswerList(correctAnswersRaw);
  const safeOptions = Array.isArray(options) ? options : [];
  const indexes = new Set();

  answers.forEach((ans) => {
    const ansStr = String(ans).trim();
    if (ansStr === "") return;
    const normalizedAns = ansStr.toLowerCase();

    let matchedByText = false;
    safeOptions.forEach((opt, idx) => {
      const normalizedOpt = String(opt || "").trim().toLowerCase();
      const strippedOpt = normalizedOpt.replace(/^[a-d][.)]\s*/, "");
      if (normalizedOpt === normalizedAns || strippedOpt === normalizedAns) {
        indexes.add(idx);
        matchedByText = true;
      }
    });
    if (matchedByText) return;

    if (/^[A-Z]$/i.test(ansStr)) {
      const idx = ansStr.toUpperCase().charCodeAt(0) - 65;
      if (idx >= 0 && idx < safeOptions.length) indexes.add(idx);
      return;
    }

    if (/^\d+$/.test(ansStr)) {
      const idx = Number(ansStr);
      if (idx >= 0 && idx < safeOptions.length) indexes.add(idx);
    }
  });

  return [...indexes];
};

export const isOptionCorrect = (optionIndex, correctAnswersRaw, options) =>
  resolveCorrectIndexes(correctAnswersRaw, options).includes(optionIndex);

// Dùng cho hiển thị: trả về nhãn chữ cái đọc được (vd "A, C") thay vì in thẳng dữ
// liệu thô (chỉ số, hoặc text) đang lưu trong DB.
export const getCorrectAnswerLettersLabel = (correctAnswersRaw, options) => {
  const indexes = resolveCorrectIndexes(correctAnswersRaw, options).sort(
    (a, b) => a - b,
  );
  if (indexes.length === 0) return "";
  return indexes.map(getOptionLetter).join(", ");
};

// ==========================================================================
// CÂU HỎI ĐIỀN KHUYẾT (FILL_BLANK)
// ==========================================================================
// correct_answers của FILL_BLANK cũng lệch định dạng giữa 2 luồng tạo đề:
//   - Đề AI sinh: text thường, ví dụ "bố"
//   - Tạo đề thủ công: mảng JSON, ví dụ "[\"bố\"]" (kể cả khi chỉ có 1 chỗ trống)
// Trước đây các trang thi so sánh trực tiếp String(correct_answers) với câu trả
// lời của người dùng, nên với dữ liệu dạng mảng thì KHÔNG BAO GIỜ đúng, và phần
// hiển thị "Đáp án đúng" cũng in thẳng ra chuỗi JSON xấu xí kiểu ["bố"].
export const parseFillBlankAnswers = (raw) => {
  if (raw === null || raw === undefined || raw === "") return [];
  if (Array.isArray(raw)) return raw.map((s) => String(s).trim()).filter(Boolean);
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((s) => String(s).trim()).filter(Boolean);
    }
    return [String(parsed).trim()].filter(Boolean);
  } catch {
    return [String(raw).trim()].filter(Boolean);
  }
};

export const isFillBlankCorrect = (userInput, correctAnswersRaw) => {
  const userNormalized = String(userInput || "").trim().toLowerCase();
  if (!userNormalized) return false;
  return parseFillBlankAnswers(correctAnswersRaw).some(
    (ans) => ans.toLowerCase() === userNormalized,
  );
};

// Dùng cho hiển thị: nhãn đáp án gọn gàng (vd "bố"), loại trùng khi câu hỏi có
// nhiều chỗ trống nhưng cùng chung 1 từ đáp án.
export const getFillBlankAnswerLabel = (correctAnswersRaw) =>
  [...new Set(parseFillBlankAnswers(correctAnswersRaw))].join(", ");

// Che các cụm bị đục lỗ trong nội dung câu hỏi FILL_BLANK, ví dụ "Con [mèo] con"
// -> "Con [...] con", để không lộ luôn đáp án ngay trên đề bài.
export const maskFillBlankQuestion = (text) =>
  String(text || "").replace(/\[([^\]]*)\]/g, "[...]");
