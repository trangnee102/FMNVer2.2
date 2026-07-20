const express = require("express");
const router = express.Router();

const {
  getCardsByDeck,
  getCardsForCram, // 👉 ĐÃ THÊM: Import hàm xử lý lò luyện
  createCard,
  updateCard,
  deleteCard,
  createManualFlashcard,
} = require("../controllers/flashcardController");

const { verifyToken } = require("../middlewares/authMiddleware");

// ==========================================
// BỨC TƯỜNG BẢO VỆ: Mọi request đi qua đây đều phải có Token hợp lệ
router.use(verifyToken);
// ==========================================

// 👉 Đã đưa create-manual về đúng vị trí chuẩn (đứng sau bảo vệ)
router.post("/create-manual", createManualFlashcard);

// 👉 THÊM MỚI: Tuyến đường dành riêng cho Lò luyện Cram Mode
// Dùng POST để nhận được Body chứa: examDate, bossModePercent, forgetHistory...
router.post("/deck/:deckId/cram", getCardsForCram);

// Các đường dẫn khác
router.get("/deck/:deckId", getCardsByDeck);
router.post("/deck/:deckId", createCard);
router.put("/:cardId", updateCard);
router.delete("/:cardId", deleteCard);

module.exports = router;
