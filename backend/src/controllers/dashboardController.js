// backend/src/controllers/dashboardController.js
const prisma = require("../services/prisma"); // 👉 Tối ưu: Dùng chung kết nối Prisma để không bị sập Server

const getDashboardSummary = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res
        .status(401)
        .json({ message: "Không tìm thấy thông tin xác thực!" });
    }

    // 👉 VÁ LỖI KIỂU DỮ LIỆU: Đảm bảo ID được hiểu là dạng Số (Int) nếu Database thiết kế vậy
    const userId = parseInt(req.user.id) || req.user.id;

    const clientDateString = req.query.currentDate;
    const today = clientDateString ? new Date(clientDateString) : new Date();

    const decks = await prisma.decks.findMany({
      where: { user_id: userId }, // Lá chắn bảo vệ thẻ của từng người
      include: {
        Flashcards: {
          include: {
            StudyProgress: {
              where: { user_id: userId },
            },
          },
        },
      },
    });

    const formattedDecks = decks.map((deck) => {
      const total = deck.Flashcards.length;
      let dueCount = 0;
      let masteredCount = 0;

      deck.Flashcards.forEach((card) => {
        const prog = card.StudyProgress[0];
        if (!prog) {
          dueCount++;
        } else {
          if (new Date(prog.next_review_date) <= today) {
            dueCount++;
          }
          if (prog.ease_factor >= 2.6) {
            masteredCount++;
          }
        }
      });

      return {
        id: deck.id,
        title: deck.title || "Bộ thẻ không tên",
        totalCards: total,
        dueCards: dueCount,
        masteredCards: masteredCount,
      };
    });

    res.json({
      user: {
        name: req.user.email ? req.user.email.split("@")[0] : "Học viên",
        streak: 0,
      },
      decks: formattedDecks,
      examDates: [],
    });
  } catch (error) {
    console.error("Lỗi khi lấy dữ liệu Dashboard:", error);
    res.status(500).json({ message: "Lỗi Server khi tải dữ liệu Dashboard" });
  }
};

module.exports = {
  getDashboardSummary,
};
