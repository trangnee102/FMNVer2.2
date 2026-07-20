// File: backend/src/controllers/flashcardController.js
const flashcardService = require("../services/flashcardService");

// 👉 THÊM: Import bộ não thuật toán Cram Mode vừa tạo
const { runCramAlgorithm } = require("../algorithms/cramAlgorithm");

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const getCardsByDeck = async (req, res) => {
  try {
    const cards = await flashcardService.getCards(
      parseInt(req.params.deckId),
      req.user.id,
    );
    res.json({ success: true, data: cards });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
};

// =========================================================
// 🚀 THÊM MỚI: API CHUYÊN DỤNG CHO LÒ LUYỆN CRAM MODE
// =========================================================
const getCardsForCram = async (req, res) => {
  try {
    const deckId = parseInt(req.params.deckId);
    const userId = req.user.id;

    // 1. Nhận các thông số cấu hình do Frontend gửi lên (qua Body)
    const {
      examDate,
      currentDate,
      bossModePercent,
      dailyQuota,
      forgetHistory,
    } = req.body;

    // 2. Lấy toàn bộ flashcard của môn học này từ Database
    const allCards = await flashcardService.getCards(deckId, userId);

    // 3. Đưa thẻ thô vào bộ não Thuật toán để lọc và sắp xếp
    const cramResult = runCramAlgorithm({
      allCards,
      examDateStr: examDate,
      currentDateStr: currentDate, // Hỗ trợ Cỗ máy thời gian
      bossModePercent: parseInt(bossModePercent) || 30,
      dailyQuota: parseInt(dailyQuota) || 50,
      forgetHistory: forgetHistory || {},
    });

    // 4. Trả mảng thẻ đã được "độ" lại về cho React render
    res.json({ success: true, data: cramResult });
  } catch (error) {
    console.error("Lỗi khi xử lý Cram Mode:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
// =========================================================

const createCard = async (req, res) => {
  try {
    const { question, answer } = req.body;
    if (!question || !answer) {
      return res.status(400).json({
        success: false,
        message: "Phải nhập đủ câu hỏi và câu trả lời!",
      });
    }

    const newCard = await flashcardService.createCard(
      parseInt(req.params.deckId),
      req.user.id,
      question,
      answer,
    );
    res.status(201).json({
      success: true,
      message: "Đã thêm 1 thẻ mới vào bộ!",
      data: newCard,
    });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
};

const createManualFlashcard = async (req, res) => {
  try {
    const { front_content, back_content, deck_id, new_deck_name } = req.body;

    if (!front_content || !back_content) {
      return res.status(400).json({
        success: false,
        message: "Phải nhập đủ câu hỏi và câu trả lời!",
      });
    }

    const userId = req.user ? req.user.id : 1;
    let targetDeckId;

    if (new_deck_name) {
      const newDeck = await prisma.decks.create({
        data: {
          title: new_deck_name,
          user_id: userId,
          is_public: false,
        },
      });
      targetDeckId = newDeck.id;
    } else {
      targetDeckId = deck_id ? parseInt(deck_id) : 1;
    }

    const newCard = await flashcardService.createCard(
      targetDeckId,
      userId,
      front_content,
      back_content,
    );

    res.status(201).json({
      success: true,
      message: "Lưu thẻ thủ công thành công!",
      data: newCard,
    });
  } catch (error) {
    console.error("Lỗi khi tạo thẻ thủ công:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateCard = async (req, res) => {
  try {
    const { question, answer } = req.body;
    const updatedCard = await flashcardService.updateCard(
      parseInt(req.params.cardId),
      req.user.id,
      question,
      answer,
    );
    res.json({
      success: true,
      message: "Cập nhật thẻ thành công!",
      data: updatedCard,
    });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
};

const deleteCard = async (req, res) => {
  try {
    await flashcardService.deleteCard(parseInt(req.params.cardId), req.user.id);
    res.json({ success: true, message: "Đã xóa thẻ thành công!" });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
};

// 👉 THÊM getCardsForCram vào danh sách xuất khẩu
module.exports = {
  getCardsByDeck,
  getCardsForCram,
  createCard,
  updateCard,
  deleteCard,
  createManualFlashcard,
};
