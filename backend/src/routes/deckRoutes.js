const express = require("express");
const router = express.Router();

// LỖI LÀ Ở DÒNG NÀY NÈ: Phải liệt kê đủ cả 4 hàm ra thì nó mới nhận diện được
const {
  getMyDecks,
  createDeck,
  updateDeck,
  deleteDeck,
} = require("../controllers/deckController");
const { verifyToken } = require("../middlewares/authMiddleware");

// Áp dụng bảo vệ cho tất cả các route
router.use(verifyToken);

// Các đường dẫn API
router.get("/", getMyDecks);
router.post("/", createDeck);
router.put("/:id", updateDeck); // PUT dùng để Sửa
router.delete("/:id", deleteDeck); // DELETE dùng để Xóa

module.exports = router;
