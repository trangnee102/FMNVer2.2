// backend/src/controllers/dashboardController.js
const prisma = require("../services/prisma"); // 👉 Dùng chung kết nối Prisma

const getDashboardSummary = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res
        .status(401)
        .json({ message: "Không tìm thấy thông tin xác thực!" });
    }

    // Đảm bảo ID được hiểu là dạng Số (Int)
    const userId = parseInt(req.user.id) || req.user.id;

    const clientDateString = req.query.currentDate;
    const today = clientDateString ? new Date(clientDateString) : new Date();

    // 👉 ĐÃ SỬA: Lấy thông tin User từ Database (để lấy Tên thật và Streak thật)
    // Chú ý: Nếu bảng User trong Database của bạn tên khác, hãy đổi 'users' thành tên tương ứng (vd: 'user')
    const userInfo = await prisma.users.findUnique({
      where: { id: userId },
    });

    // Lấy toàn bộ bộ thẻ và tiến độ học tập của User
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

    // Tính toán Thẻ Cần Ôn & Thẻ Đã Thuộc cho từng bộ
    const formattedDecks = decks.map((deck) => {
      const total = deck.Flashcards.length;
      let dueCount = 0;
      let masteredCount = 0;

      deck.Flashcards.forEach((card) => {
        const prog = card.StudyProgress[0];
        if (!prog) {
          // Chưa học bao giờ -> Cần ôn
          dueCount++;
        } else {
          // Đã học -> Kiểm tra ngày đến hạn
          if (new Date(prog.next_review_date) <= today) {
            dueCount++;
          }
          // Kiểm tra thẻ đã thuộc (Dựa vào ease_factor >= 2.6 theo chuẩn thuật toán)
          if (prog.ease_factor >= 2.6) {
            masteredCount++;
          }
        }
      });

      return {
        id: deck.id,
        title: deck.title || deck.name || "Bộ thẻ không tên",
        exam_date: deck.exam_date || null, // Trả về ngày thi để Dashboard đếm ngược Cram Mode
        totalCards: total,
        dueCards: dueCount,
        masteredCards: masteredCount,
      };
    });

    // Chuẩn bị tên dự phòng nếu không lấy được
    const fallbackName = req.user.email ? req.user.email.split("@")[0] : "Học viên";

    // 👉 ĐÃ SỬA: Trả về cục Data chuẩn xịn cho Frontend
    res.json({
      success: true,
      user: {
        full_name: userInfo?.full_name || userInfo?.name || fallbackName,
        streak: userInfo?.streak || 0, // Lấy chính xác chuỗi ngày học từ Database
      },
      decks: formattedDecks,
    });
  } catch (error) {
    console.error("Lỗi khi lấy dữ liệu Dashboard:", error);
    res.status(500).json({ message: "Lỗi Server khi tải dữ liệu Dashboard" });
  }
};

module.exports = {
  getDashboardSummary,
};