const prisma = require("../services/prisma");

const getDashboardSummary = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Không tìm thấy thông tin xác thực!" });
    }

    const userId = parseInt(req.user.id) || req.user.id;
    const clientDateString = req.query.currentDate;
    const today = clientDateString ? new Date(clientDateString) : new Date();
    
    const startOfToday = new Date(today);
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);

    const userInfo = await prisma.users.findUnique({
      where: { id: userId },
    });

    const decks = await prisma.decks.findMany({
      where: { user_id: userId },
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
      let learnedCount = 0;
      let lastStudied = null;

      deck.Flashcards.forEach((card) => {
        const prog = card.StudyProgress[0];
        
        if (!prog) {
          dueCount++;
        } else {
          learnedCount++;
          
          if (!deck.is_exam) {
            if (prog.next_review_date) {
              const nextReview = new Date(prog.next_review_date);
              if (nextReview <= endOfToday) {
                dueCount++;
              }
            } else {
              dueCount++;
            }
          }

          if (prog.ease_factor >= 2.6 || prog.memory_state === 4) {
            masteredCount++;
          }

          const progressDate = new Date(prog.updated_at || prog.last_reviewed || prog.created_at || 0);
          if (!lastStudied || progressDate > lastStudied) {
            lastStudied = progressDate;
          }
        }
      });

      return {
        id: deck.id,
        title: deck.title || deck.name || "Bộ thẻ không tên",
        exam_date: deck.exam_date || null,
        totalCards: total,
        dueCards: dueCount,
        dueCount: dueCount,
        masteredCards: masteredCount,
        masteredCount: masteredCount,
        learnedCount: learnedCount,
        is_exam: deck.is_exam || false,
        last_studied: lastStudied,
      };
    });

    const fallbackName = req.user.email ? req.user.email.split("@")[0] : "Học viên";

    res.json({
      success: true,
      user: {
        full_name: userInfo?.full_name || userInfo?.name || fallbackName,
        streak: userInfo?.streak_days || userInfo?.streak || 0,
      },
      decks: formattedDecks,
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi Server khi tải dữ liệu Dashboard" });
  }
};

module.exports = {
  getDashboardSummary,
};