const prisma = require("../services/prisma");

// 1. LẤY DANH SÁCH BỘ THẺ CỦA NGƯỜI DÙNG
const getMyDecks = async (req, res) => {
  try {
    const userId = parseInt(req.user.id) || req.user.id;

    const decks = await prisma.decks.findMany({
      where: { user_id: userId },
      orderBy: { id: "desc" },
      include: {
        _count: { select: { Flashcards: true } },
        Flashcards: {
          include: {
            StudyProgress: {
              where: { user_id: userId },
              select: { ease_factor: true, next_review_date: true },
            },
          },
        },
      },
    });

    const formattedDecks = decks.map((deck) => {
      const totalCards = deck._count?.Flashcards ?? 0;
      let dueCount = 0;
      let learnedCount = 0;
      const today = new Date();

      deck.Flashcards.forEach((card) => {
        const progress = card.StudyProgress?.[0];

        if (!progress) {
          dueCount += 1;
          return;
        }

        const nextReview = progress.next_review_date
          ? new Date(progress.next_review_date)
          : null;

        if (!nextReview || nextReview <= today) {
          dueCount += 1;
        } else {
          learnedCount += 1;
        }
      });

      return {
        id: deck.id,
        title: deck.title,
        description: deck.description,
        is_public: deck.is_public,
        is_anonymous: deck.is_anonymous,
        user_id: deck.user_id,
        clone_count: deck.clone_count,
        _count: deck._count,
        totalCards,
        dueCards: dueCount,
        progressPercent: totalCards > 0 ? Math.round(((totalCards - dueCount) / totalCards) * 100) : 0,
      };
    });

    res.json({ success: true, data: formattedDecks });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy dữ liệu!",
      error: error.message,
    });
  }
};

// 2. TẠO BỘ THẺ MỚI (Tạo riêng lẻ không có thẻ)
const createDeck = async (req, res) => {
  try {
    const { title, description, is_public, is_anonymous } = req.body;
    const userId = parseInt(req.user.id) || req.user.id;

    if (!title) {
      return res
        .status(400)
        .json({ success: false, message: "Tên bộ thẻ không được để trống!" });
    }

    const newDeck = await prisma.decks.create({
      data: {
        title: title,
        description: description || null,
        is_public: is_public || false,
        is_anonymous: is_anonymous || false,
        user_id: userId,
      },
    });

    res.status(201).json({
      success: true,
      message: "Tạo bộ thẻ thành công!",
      data: newDeck,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi tạo bộ thẻ!",
      error: error.message,
    });
  }
};

// =========================================
// 👉 ĐÃ THÊM: HÀM MỚI - TẠO BỘ THẺ KÈM NHIỀU THẺ CÙNG LÚC
// =========================================
const createDeckWithCards = async (req, res) => {
  try {
    const { title, description, is_public, is_anonymous, cards } = req.body;
    const userId = parseInt(req.user.id) || req.user.id;

    if (!title) {
      return res
        .status(400)
        .json({ success: false, message: "Tên bộ thẻ không được để trống!" });
    }

    // Kiểm tra xem user có gửi mảng thẻ (cards) lên không
    if (!Array.isArray(cards) || cards.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Vui lòng nhập ít nhất 1 thẻ!" });
    }

    // Lọc bỏ những thẻ bị bỏ trống cả 2 mặt để chống rác Database
    const validCards = cards.filter(
      (c) => c.question?.trim() !== "" && c.answer?.trim() !== "",
    );

    if (validCards.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Các thẻ đều trống nội dung, vui lòng nhập chữ!",
      });
    }

    // 🚀 LƯU 1 PHÁT ĂN NGAY CẢ DECK LẪN FLASHCARDS
    const newDeck = await prisma.decks.create({
      data: {
        title: title,
        description: description || null,
        is_public: is_public || false,
        is_anonymous: is_anonymous || false,
        user_id: userId,
        Flashcards: {
          create: validCards.map((card) => ({
            question: card.question,
            answer: card.answer,
          })),
        },
      },
      include: {
        Flashcards: true, // Trả về kết quả kèm luôn danh sách thẻ để Frontend biết
      },
    });

    res.status(201).json({
      success: true,
      message: `Tạo bộ thẻ thành công cùng với ${validCards.length} thẻ!`,
      data: newDeck,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi hệ thống khi lưu nguyên bộ thẻ!",
      error: error.message,
    });
  }
};

// 3. CẬP NHẬT/SỬA TÊN BỘ THẺ
const updateDeck = async (req, res) => {
  try {
    const deckId = parseInt(req.params.id);
    const { title, description, is_public, is_anonymous } = req.body;
    const userId = parseInt(req.user.id) || req.user.id;

    const existingDeck = await prisma.decks.findFirst({
      where: { id: deckId, user_id: userId },
    });

    if (!existingDeck) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy bộ thẻ hoặc bạn không có quyền sửa!",
      });
    }

    const updatedDeck = await prisma.decks.update({
      where: { id: deckId },
      data: {
        title: title || existingDeck.title,
        description:
          description !== undefined ? description : existingDeck.description,
        is_public: is_public !== undefined ? is_public : existingDeck.is_public,
        is_anonymous:
          is_anonymous !== undefined ? is_anonymous : existingDeck.is_anonymous,
      },
    });

    res.json({
      success: true,
      message: "Cập nhật thành công!",
      data: updatedDeck,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi cập nhật bộ thẻ!",
      error: error.message,
    });
  }
};

// 4. XÓA BỘ THẺ
const deleteDeck = async (req, res) => {
  try {
    const deckId = parseInt(req.params.id);
    const userId = parseInt(req.user.id) || req.user.id;

    const existingDeck = await prisma.decks.findFirst({
      where: { id: deckId, user_id: userId },
    });

    if (!existingDeck) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy bộ thẻ hoặc bạn không có quyền xóa!",
      });
    }

    await prisma.decks.delete({
      where: { id: deckId },
    });

    res.json({ success: true, message: "Đã xóa bộ thẻ thành công!" });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi xóa bộ thẻ!",
      error: error.message,
    });
  }
};

module.exports = {
  getMyDecks,
  createDeck,
  createDeckWithCards, // 👉 ĐÃ THÊM: Export hàm mới để Routes gọi được
  updateDeck,
  deleteDeck,
};
