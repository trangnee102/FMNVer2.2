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
      include: {
        Flashcards: {
          select: { difficulty: true },
        },
      },
    });

    const augmentedDecks = decks.map((deck) => {
      let easyCount = 0;
      let mediumCount = 0;
      let hardCount = 0;

      deck.Flashcards.forEach((card) => {
        const diff = (card.difficulty || "EASY").toUpperCase();
        if (diff === "HARD") hardCount++;
        else if (diff === "MEDIUM") mediumCount++;
        else easyCount++;
      });

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
    const userId = parseInt(req.user.id, 10);

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
// 3. TẠO NHIỀU THẺ HOẶC ĐỀ THI TRẮC NGHIỆM CÙNG LÚC
// =========================================
const createDeckWithCards = async (req, res) => {
  try {
    // Lấy biến name để cover trường hợp Frontend gửi 'name' thay vì 'title'
    const {
      title,
      name,
      description,
      is_public,
      is_anonymous,
      cards,
      deck_id,
      isExam,
    } = req.body;
    const userId = parseInt(req.user.id, 10);

    const finalTitle = title || name; // Lấy 1 trong 2

    if (!Array.isArray(cards) || cards.length === 0) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Vui lòng nhập ít nhất 1 thẻ/câu hỏi!",
        });
    }

    // 👉 ĐÃ FIX: Logic phân tích dữ liệu siêu thông minh (Chấp cả Flashcard lẫn Đề thi)
    const validCards = cards
      .map((c) => {
        // Tìm câu hỏi (hỗ trợ cả Flashcard cũ và Đề thi mới)
        const q = c.question || c.front || c.cau_hoi || c.content || c.q || "";
        // Tìm đáp án (Nếu là trắc nghiệm, đáp án text có thể rỗng, ta lấy mảng correctAnswers đắp vào)
        let a = c.answer || c.back || c.dap_an || c.a || "";
        if (a === "" && Array.isArray(c.correctAnswers)) {
          a = JSON.stringify(c.correctAnswers); // Fix lỗi Prisma bắt buộc cột answer phải có chữ
        }

        return {
          question: String(q).trim(),
          answer: String(a).trim(),
          question_type: c.type || "FLASHCARD",
          difficulty: c.difficulty || "MEDIUM",
          options: Array.isArray(c.options) ? JSON.stringify(c.options) : null,
          correct_answers: Array.isArray(c.correctAnswers)
            ? JSON.stringify(c.correctAnswers)
            : null,
          explanation: c.explanation || null,
        };
      })
      .filter((c) => c.question !== "" && c.answer !== "");

    if (validCards.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Dữ liệu tạo ra bị lỗi định dạng hoặc trống nội dung!",
      });
    }

    // Trường hợp chèn thêm thẻ vào bộ Đề có sẵn
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
          deck_id: parsedDeckId,
          ...card,
        })),
      });

      return res.status(200).json({
        success: true,
        message: `Tuyệt vời! Đã chèn thêm ${validCards.length} câu vào bộ "${existingDeck.title}".`,
      });
    }

    // Trường hợp tạo mới hoàn toàn Bộ đề
    if (!finalTitle) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Tên bộ đề/thẻ không được để trống!",
        });
    }

    const newDeck = await prisma.decks.create({
      data: {
        title: finalTitle,
        description: description || null,
        is_public: is_public || false,
        is_anonymous: is_anonymous || false,
        user_id: userId,
        is_exam: isExam === true || isExam === "true", // Đã gắn cờ Đề thi
      },
    });

    await prisma.flashcards.createMany({
      data: validCards.map((card) => ({
        deck_id: newDeck.id,
        ...card,
      })),
    });

    return res.status(201).json({
      success: true,
      message: `Tạo bộ đề thành công cùng với ${validCards.length} câu hỏi!`,
      data: newDeck,
    });
  } catch (error) {
    console.error("🚨 [LỖI NGHIÊM TRỌNG] Sập Server khi lưu:", error);

    res.status(500).json({
      success: false,
      message: "Lỗi hệ thống khi lưu nguyên bộ thẻ/đề thi!",
      error: error.message,
    });
  }
};

// =========================================
// 4. CẬP NHẬT/SỬA TÊN BỘ THẺ / ĐỀ THI
// =========================================
const updateDeck = async (req, res) => {
  try {
    const deckId = parseInt(req.params.id, 10);
    const { title, description, is_public, is_anonymous } = req.body;
    const userId = parseInt(req.user.id, 10);

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
// 5. XÓA BỘ THẺ / ĐỀ THI (ĐÃ SỬA LỖI TRUYẾT KẾT CẤU)
// =========================================
const deleteDeck = async (req, res) => {
  try {
    const deckId = parseInt(req.params.id, 10);
    const userId = parseInt(req.user.id, 10);

    const existingDeck = await prisma.decks.findFirst({
      where: { id: deckId, user_id: userId },
    });

    if (!existingDeck) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy bộ dữ liệu hoặc bạn không có quyền xóa!",
      });
    }

    const flashcards = await prisma.flashcards.findMany({
      where: { deck_id: deckId },
      select: { id: true },
    });
    const flashcardIds = flashcards.map((f) => f.id);

    await prisma.$transaction([
      prisma.studyLogs.deleteMany({ where: { deck_id: deckId } }),
      prisma.studyProgress.deleteMany({
        where: { flashcard_id: { in: flashcardIds } },
      }),
      prisma.flashcards.deleteMany({ where: { deck_id: deckId } }),
      prisma.decks.delete({ where: { id: deckId } }),
    ]);

    res.json({ success: true, message: "Đã dọn dẹp và xóa thành công!" });
  } catch (error) {
    console.error("Lỗi khi xóa:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi hệ thống khi dọn dẹp dữ liệu!",
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