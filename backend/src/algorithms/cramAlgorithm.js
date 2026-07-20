// backend/src/algorithms/cramAlgorithm.js

/**
 * Thuật toán phân phối và sắp xếp thẻ cho chế độ Cram Mode (Ôn thi cấp tốc)
 * @param {Array} allCards - Toàn bộ danh sách flashcard của bộ thẻ
 * @param {string} examDateStr - Ngày thi (Định dạng YYYY-MM-DD)
 * @param {string} currentDateStr - Ngày hiện tại (Để hỗ trợ cỗ máy thời gian giả lập từ Frontend)
 * @param {number} bossModePercent - Tỷ lệ % lọc thẻ khó ngày cuối (Mặc định: 30)
 * @param {number} dailyQuota - Chỉ tiêu học ngày thường (Mặc định: 50)
 * @param {Object} forgetHistory - Sổ thù vặt lưu số lần quên của từng thẻ { cardId: count }
 */
const runCramAlgorithm = ({
  allCards,
  examDateStr,
  currentDateStr,
  bossModePercent = 30,
  dailyQuota = 50,
  forgetHistory = {},
}) => {
  // 👉 ĐÃ SỬA LỖI: Trả về Object đúng cấu trúc thay vì mảng [] để tránh sập Frontend
  if (!allCards || allCards.length === 0) {
    return {
      cards: [],
      isBossMode: false,
      daysLeft: 999,
    };
  }

  // 1. Gắn số lần quên từ lịch sử vào từng thẻ để tính điểm khó
  const preparedCards = allCards.map((card) => ({
    ...card,
    points: 0, // Điểm tốt nghiệp tạm thời cho phiên học
    forgetCount: forgetHistory[card.id] || 0,
  }));

  // 2. Tính số ngày còn lại đến ngày thi
  let daysLeft = 999;
  if (examDateStr) {
    const today = currentDateStr ? new Date(currentDateStr) : new Date();
    today.setHours(0, 0, 0, 0);

    const examDate = new Date(examDateStr);
    examDate.setHours(0, 0, 0, 0);

    const diffTime = examDate - today;
    daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  let finalPool = [];

  // KỊCH BẢN A: Ngày cuối cùng trước khi thi (Days Left == 1) -> Kích hoạt BOSS MODE 🚨
  if (daysLeft === 1) {
    // Sắp xếp toàn bộ thẻ theo số lần quên giảm dần (thẻ hay quên nhất lên đầu)
    const sortedByForget = [...preparedCards].sort(
      (a, b) => b.forgetCount - a.forgetCount,
    );

    if (preparedCards.length <= 50) {
      // Nếu bộ thẻ nhỏ (<= 50 thẻ): Ôn hết cả bộ, nhưng xếp thẻ hay quên lên trước
      finalPool = sortedByForget;
    } else {
      // Nếu bộ thẻ lớn (> 50 thẻ): Lọc theo tỷ lệ % Boss Mode + 20% ngẫu nhiên
      const topForgetCount = Math.ceil(
        (bossModePercent / 100) * sortedByForget.length,
      );
      const topForgetCards = sortedByForget.slice(0, topForgetCount);

      const remainingCards = sortedByForget.slice(topForgetCount);
      const randomCount = Math.ceil(0.2 * preparedCards.length);
      const randomCards = remainingCards
        .sort(() => 0.5 - Math.random())
        .slice(0, randomCount);

      finalPool = [...topForgetCards, ...randomCards];
    }
  }
  // KỊCH BẢN B: Ngày thường nhưng bộ thẻ nhỏ (< 50 thẻ) -> Học hết luôn cho nhanh
  else if (preparedCards.length < 50) {
    finalPool = preparedCards.sort(() => 0.5 - Math.random());
  }
  // KỊCH BẢN C: Ngày thường và bộ thẻ lớn (>= 50 thẻ) -> Chia theo chỉ tiêu (Quota) để tránh quá tải
  else {
    const shuffled = preparedCards.sort(() => 0.5 - Math.random());
    finalPool = shuffled.slice(0, dailyQuota);
  }

  return {
    cards: finalPool,
    isBossMode: daysLeft === 1,
    daysLeft: daysLeft,
  };
};

module.exports = { runCramAlgorithm };
