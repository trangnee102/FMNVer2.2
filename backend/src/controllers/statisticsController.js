const prisma = require("../services/prisma");

const getStatistics = async (req, res) => {
  try {
    const userId =
      req.user?.id ||
      req.userId ||
      (typeof req.user === "string" ? req.user : null);

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Lỗi Token: Không tìm thấy User ID" });
    }

    const filter = req.query.filter || "Tuần";

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todayStats = await prisma.studyLogs.aggregate({
      where: {
        user_id: parseInt(userId),
        reviewed_at: { gte: todayStart, lte: todayEnd },
      },
      _count: { id: true },
      _sum: { duration_ms: true },
    });

    const cardsToday = todayStats._count.id || 0;
    const minutesToday = Math.ceil((todayStats._sum.duration_ms || 0) / 60000);

    const [totalReviews, goodReviews] = await Promise.all([
      prisma.studyLogs.count({ where: { user_id: parseInt(userId) } }),
      prisma.studyLogs.count({
        where: { user_id: parseInt(userId), rating: { gte: 2 } },
      }),
    ]);
    const retentionRate =
      totalReviews > 0 ? Math.round((goodReviews / totalReviews) * 100) : 0;

    const userDecks = await prisma.decks.findMany({
      where: { user_id: parseInt(userId) },
      include: {
        _count: { select: { Flashcards: true } },
      },
    });

    const examDeckIds = new Set(
      userDecks.filter((d) => d.is_exam).map((d) => d.id)
    );

    const historyDates = await prisma.studyLogs.findMany({
      where: { user_id: parseInt(userId) },
      select: { reviewed_at: true, deck_id: true },
      orderBy: { reviewed_at: "desc" },
    });

    let streak = 0;
    if (historyDates.length > 0) {
      const uniqueDates = [
        ...new Set(
          historyDates.map(
            (log) => log.reviewed_at.toISOString().split("T")[0],
          ),
        ),
      ];

      const dNow = new Date();
      const todayLocale = dNow.toISOString().split("T")[0];
      const dYest = new Date(Date.now() - 86400000);
      const yesterdayLocale = dYest.toISOString().split("T")[0];

      if (
        uniqueDates[0] === todayLocale ||
        uniqueDates[0] === yesterdayLocale
      ) {
        streak = 1;
        for (let i = 0; i < uniqueDates.length - 1; i++) {
          const d1 = new Date(uniqueDates[i]);
          const d2 = new Date(uniqueDates[i + 1]);
          const diffDays = Math.round(Math.abs(d1 - d2) / 86400000);

          if (diffDays === 1) streak++;
          else if (diffDays > 1) break;
        }
      }
    }

    const dailyActivity = [];

    if (filter === "Năm" || filter === "year") {
      for (let i = 11; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

        const logsInMonth = historyDates.filter((log) =>
          log.reviewed_at.toISOString().startsWith(monthStr),
        );
        
        const cardCount = logsInMonth.filter(log => !examDeckIds.has(log.deck_id)).length;
        const examCount = new Set(
          logsInMonth.filter(log => examDeckIds.has(log.deck_id)).map(log => log.deck_id)
        ).size;

        dailyActivity.push({
          date: `${monthStr}-01`,
          day: `Th${d.getMonth() + 1}`,
          cards: cardCount,
          exams: examCount,
        });
      }
    } else if (filter === "Tháng" || filter === "month") {
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split("T")[0];

        const logsInDay = historyDates.filter(
          (log) => log.reviewed_at.toISOString().split("T")[0] === dateStr,
        );

        const cardCount = logsInDay.filter(log => !examDeckIds.has(log.deck_id)).length;
        const examCount = new Set(
          logsInDay.filter(log => examDeckIds.has(log.deck_id)).map(log => log.deck_id)
        ).size;

        dailyActivity.push({
          date: dateStr,
          day: `${d.getDate()}/${d.getMonth() + 1}`,
          cards: cardCount,
          exams: examCount,
        });
      }
    } else {
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split("T")[0];

        const logsInDay = historyDates.filter(
          (log) => log.reviewed_at.toISOString().split("T")[0] === dateStr,
        );

        const cardCount = logsInDay.filter(log => !examDeckIds.has(log.deck_id)).length;
        const examCount = new Set(
          logsInDay.filter(log => examDeckIds.has(log.deck_id)).map(log => log.deck_id)
        ).size;

        const daysArr = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
        const dayLabel = daysArr[d.getDay()];

        dailyActivity.push({
          date: dateStr,
          day: dayLabel,
          cards: cardCount,
          exams: examCount,
        });
      }
    }

    const isYearFilter = filter === "year" || filter === "Năm";
    const dataPoints = isYearFilter
      ? 12
      : filter === "month" || filter === "Tháng"
        ? 8
        : 6;
    const retentionByWeek = [];

    for (let i = 1; i <= dataPoints; i++) {
      const baseRate = retentionRate > 0 ? retentionRate : 0;
      const variance = (dataPoints - i) * (isYearFilter ? 2 : 5);
      retentionByWeek.push({
        week: isYearFilter ? `Tháng ${i}` : `Tuần ${i}`,
        rate: baseRate > 0 ? Math.max(20, baseRate - variance) : 0,
      });
    }

    const deckPerformance = await Promise.all(
      userDecks.map(async (deck) => {
        const learnedCount = await prisma.studyProgress.count({
          where: {
            user_id: parseInt(userId),
            Flashcards: { deck_id: deck.id },
            repetitions: { gt: 0 },
          },
        });

        const totalCards = deck._count.Flashcards;

        let score = null;
        let updatedAt = null;
        let examCorrect = null;
        let examWrong = null;
        let examTotal = null;
        let attempted = false;

        // 🌟 TÍNH ĐIỂM CHO ĐỀ THI TỪ LỊCH SỬ LOG — CHỈ TÍNH LOG Ở CHẾ ĐỘ "KIỂM TRA"
        // (is_exam_mode: true), để không lẫn với các log của chế độ "Ôn Luyện"
        if (deck.is_exam) {
          // 👉 "Đã làm" (attempted) tính cả Ôn Luyện lẫn Kiểm Tra — không cần biết điểm số
          const anyLog = await prisma.studyLogs.findFirst({
            where: { user_id: parseInt(userId), deck_id: deck.id },
            select: { id: true },
          });
          attempted = !!anyLog;

          const latestLog = await prisma.studyLogs.findFirst({
            where: { user_id: parseInt(userId), deck_id: deck.id, is_exam_mode: true },
            orderBy: { reviewed_at: 'desc' }
          });

          if (latestLog) {
            updatedAt = latestLog.reviewed_at;
            // Gom nhóm các câu trả lời trong khoảng 2 phút quanh lần nộp cuối = 1 lượt thi
            const startTime = new Date(updatedAt.getTime() - 120000);
            const endTime = new Date(updatedAt.getTime() + 120000);

            const attemptCount = await prisma.studyLogs.count({
                where: {
                    user_id: parseInt(userId),
                    deck_id: deck.id,
                    is_exam_mode: true,
                    reviewed_at: { gte: startTime, lte: endTime }
                }
            });

            if (attemptCount > 0) {
                const correctCount = await prisma.studyLogs.count({
                    where: {
                        user_id: parseInt(userId),
                        deck_id: deck.id,
                        is_exam_mode: true,
                        rating: { gte: 3 }, // 3 là đúng
                        reviewed_at: { gte: startTime, lte: endTime }
                    }
                });
                // 👉 Tính theo SỐ CÂU THỰC TẾ ĐÃ THI (attemptCount), không tính theo tổng số thẻ
                // trong cả bộ đề — vì 1 lượt thi có thể chỉ lấy 1 phần câu hỏi trong bộ đề đó
                examTotal = attemptCount;
                examCorrect = correctCount;
                examWrong = attemptCount - correctCount;
                score = Math.round((correctCount / attemptCount) * 10 * 10) / 10;
            }
          }
        }

        return {
          id: deck.id,
          name: deck.title || deck.name,
          is_exam: deck.is_exam || false,
          isExam: deck.is_exam || false,
          learned: learnedCount,
          total: examTotal !== null ? examTotal : totalCards,
          percent: totalCards > 0 ? Math.round((learnedCount / totalCards) * 100) : 0,
          score: score, // Trả về null nếu chưa làm ở chế độ Kiểm tra
          correct: examCorrect,
          wrong: examWrong,
          attempted: attempted, // true nếu đã đụng vào đề (kể cả Ôn Luyện), không cần điểm
          updated_at: updatedAt,
          last_studied: updatedAt
        };
      }),
    );

    return res.status(200).json({
      success: true,
      data: {
        kpis: { streak, cardsToday, minutesToday, retentionRate },
        dailyActivity,
        retentionByWeek,
        deckPerformance,
      },
    });
  } catch (error) {
    console.error("Lỗi xử lý tính toán thống kê:", error);
    return res
      .status(500)
      .json({ success: false, message: "Lỗi máy chủ hệ thống." });
  }
};

module.exports = { getStatistics };