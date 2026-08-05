const prisma = require("../services/prisma");
const {
  calculateSM2,
  calculateMemoryRetention,
} = require("../algorithms/forgettingCurve");
const jwt = require("jsonwebtoken");
const { shuffleArray } = require("../utils/aiHelpers");

const extractUserId = (req) => {
  let userId = req.user?.id || req.userId || req.user?.userId;

  if (!userId && req.headers.authorization?.startsWith("Bearer ")) {
    try {
      const token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      userId = decoded.id || decoded.userId;
    } catch (error) {}
  }
  return userId ? parseInt(userId, 10) : null;
};

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

    let currentEaseFactor = 2.5;
    let currentInterval = 0;
    let currentRepetitions = 0;
    let currentMemoryRetention = 100;
    let currentProgressId = null;

    if (progress) {
      currentProgressId = progress.id;
      currentEaseFactor = progress.ease_factor || 2.5;
      currentInterval = progress.interval || 0;
      currentRepetitions = progress.repetitions || 0;

      if (progress.last_review_date) {
        try {
          currentMemoryRetention = calculateMemoryRetention(
            progress.last_review_date,
            progress.interval,
          );
        } catch (e) {
          currentMemoryRetention = 100;
        }
      }
    }

    const { newEaseFactor, newInterval, newRepetitions, nextReviewDate } =
      calculateSM2(
        frontendGrade,
        currentEaseFactor,
        currentInterval,
        currentRepetitions,
      );

    let updatedProgress;
    if (currentProgressId) {
      updatedProgress = await prisma.studyProgress.update({
        where: { id: currentProgressId },
        data: {
          ease_factor: newEaseFactor,
          interval: newInterval,
          repetitions: newRepetitions,
          next_review_date: nextReviewDate,
        },
      });
    } else {
      updatedProgress = await prisma.studyProgress.create({
        data: {
          flashcard_id: cardId,
          user_id: userId,
          ease_factor: newEaseFactor,
          interval: newInterval,
          repetitions: newRepetitions,
          next_review_date: nextReviewDate,
        },
      });
    }
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
        frontendGrade === 1
          ? "Thẻ đã được ghim lại để ôn tiếp ngay bây giờ!"
          : "Đã cập nhật chu kỳ ôn tập!",
      data: updatedProgress,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi hệ thống chấm điểm!",
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

    const deckId = parseInt(req.params.deckId, 10);

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
    res.status(500).json({
      success: false,
      message: "Lỗi khi tìm thẻ ôn tập!",
    });
  }
};

const generateRandomExam = async (req, res) => {
  try {
    const userId = extractUserId(req);
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Vui lòng đăng nhập lại!" });
    }

    const deckId = parseInt(req.params.deckId, 10);
    const limit = parseInt(req.query.limit, 10) || 0;
    const easyCount = parseInt(req.query.easyCount, 10) || 0;
    const mediumCount = parseInt(req.query.mediumCount, 10) || 0;
    const hardCount = parseInt(req.query.hardCount, 10) || 0;

    const deck = await prisma.decks.findUnique({
      where: { id: deckId },
    });

    if (!deck) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy bộ đề này!" });
    }

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

    if (easyCount > 0 || mediumCount > 0 || hardCount > 0) {
      const easys = allQuestions.filter((q) => q.difficulty === "EASY");
      const mediums = allQuestions.filter((q) => q.difficulty === "MEDIUM");
      const hards = allQuestions.filter((q) => q.difficulty === "HARD");

      finalExam = [
        ...shuffleArray(easys).slice(0, easyCount),
        ...shuffleArray(mediums).slice(0, mediumCount),
        ...shuffleArray(hards).slice(0, hardCount),
      ];

      const requestedTotal = easyCount + mediumCount + hardCount;
      if (finalExam.length < requestedTotal) {
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
    } else {
      finalExam = shuffleArray(allQuestions).slice(0, limit > 0 ? limit : 20);
    }

    const shuffledFinalExam = shuffleArray(finalExam);

    res.json({
      success: true,
      message: `Đã chuẩn bị xong đề thi gồm ${shuffledFinalExam.length} câu!`,
      data: shuffledFinalExam,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi hệ thống khi tạo đề thi ngẫu nhiên!",
    });
  }
};

const submitExamResults = async (req, res) => {
  try {
    const userId = extractUserId(req);
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Vui lòng đăng nhập!" });
    }

    // 👉 mode: "exam" (Kiểm Tra) hay "practice" (Ôn Luyện) — dùng để đánh dấu log,
    // giúp trang Thống Kê chỉ tính điểm từ các lần làm bài thật sự ở chế độ Kiểm Tra
    const { results, mode } = req.body;

    if (!Array.isArray(results) || results.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Dữ liệu kết quả thi không hợp lệ!" });
    }

    // 1. CẬP NHẬT TIẾN ĐỘ CHO TỪNG THẺ FLASHCARD (SM2)
    const updatePromises = results.map(async (item) => {
      const cardId = parseInt(item.flashcard_id || item.id || item.questionId || item.cardId, 10);
      const isCorrect = item.is_correct !== undefined ? item.is_correct : item.isCorrect;
      const durationMs = item.duration_ms || item.durationMs || item.timeSpent || 0;

      if (isNaN(cardId)) return null;

      const grade = isCorrect ? 3 : 1;

      const [card, progress] = await Promise.all([
        prisma.flashcards.findUnique({
          where: { id: cardId },
          select: { deck_id: true },
        }),
        prisma.studyProgress.findFirst({
          where: { flashcard_id: cardId, user_id: userId },
        }),
      ]);

      if (!card) return null;

      let currentEaseFactor = 2.5;
      let currentInterval = 0;
      let currentRepetitions = 0;
      let currentMemoryRetention = 100;
      let currentProgressId = null;

      if (progress) {
        currentProgressId = progress.id;
        currentEaseFactor = progress.ease_factor || 2.5;
        currentInterval = progress.interval || 0;
        currentRepetitions = progress.repetitions || 0;

        if (progress.last_review_date) {
          try {
            currentMemoryRetention = calculateMemoryRetention(
              progress.last_review_date,
              progress.interval,
            );
          } catch (e) {
            currentMemoryRetention = 100;
          }
        }
      }

      const { newEaseFactor, newInterval, newRepetitions, nextReviewDate } =
        calculateSM2(
          grade,
          currentEaseFactor,
          currentInterval,
          currentRepetitions,
        );

      if (currentProgressId) {
        await prisma.studyProgress.update({
          where: { id: currentProgressId },
          data: {
            ease_factor: newEaseFactor,
            interval: newInterval,
            repetitions: newRepetitions,
            next_review_date: nextReviewDate,
          },
        });
      } else {
        await prisma.studyProgress.create({
          data: {
            flashcard_id: cardId,
            user_id: userId,
            ease_factor: newEaseFactor,
            interval: newInterval,
            repetitions: newRepetitions,
            next_review_date: nextReviewDate,
          },
        });
      }
      await prisma.studyLogs.create({
        data: {
          user_id: userId,
          flashcard_id: cardId,
          deck_id: card.deck_id,
          rating: grade,
          duration_ms: durationMs,
          // 👉 Đánh dấu log này thuộc lần làm bài chế độ "Kiểm Tra" hay chỉ "Ôn Luyện"
          // để trang Thống Kê phân biệt được, không lẫn lộn 2 chế độ khi tính điểm gần nhất
          is_exam_mode: mode === "exam",
        },
      });

      return cardId;
    });

    await Promise.all(updatePromises);

    res.json({
      success: true,
      message:
        "Tuyệt vời! Thuật toán đã ghi nhận kết quả và lên lịch ôn tập lại các câu làm sai.",
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Lỗi hệ thống khi chấm bài!" });
  }
};

module.exports = {
  reviewCard,
  getDueCards,
  generateRandomExam,
  submitExamResults,
};