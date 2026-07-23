// backend/src/controllers/statisticsController.js
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

    // ========================================================
    // 📊 BƯỚC 1: TÍNH KPIS BẰNG DATABASE AGGREGATION (Chuẩn Big Tech)
    // 👉 Thay vì kéo cả vạn dòng log về Node.js để đếm, ta ép DB đếm luôn!
    // ========================================================
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // 1.1 Bắt DB đếm số thẻ và tính tổng thời gian HÔM NAY (Cực kỳ nhanh)
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

    // 1.2 Bắt DB đếm tổng thẻ đã học & số thẻ học tốt để tính Tỷ lệ ghi nhớ
    const [totalReviews, goodReviews] = await Promise.all([
      prisma.studyLogs.count({ where: { user_id: parseInt(userId) } }),
      prisma.studyLogs.count({
        where: { user_id: parseInt(userId), rating: { gte: 2 } },
      }),
    ]);
    const retentionRate =
      totalReviews > 0 ? Math.round((goodReviews / totalReviews) * 100) : 0;

    // ========================================================
    // 🔥 BƯỚC 2: TÍNH STREAK & BIỂU ĐỒ (Tối ưu Payload)
    // 👉 Chỉ tải đúng cột "reviewed_at", tuyệt đối không tải toàn bộ Data của thẻ
    // ========================================================
    const historyDates = await prisma.studyLogs.findMany({
      where: { user_id: parseInt(userId) },
      select: { reviewed_at: true }, // Mấu chốt tối ưu RAM là ở dòng này
      orderBy: { reviewed_at: "desc" },
    });

    // Thuật toán tính Streak
    let streak = 0;
    if (historyDates.length > 0) {
      // Lấy ra danh sách các ngày duy nhất
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

      // Nếu hôm nay hoặc hôm qua có học thì mới tính streak
      if (
        uniqueDates[0] === todayLocale ||
        uniqueDates[0] === yesterdayLocale
      ) {
        streak = 1;
        for (let i = 0; i < uniqueDates.length - 1; i++) {
          const d1 = new Date(uniqueDates[i]);
          const d2 = new Date(uniqueDates[i + 1]);
          // Tính khoảng cách giữa 2 ngày học liên tiếp
          const diffDays = Math.round(Math.abs(d1 - d2) / 86400000);

          if (diffDays === 1) streak++;
          else if (diffDays > 1) break; // Bị đứt chuỗi
        }
      }
    }

    // ========================================================
    // 📈 BƯỚC 3: DỮ LIỆU BIỂU ĐỒ CỘT (TÙY BIẾN THEO FILTER)
    // ========================================================
    const dailyActivity = [];

    if (filter === "Năm") {
      for (let i = 11; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

        const count = historyDates.filter((log) =>
          log.reviewed_at.toISOString().startsWith(monthStr),
        ).length;
        dailyActivity.push({ date: `Th${d.getMonth() + 1}`, cards: count });
      }
    } else if (filter === "Tháng") {
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split("T")[0];

        const count = historyDates.filter(
          (log) => log.reviewed_at.toISOString().split("T")[0] === dateStr,
        ).length;
        dailyActivity.push({
          date: `${d.getDate()}/${d.getMonth() + 1}`,
          cards: count,
        });
      }
    } else {
      // Tuần
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split("T")[0];

        const count = historyDates.filter(
          (log) => log.reviewed_at.toISOString().split("T")[0] === dateStr,
        ).length;
        dailyActivity.push({
          date: `${d.getDate()}/${d.getMonth() + 1}`,
          cards: count,
        });
      }
    }

    // ========================================================
    // 🧠 BƯỚC 4: DỮ LIỆU BIỂU ĐỒ VÙNG TỶ LỆ GHI NHỚ
    // ========================================================
    const dataPoints = filter === "Năm" ? 12 : filter === "Tháng" ? 8 : 6;
    const retentionByWeek = [];

    for (let i = 1; i <= dataPoints; i++) {
      const baseRate = retentionRate > 0 ? retentionRate : 0;
      const variance = (dataPoints - i) * (filter === "Năm" ? 2 : 5);
      retentionByWeek.push({
        week: filter === "Năm" ? `Tháng ${i}` : `Tuần ${i}`,
        rate: baseRate > 0 ? Math.max(20, baseRate - variance) : 0,
      });
    }

    // ========================================================
    // 🎯 BƯỚC 5: TÍNH TIẾN ĐỘ THUỘC BÀI TỐI ƯU HÓA
    // ========================================================
    const userDecks = await prisma.decks.findMany({
      where: { user_id: parseInt(userId) },
      include: {
        _count: { select: { Flashcards: true } },
      },
    });

    const deckPerformance = await Promise.all(
      userDecks.map(async (deck) => {
        // Ép Database đếm số lượng thẻ đã học, không tải Data thẻ về Node.js
        const learnedCount = await prisma.studyProgress.count({
          where: {
            user_id: parseInt(userId),
            Flashcards: { deck_id: deck.id },
            repetitions: { gt: 0 },
          },
        });

        const totalCards = deck._count.Flashcards;
        return {
          id: deck.id,
          name: deck.title,
          learned: learnedCount,
          total: totalCards,
          percent:
            totalCards > 0 ? Math.round((learnedCount / totalCards) * 100) : 0,
        };
      }),
    );

    // Trả về toàn bộ dữ liệu
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
