const express = require("express");
const router = express.Router();

// 👉 ĐÃ SỬA: Khai báo thêm hàm createDeckWithCards
const {
  getMyDecks,
  createDeck,
  createDeckWithCards, // 👉 Mới thêm vào đội hình
  updateDeck,
  deleteDeck,
} = require("../controllers/deckController");
const { verifyToken } = require("../middlewares/authMiddleware");

// Áp dụng bảo vệ cho tất cả các route
router.use(verifyToken);

// Các đường dẫn API
router.get("/", getMyDecks);
router.post("/", createDeck); // API cũ: Chỉ tạo vỏ bộ thẻ
router.post("/bulk", createDeckWithCards); // 👉 ĐÃ THÊM API MỚI: Tạo vỏ + ruột (nhiều thẻ) cùng lúc
router.put("/:id", updateDeck); // PUT dùng để Sửa
router.delete("/:id", deleteDeck); // DELETE dùng để Xóa

module.exports = router;
