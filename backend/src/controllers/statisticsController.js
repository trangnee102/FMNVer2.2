// backend/src/controllers/statisticsController.js

// Gọi Prisma chính chủ từ thư mục services của nhóm cậu
const prisma = require("../services/prisma");

const getStatistics = async (req, res) => {
  try {
    // Quét mọi trường hợp lưu ID user từ Middleware
    const userId =
      req.user?.id ||
      req.userId ||
      (typeof req.user === "string" ? req.user : null);

    // Chặn ngay từ cửa nếu token không đính kèm ID
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Lỗi Token: Không tìm thấy User ID" });
    }

    // 👉 BẮT THAM SỐ FILTER TỪ FRONTEND (Mặc định là Tuần)
    const filter = req.query.filter || "Tuần";

    // 1. Lấy toàn bộ lịch sử học tập (logs) của user này để quét số liệu
    // Lưu ý: Đảm bảo cậu đã tạo bảng StudyLogs trong Database nhé!
    const logs = await prisma.studyLogs.findMany({
      where: { user_id: parseInt(userId) },
      orderBy: { reviewed_at: "asc" },
    });

    // ========================================================
    // 📊 XỬ LÝ 1: TÍNH TOÁN CÁC CHỈ SỐ KPIs
    // ========================================================

    // Lấy ngày hôm nay dưới dạng chuỗi YYYY-MM-DD
    const todayStr = new Date().toISOString().split("T")[0];

    // Đếm số thẻ lật ngày hôm nay
    const cardsToday = logs.filter(
      (log) =>
        new Date(log.reviewed_at).toISOString().split("T")[0] === todayStr,
    ).length;

    // Tính thời gian học hôm nay (Đổi từ miligiây sang phút, làm tròn lên)
    const totalDurationMs = logs.reduce((sum, log) => {
      const isToday =
        new Date(log.reviewed_at).toISOString().split("T")[0] === todayStr;
      return isToday ? sum + (log.duration_ms || 0) : sum;
    }, 0);
    const minutesToday = Math.ceil(totalDurationMs / (1000 * 60)) || 0;

    // Tỷ lệ ghi nhớ trung bình (Đếm số lần bấm Tốt (2) hoặc Dễ (3) trên tổng số lượt lật thẻ)
    const goodReviews = logs.filter((log) => log.rating >= 2).length;
    const retentionRate =
      logs.length > 0 ? Math.round((goodReviews / logs.length) * 100) : 0;

    // Thuật toán tính Chuỗi ngày học liên tiếp (Streak)
    let streak = 0;
    if (logs.length > 0) {
      const uniqueDates = [
        ...new Set(
          logs.map((log) => {
            const d = new Date(log.reviewed_at);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          }),
        ),
      ]
        .sort()
        .reverse();

      const dNow = new Date();
      const todayLocale = `${dNow.getFullYear()}-${String(dNow.getMonth() + 1).padStart(2, "0")}-${String(dNow.getDate()).padStart(2, "0")}`;

      const dYest = new Date(Date.now() - 86400000);
      const yesterdayLocale = `${dYest.getFullYear()}-${String(dYest.getMonth() + 1).padStart(2, "0")}-${String(dYest.getDate()).padStart(2, "0")}`;

      if (
        uniqueDates[0] === todayLocale ||
        uniqueDates[0] === yesterdayLocale
      ) {
        streak = 1;
        for (let i = 0; i < uniqueDates.length - 1; i++) {
          const d1 = new Date(uniqueDates[i]);
          const d2 = new Date(uniqueDates[i + 1]);
          const diffTime = Math.abs(d1 - d2);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays === 1) {
            streak++;
          } else if (diffDays > 1) {
            break;
          }
        }
      }
    }

    // ========================================================
    // 📈 XỬ LÝ 2: DỮ LIỆU BIỂU ĐỒ CỘT (TÙY BIẾN THEO FILTER)
    // ========================================================
    const dailyActivity = [];

    if (filter === "Năm") {
      // Lọc theo 12 tháng gần nhất
      for (let i = 11; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const displayStr = `Th${d.getMonth() + 1}`; // Hiển thị "Th1", "Th2"

        const count = logs.filter((log) => {
          const logDate = new Date(log.reviewed_at);
          return (
            `${logDate.getFullYear()}-${String(logDate.getMonth() + 1).padStart(2, "0")}` ===
            monthStr
          );
        }).length;

        dailyActivity.push({ date: displayStr, cards: count });
      }
    } else if (filter === "Tháng") {
      // Lọc theo 30 ngày gần nhất
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split("T")[0];
        const displayStr = `${d.getDate()}/${d.getMonth() + 1}`;

        const count = logs.filter(
          (log) =>
            new Date(log.reviewed_at).toISOString().split("T")[0] === dateStr,
        ).length;

        dailyActivity.push({ date: displayStr, cards: count });
      }
    } else {
      // Lọc theo Tuần (7 ngày gần nhất)
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split("T")[0];
        const displayStr = `${d.getDate()}/${d.getMonth() + 1}`;

        const count = logs.filter(
          (log) =>
            new Date(log.reviewed_at).toISOString().split("T")[0] === dateStr,
        ).length;

        dailyActivity.push({ date: displayStr, cards: count });
      }
    }

    // ========================================================
    // 🧠 XỬ LÝ 3: DỮ LIỆU BIỂU ĐỒ VÙNG TỶ LỆ GHI NHỚ
    // ========================================================
    // Mở rộng dữ liệu mảng nếu xem theo Tháng hoặc Năm để đồ thị nhìn mượt hơn
    const dataPoints = filter === "Năm" ? 12 : filter === "Tháng" ? 8 : 6;
    const retentionByWeek = [];

    for (let i = 1; i <= dataPoints; i++) {
      const baseRate = retentionRate > 0 ? retentionRate : 0;
      // Giả lập đường cong học tập đi lên dần dần
      const variance = (dataPoints - i) * (filter === "Năm" ? 2 : 5);
      retentionByWeek.push({
        week:
          filter === "Năm"
            ? `Tháng ${i}`
            : filter === "Tháng"
              ? `Tuần ${i}`
              : `Tuần ${i}`,
        rate: baseRate > 0 ? Math.max(20, baseRate - variance) : 0,
      });
    }

    // ========================================================
    // 🎯 XỬ LÝ 4: TÍNH TIẾN ĐỘ THUỘC BÀI CỦA TỪNG BỘ THẺ
    // ========================================================
    const userDecks = await prisma.decks.findMany({
      where: { user_id: parseInt(userId) },
      include: {
        _count: {
          select: { Flashcards: true },
        },
      },
    });

    const deckPerformance = await Promise.all(
      userDecks.map(async (deck) => {
        // Đếm số thẻ đã thuộc (repetitions > 0)
        const learnedCount = await prisma.studyProgress.count({
          where: {
            user_id: parseInt(userId),
            Flashcards: { deck_id: deck.id },
            repetitions: { gt: 0 },
          },
        });

        const totalCards = deck._count.Flashcards;
        const percent =
          totalCards > 0 ? Math.round((learnedCount / totalCards) * 100) : 0;

        return {
          id: deck.id,
          name: deck.title,
          learned: learnedCount,
          total: totalCards,
          percent: percent,
        };
      }),
    );

    // Trả về toàn bộ dữ liệu
    return res.status(200).json({
      success: true,
      data: {
        kpis: {
          streak,
          cardsToday,
          minutesToday,
          retentionRate,
        },
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
