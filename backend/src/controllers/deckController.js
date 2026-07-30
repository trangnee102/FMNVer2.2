// backend/src/controllers/deckController.js
const prisma = require("../services/prisma");

// =========================================
// 1. LẤY DANH SÁCH BỘ THẺ HOẶC ĐỀ THI
// =========================================
const getMyDecks = async (req, res) => {
  try {
    const userId = parseInt(req.user.id) || req.user.id;
    const { type } = req.query;

    let whereClause = { user_id: userId };

    if (type === "exam") {
      whereClause.is_exam = true;
    } else {
      whereClause.is_exam = false;
    }

    const decks = await prisma.decks.findMany({
      where: whereClause,
      orderBy: { id: "desc" },
      // 👉 ĐÃ SỬA: Lấy độ khó của tất cả câu hỏi lên để đếm
      include: {
        Flashcards: {
          select: { difficulty: true },
        },
      },
    });

    // 👉 ĐÃ THÊM: Quét và đếm chính xác số lượng Dễ/Vừa/Khó của từng đề
    const augmentedDecks = decks.map((deck) => {
      let easyCount = 0;
      let mediumCount = 0;
      let hardCount = 0;

      deck.Flashcards.forEach((card) => {
        const diff = (card.difficulty || "EASY").toUpperCase(); // Nếu null thì gom vào Dễ
        if (diff === "HARD") hardCount++;
        else if (diff === "MEDIUM") mediumCount++;
        else easyCount++;
      });

      // Tách bỏ mảng Flashcards để gói tin gửi về Frontend được nhẹ nhàng
      const { Flashcards, ...deckData } = deck;

      return {
        ...deckData,
        totalCards: Flashcards.length,
        easyCount,
        mediumCount,
        hardCount,
      };
    });

    res.json({ success: true, data: augmentedDecks });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy dữ liệu!",
      error: error.message,
    });
  }
};

// =========================================
// 2. TẠO BỘ THẺ MỚI (Tạo riêng lẻ không có thẻ)
// =========================================
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
        is_exam: false,
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
// 3. TẠO NHIỀU THẺ CÙNG LÚC TỪ AI
// =========================================
const createDeckWithCards = async (req, res) => {
  try {
    const { title, deck_id, description, is_public, is_anonymous, cards } =
      req.body;
    const userId = parseInt(req.user.id) || req.user.id;

    if (!Array.isArray(cards) || cards.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Vui lòng nhập ít nhất 1 thẻ!" });
    }

    const validCards = cards
      .map((c) => {
        const q = c.question || c.front || c.cau_hoi || c.CauHoi || c.q || "";
        const a = c.answer || c.back || c.dap_an || c.DapAn || c.a || "";
        return {
          question: String(q).trim(),
          answer: String(a).trim(),
        };
      })
      .filter((c) => c.question !== "" && c.answer !== "");

    if (validCards.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Thẻ AI tạo ra bị lỗi định dạng hoặc trống nội dung!",
      });
    }

    if (deck_id) {
      const parsedDeckId = parseInt(deck_id);

      const existingDeck = await prisma.decks.findFirst({
        where: { id: parsedDeckId, user_id: userId },
      });

      if (!existingDeck) {
        return res
          .status(404)
          .json({ success: false, message: "Không tìm thấy bộ thẻ bạn chọn!" });
      }

      await prisma.flashcards.createMany({
        data: validCards.map((card) => ({
          question: card.question,
          answer: card.answer,
          deck_id: parsedDeckId,
        })),
      });

      return res.status(200).json({
        success: true,
        message: `Tuyệt vời! Đã thêm ${validCards.length} thẻ vào bộ "${existingDeck.title}".`,
      });
    }

    if (!title) {
      return res
        .status(400)
        .json({ success: false, message: "Tên bộ thẻ không được để trống!" });
    }

    const newDeck = await prisma.decks.create({
      data: {
        title: title,
        description: description || "Tạo tự động bằng AI",
        is_public: is_public || false,
        is_anonymous: is_anonymous || false,
        user_id: userId,
        is_exam: false,
      },
    });

    await prisma.flashcards.createMany({
      data: validCards.map((card) => ({
        question: card.question,
        answer: card.answer,
        deck_id: newDeck.id,
      })),
    });

    return res.status(201).json({
      success: true,
      message: `Tạo bộ thẻ "${title}" thành công cùng với ${validCards.length} thẻ!`,
      data: newDeck,
    });
  } catch (error) {
    console.error("🚨 [LỖI NGHIÊM TRỌNG] Sập Server khi lưu thẻ AI:", error);

    res.status(500).json({
      success: false,
      message: "Lỗi hệ thống khi lưu nguyên bộ thẻ!",
      error: error.message,
    });
  }
};

// =========================================
// 4. CẬP NHẬT/SỬA TÊN BỘ THẺ / ĐỀ THI
// =========================================
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
        message: "Không tìm thấy bộ dữ liệu hoặc bạn không có quyền sửa!",
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
      message: "Lỗi khi cập nhật!",
      error: error.message,
    });
  }
};

// =========================================
// 5. XÓA BỘ THẺ / ĐỀ THI
// =========================================
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
        message: "Không tìm thấy bộ dữ liệu hoặc bạn không có quyền xóa!",
      });
    }

    await prisma.decks.delete({
      where: { id: deckId },
    });

    res.json({ success: true, message: "Đã xóa thành công!" });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi xóa!",
      error: error.message,
    });
  }
};

module.exports = {
  getMyDecks,
  createDeck,
  createDeckWithCards,
  updateDeck,
  deleteDeck,
};
