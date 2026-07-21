// backend/src/controllers/studyController.js
const prisma = require("../services/prisma");
const { calculateSM2 } = require("../algorithms/forgettingCurve");
const jwt = require("jsonwebtoken");

// 🌟 HÀM CỨU CÁNH: Tự động lấy User ID kể cả khi Route quên gắn Middleware
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

    // 👉 ĐÃ SỬA: Bắt chuẩn điểm từ Frontend (1: Quên, 2: Khó, 3: Tốt, 4: Dễ)
    const frontendRating =
      req.body.rating !== undefined ? req.body.rating : req.body.grade;
    const durationMs = req.body.duration_ms || 12000;

    if (![1, 2, 3, 4].includes(frontendRating)) {
      return res.status(400).json({
        success: false,
        message: "Điểm đánh giá từ Frontend phải là 1, 2, 3 hoặc 4!",
      });
    }

    // 🌟 QUY ĐỔI ĐIỂM SỐ: Ép về chuẩn (0, 1, 2, 3) để đưa vào thuật toán SM-2
    const grade = frontendRating - 1;

    // 🚀 TỐI ƯU TỐC ĐỘ (1): Cho 2 hàm tìm kiếm độc lập này chạy SONG SONG thay vì chờ nhau
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

    // Thiết lập thông số mặc định nếu là thẻ mới học lần đầu
    let currentProgress = progress;
    if (!currentProgress) {
      currentProgress = { ease_factor: 2.5, interval: 0, repetitions: 0 };
    }

    // Tính toán SM-2
    const { newEaseFactor, newInterval, newRepetitions } = calculateSM2(
      grade,
      currentProgress.ease_factor,
      currentProgress.interval,
      currentProgress.repetitions,
    );

    let nextReviewDate = new Date();
    if (grade === 0) {
      // Nút Quên: Lùi thời gian lại 1 phút
      nextReviewDate.setMinutes(nextReviewDate.getMinutes() - 1);
    } else {
      // Các nút Nhớ: Hẹn ngày tiếp theo
      nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);
    }

    // Cập nhật hoặc tạo mới Tiến độ (StudyProgress)
    let updatedProgress;
    if (progress) {
      updatedProgress = await prisma.studyProgress.update({
        where: { id: progress.id },
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

    // 🚀 TỐI ƯU SIÊU TỐC (2): Ghi nhật ký (Log) ngầm
    // Tớ đã gỡ bỏ chữ "await" ở đây. Backend sẽ gửi câu lệnh cho Database rồi đi ngay lập tức,
    // không đứng đợi DB viết xong nữa -> Trả tốc độ phản hồi về mili-giây!
    prisma.studyLogs
      .create({
        data: {
          user_id: userId,
          flashcard_id: cardId,
          deck_id: card.deck_id,
          rating: frontendRating,
          duration_ms: durationMs,
        },
      })
      .catch((err) => console.error("Lỗi ghi log chạy ngầm:", err));

    res.json({
      success: true,
      message:
        grade === 0
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
        if (!prog) return true; // Thẻ mới -> Đến hạn
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

module.exports = { reviewCard, getDueCards };
