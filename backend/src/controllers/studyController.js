// backend/src/controllers/studyController.js
const prisma = require("../services/prisma");
const { calculateSM2 } = require("../algorithms/forgettingCurve");
const jwt = require("jsonwebtoken");
const { shuffleArray } = require("../utils/aiHelpers");

const extractUserId = (req) => {
  let userId = req.user?.id || req.userId || req.user?.userId;

  if (!userId && req.headers.authorization?.startsWith("Bearer ")) {
    try {
      const token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      userId = decoded.id || decoded.userId;
    } catch (error) {
      console.error("Lỗi dịch token dự phòng:", error.message);
    }
  }
  return userId;
};

// ==========================================
// TÍNH NĂNG 1: HỌC FLASHCARD (THUẬT TOÁN SM-2 CŨ - GIỮ NGUYÊN)
// ==========================================

const reviewCard = async (req, res) => {
  try {
    const userId = extractUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Không tìm thấy thông tin xác thực hoặc Token đã hết hạn!",
      });
    }

    const cardId = req.body.flashcard_id || parseInt(req.params.cardId);

    const frontendGrade =
      req.body.rating !== undefined ? req.body.rating : req.body.grade;
    const durationMs = req.body.duration_ms || 12000;

    if (![1, 2, 3, 4].includes(frontendGrade)) {
      return res.status(400).json({
        success: false,
        message: "Điểm đánh giá phải là 1, 2, 3 hoặc 4!",
      });
    }

    const normalizedGrade = frontendGrade - 1;

    const [card, progress] = await Promise.all([
      prisma.flashcards.findUnique({
        where: { id: cardId },
        select: { deck_id: true },
      }),
      prisma.studyProgress.findFirst({
        where: { flashcard_id: cardId, user_id: userId },
      }),
    ]);

    if (!card) {
      return res.status(404).json({
        success: false,
        message: "Thẻ này đã bay màu hoặc không tồn tại!",
      });
    }

    const deck = await prisma.decks.findUnique({
      where: { id: card.deck_id },
      select: { user_id: true },
    });

    if (!deck || deck.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền chấm điểm thẻ này!",
      });
    }

    let currentProgress = progress;
    if (!currentProgress) {
      currentProgress = await prisma.studyProgress.create({
        data: {
          flashcard_id: cardId,
          user_id: userId,
          ease_factor: 2.5,
          interval: 0,
          repetitions: 0,
        },
      });
    }

    const { newEaseFactor, newInterval, newRepetitions } = calculateSM2(
      normalizedGrade,
      currentProgress.ease_factor,
      currentProgress.interval,
      currentProgress.repetitions,
    );

    let nextReviewDate = new Date();
    if (normalizedGrade === 0) {
      nextReviewDate.setMinutes(nextReviewDate.getMinutes() - 1);
    } else {
      nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);
      nextReviewDate.setHours(0, 0, 0, 0);
    }

    const updatedProgress = await prisma.studyProgress.update({
      where: { id: currentProgress.id },
      data: {
        ease_factor: newEaseFactor,
        interval: newInterval,
        repetitions: newRepetitions,
        next_review_date: nextReviewDate,
      },
    });

    await prisma.studyLogs.create({
      data: {
        user_id: userId,
        flashcard_id: cardId,
        deck_id: card.deck_id,
        rating: frontendGrade,
        duration_ms: durationMs,
      },
    });

    res.json({
      success: true,
      message:
        normalizedGrade === 0
          ? "Thẻ đã được ghim lại để ôn tiếp ngay bây giờ!"
          : "Đã cập nhật chu kỳ ôn tập!",
      data: updatedProgress,
    });
  } catch (error) {
    console.error("Lỗi Review:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi hệ thống chấm điểm!",
      error: error.message,
    });
  }
};

const getDueCards = async (req, res) => {
  try {
    const userId = extractUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Vui lòng đăng nhập lại (Không tìm thấy thông tin user)!",
      });
    }

    const deckId = parseInt(req.params.deckId);

    const deck = await prisma.decks.findUnique({
      where: { id: deckId },
      select: { user_id: true },
    });

    if (!deck || deck.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền truy cập vào bộ thẻ này!",
      });
    }

    const clientDateString = req.query.currentDate;

    const today = clientDateString ? new Date(clientDateString) : new Date();
    today.setHours(23, 59, 59, 999);

    const isForceReview = req.query.force === "true";

    const flashcards = await prisma.flashcards.findMany({
      where: { deck_id: deckId },
      include: {
        StudyProgress: { where: { user_id: userId } },
      },
    });

    let dueCards = flashcards;

    if (!isForceReview) {
      dueCards = flashcards.filter((card) => {
        const prog = card.StudyProgress[0];
        if (!prog) return true;

        return new Date(prog.next_review_date) <= today;
      });
    }

    res.json({
      success: true,
      message: isForceReview
        ? `Đã mở khóa toàn bộ ${dueCards.length} thẻ!`
        : `Tìm thấy ${dueCards.length} thẻ cần ôn tập!`,
      data: dueCards,
    });
  } catch (error) {
    console.error("Lỗi getDue:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi tìm thẻ ôn tập!",
      error: error.message,
    });
  }
};

// ==========================================
// TÍNH NĂNG 2: THI TRẮC NGHIỆM - TRỘN ĐỀ THÔNG MINH
// ==========================================

const generateRandomExam = async (req, res) => {
  try {
    const userId = extractUserId(req);
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Vui lòng đăng nhập lại!" });
    }

    const deckId = parseInt(req.params.deckId);

    // 👉 ĐÃ SỬA: Đọc tham số chi tiết từ Client gửi lên
    const limit = parseInt(req.query.limit) || 0; // Tương thích ngược với App cũ
    const easyCount = parseInt(req.query.easyCount) || 0;
    const mediumCount = parseInt(req.query.mediumCount) || 0;
    const hardCount = parseInt(req.query.hardCount) || 0;

    const deck = await prisma.decks.findUnique({
      where: { id: deckId },
    });

    if (!deck) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy bộ đề này!" });
    }

    // Lấy toàn bộ câu hỏi của đề
    const allQuestions = await prisma.flashcards.findMany({
      where: { deck_id: deckId },
    });

    if (allQuestions.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không có câu hỏi nào trong ngân hàng đề này!",
      });
    }

    let finalExam = [];

    // 👉 THUẬT TOÁN 1: Chạy theo cấu hình Phân loại (Nếu Client có truyền)
    if (easyCount > 0 || mediumCount > 0 || hardCount > 0) {
      // Phân nhóm câu hỏi
      const easys = allQuestions.filter((q) => q.difficulty === "EASY");
      const mediums = allQuestions.filter((q) => q.difficulty === "MEDIUM");
      const hards = allQuestions.filter((q) => q.difficulty === "HARD");

      // Trộn và lấy số lượng yêu cầu (Nếu số lượng yêu cầu > thực tế thì lấy tối đa)
      finalExam = [
        ...shuffleArray(easys).slice(0, easyCount),
        ...shuffleArray(mediums).slice(0, mediumCount),
        ...shuffleArray(hards).slice(0, hardCount),
      ];

      // Nếu không gom đủ (do Client yêu cầu số câu lớn hơn DB có)
      const requestedTotal = easyCount + mediumCount + hardCount;
      if (finalExam.length < requestedTotal) {
        // Lấy những câu còn thừa chưa được chọn bù vào cho đủ số lượng (bất chấp độ khó)
        const selectedIds = new Set(finalExam.map((q) => q.id));
        const remainingQuestions = allQuestions.filter(
          (q) => !selectedIds.has(q.id),
        );
        const missingCount = requestedTotal - finalExam.length;

        finalExam = [
          ...finalExam,
          ...shuffleArray(remainingQuestions).slice(0, missingCount),
        ];
      }
    }
    // 👉 THUẬT TOÁN 2: Chạy theo cấu hình Limit đơn thuần (Tương thích ngược)
    else {
      finalExam = shuffleArray(allQuestions).slice(0, limit > 0 ? limit : 20);
    }

    // Cuối cùng: Trộn lại toàn bộ đề một lần nữa để Easy/Medium/Hard đan xen nhau
    const shuffledFinalExam = shuffleArray(finalExam);

    res.json({
      success: true,
      message: `Đã chuẩn bị xong đề thi gồm ${shuffledFinalExam.length} câu!`,
      data: shuffledFinalExam,
    });
  } catch (error) {
    console.error("Lỗi generateRandomExam:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi hệ thống khi tạo đề thi ngẫu nhiên!",
    });
  }
};

module.exports = {
  reviewCard,
  getDueCards,
  generateRandomExam,
};
