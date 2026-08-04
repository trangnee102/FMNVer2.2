const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const getUserId = (req) => {
  const id = req.user?.id || req.userId || req.user_id || req.user;
  return parseInt(id);
};

const getDiscoveryDecks = async (req, res) => {
  try {
    const { category, type } = req.query;
    const isExamQuery = type === "exam" ? true : false;
    
    const whereCondition = { is_public: true, is_exam: isExamQuery };
    if (category && category !== "Tất cả") whereCondition.category = category;

    const decks = await prisma.decks.findMany({
      where: whereCondition,
      include: {
        Users: { select: { full_name: true, avatar_text: true } },
        _count: { select: { Flashcards: true } },
      },
      take: 100,
      orderBy: { id: "desc" },
    });

    const formattedDecks = decks.map((deck) => {
      let authorName = "Người dùng khuyết danh";
      const userData = deck.Users;
      if (deck.is_anonymous === true) authorName = "Người dùng ẩn danh";
      else if (userData && userData.full_name) authorName = userData.full_name;

      return {
        id: deck.id,
        title: deck.title,
        category: deck.category || "Khác",
        author: authorName,
        cards: deck._count ? deck._count.Flashcards : 0,
        views: deck.clone_count || 0,
        subject: deck.category || "Tổng hợp",
        grade: "THPT",
        difficulty: "Trung bình",
        updatedAt: deck.updated_at || deck.created_at || new Date(),
        usedCount: deck.clone_count || 0,
        is_exam: deck.is_exam,
      };
    });

    res.status(200).json({ success: true, data: formattedDecks });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi server khi tải dữ liệu khám phá" });
  }
};

const getDiscoveryExams = async (req, res) => {
  try {
    const { category } = req.query;
    const whereCondition = { is_public: true, is_exam: true };
    if (category && category !== "Tất cả") whereCondition.category = category;

    const exams = await prisma.decks.findMany({
      where: whereCondition,
      include: {
        Users: { select: { full_name: true, avatar_text: true } },
        _count: { select: { Flashcards: true } },
      },
      take: 100,
      orderBy: { id: "desc" },
    });

    const formattedExams = exams.map((exam) => {
      let authorName = "Người dùng khuyết danh";
      const userData = exam.Users;
      if (exam.is_anonymous === true) authorName = "Người dùng ẩn danh";
      else if (userData && userData.full_name) authorName = userData.full_name;

      return {
        id: exam.id,
        title: exam.title,
        category: exam.category || "Khác",
        author: authorName,
        totalQuestions: exam._count ? exam._count.Flashcards : 0,
        views: exam.clone_count || 0,
        subject: exam.category || "Tổng hợp",
        grade: "THPT",
        difficulty: "Trung bình",
        updatedAt: exam.updated_at || exam.created_at || new Date(),
        usedCount: exam.clone_count || 0,
        is_exam: true,
      };
    });

    res.status(200).json({ success: true, data: formattedExams });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi server khi tải dữ liệu đề thi" });
  }
};

const getCommunityStatistics = async (req, res) => {
  try {
    const [totalDecks, totalExams, downloadAgg, totalContributors, topicsGroup] = await Promise.all([
      prisma.decks.count({ where: { is_public: true, is_exam: false } }),
      prisma.decks.count({ where: { is_public: true, is_exam: true } }),
      prisma.decks.aggregate({ where: { is_public: true }, _sum: { clone_count: true } }),
      prisma.decks.findMany({ where: { is_public: true }, select: { user_id: true }, distinct: ['user_id'] }),
      prisma.decks.findMany({ where: { is_public: true }, select: { category: true }, distinct: ['category'] }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalDecks,
        totalExams,
        totalDownloads: downloadAgg._sum.clone_count || 0,
        totalContributors: totalContributors.length,
        totalTopics: topicsGroup.length || 1,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi server khi tải thống kê cộng đồng" });
  }
};

const getLeaderboard = async (req, res) => {
  try {
    const topUsers = await prisma.users.findMany({
      where: { role: "student" },
      select: {
        id: true,
        full_name: true,
        avatar_text: true,
        avatar_color: true,
        total_points: true,
        streak_days: true,
        total_cards: true,
      },
      orderBy: { total_points: "desc" },
      take: 10,
    });
    res.status(200).json(topUsers);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server khi tải bảng xếp hạng" });
  }
};

const cloneDeck = async (req, res) => {
  try {
    const currentUserId = getUserId(req);
    const deckId = parseInt(req.params.id);

    if (!currentUserId || isNaN(currentUserId))
      return res
        .status(401)
        .json({ success: false, message: "Chưa đăng nhập!" });

    const originalDeck = await prisma.decks.findUnique({
      where: { id: deckId },
      include: { Flashcards: true },
    });

    if (!originalDeck || !originalDeck.is_public)
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy bộ dữ liệu!" });

    const newDeck = await prisma.decks.create({
      data: {
        title: originalDeck.title + " (Tải về)",
        description: originalDeck.description || "Tải về từ Cộng đồng",
        category: originalDeck.category,
        is_public: false,
        is_exam: originalDeck.is_exam,
        user_id: currentUserId,
      },
    });

    if (originalDeck.Flashcards && originalDeck.Flashcards.length > 0) {
      const newCards = originalDeck.Flashcards.map((card) => ({
        deck_id: newDeck.id,
        question: card.question,
        answer: card.answer,
        question_type: card.question_type,
        difficulty: card.difficulty,
        category: card.category,
        options: card.options,
        correct_answers: card.correct_answers,
        source_reference: card.source_reference,
        keywords: card.keywords,
        explanation: card.explanation,
      }));
      await prisma.flashcards.createMany({ data: newCards });
    }

    await prisma.decks.update({
      where: { id: deckId },
      data: { clone_count: (originalDeck.clone_count || 0) + 1 },
    });

    res
      .status(200)
      .json({ success: true, message: "Đã tải về Thư viện thành công!" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

const getDeckDetails = async (req, res) => {
  try {
    const deckId = parseInt(req.params.id);
    const deck = await prisma.decks.findUnique({
      where: { id: deckId },
      include: {
        Flashcards: true,
        Users: { select: { full_name: true, avatar_text: true } },
      },
    });
    if (!deck || !deck.is_public)
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy dữ liệu!" });
    res.status(200).json({ success: true, data: deck });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

module.exports = {
  getDiscoveryDecks,
  getDiscoveryExams,
  getCommunityStatistics,
  getLeaderboard,
  cloneDeck,
  getDeckDetails,
};