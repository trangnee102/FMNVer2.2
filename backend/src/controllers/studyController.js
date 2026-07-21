const prisma = require("../services/prisma");
const { calculateSM2 } = require("../algorithms/forgettingCurve");
const jwt = require("jsonwebtoken");


const extractUserId = (req) => {
  let userId = req.user?.id || req.userId || req.user?.userId;

  // 2. Nếu không có, tự động bắt Token từ Header và dịch ra ID
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

    // Bắt điểm đánh giá (0: Quên, 1: Khó, 2: Tốt, 3: Dễ)
    const grade =
      req.body.rating !== undefined ? req.body.rating : req.body.grade;
    const durationMs = req.body.duration_ms || 12000;

    if (![0, 1, 2, 3].includes(grade)) {
      return res.status(400).json({
        success: false,
        message: "Điểm đánh giá phải là 1, 2, 3 hoặc 4!",
      });
    }

    // Chuyển đổi chuẩn điểm từ (1,2,3,4) của giao diện sang (0,1,2,3) của thuật toán SM2
    let normalizedGrade = grade;
    if (grade === 1) normalizedGrade = 0; // Quên
    else if (grade === 2) normalizedGrade = 1; // Khó
    else if (grade === 3) normalizedGrade = 2; // Tốt
    else if (grade === 4) normalizedGrade = 3; // Dễ

    // 🌟 QUY ĐỔI ĐIỂM SỐ: Ép về chuẩn (0, 1, 2, 3) để đưa vào thuật toán SM-2
    const grade = frontendRating - 1;

    // 🚀 TỐI ƯU TỐC ĐỘ: Cho 2 hàm tìm kiếm chạy SONG SONG
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

    // 1. Lấy tiến độ cũ
    let progress = await prisma.studyProgress.findFirst({
      where: { flashcard_id: cardId, user_id: userId },
    });

    if (!progress) {
      progress = await prisma.studyProgress.create({
        data: {
          flashcard_id: cardId,
          user_id: userId,
          ease_factor: 2.5,
          interval: 0,
          repetitions: 0,
        },
      });
    }


    // 2. Tính toán SM-2
    const { newEaseFactor, newInterval, newRepetitions } = calculateSM2(
      normalizedGrade,
      currentProgress.ease_factor,
      currentProgress.interval,
      currentProgress.repetitions,
    );


    // 3. Tính ngày ôn tiếp theo
    let nextReviewDate = new Date();
    if (normalizedGrade === 0) {
      // 🚨 BẤM QUÊN: Lùi 1 phút để học lại ngay
      nextReviewDate.setMinutes(nextReviewDate.getMinutes() - 1);
    } else {
      // ✅ BẤM NHỚ: Hẹn ngày tiếp theo
      nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);
      nextReviewDate.setHours(0, 0, 0, 0);
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

    // 3. Ghi Log
    await prisma.studyLogs.create({
      data: {
        user_id: userId,
        flashcard_id: cardId,
        deck_id: card.deck_id,
        rating: grade,
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
    
    // Đảm bảo so sánh trong cùng một mốc cuối ngày (End of Day)
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
        if (!prog) return true; // Thẻ mới -> Đến hạn

        // 🌟 So sánh chuẩn: Nếu ngày hẹn < hôm nay -> Bắt học
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
