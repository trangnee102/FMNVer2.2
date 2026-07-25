const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const getDiscoveryDecks = async (req, res) => {
  try {
    const { category } = req.query;
    const whereCondition = { is_public: true };
    if (category && category !== "Tất cả") whereCondition.category = category;

    const decks = await prisma.decks.findMany({
      where: whereCondition,
      include: {
        Users: { select: { full_name: true, avatar_text: true } },
        _count: { select: { Flashcards: true } },
      },
      take: 20,
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
      };
    });

    res.status(200).json(formattedDecks);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server khi tải dữ liệu khám phá" });
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
    const currentUserId = parseInt(req.user?.id);
    const deckId = parseInt(req.params.id);
    if (!currentUserId)
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
        .json({ success: false, message: "Không tìm thấy thẻ!" });

    const newDeck = await prisma.decks.create({
      data: {
        title: originalDeck.title + " (Tải về)",
        description: originalDeck.description || "Tải về từ Cộng đồng",
        category: originalDeck.category,
        is_public: false,
        user_id: currentUserId,
      },
    });

    if (originalDeck.Flashcards && originalDeck.Flashcards.length > 0) {
      const newCards = originalDeck.Flashcards.map((card) => ({
        deck_id: newDeck.id,
        question: card.question,
        answer: card.answer,
      }));
      await prisma.flashcards.createMany({ data: newCards });
    }

    await prisma.decks.update({
      where: { id: deckId },
      data: { clone_count: (originalDeck.clone_count || 0) + 1 },
    });

    res
      .status(200)
      .json({ success: true, message: "Đã tải bộ thẻ về Thư viện!" });
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
        .json({ success: false, message: "Không tìm thấy thẻ!" });
    res.status(200).json({ success: true, data: deck });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

module.exports = {
  getDiscoveryDecks,
  getLeaderboard,
  cloneDeck,
  getDeckDetails,
};
