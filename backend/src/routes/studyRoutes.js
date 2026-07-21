const express = require("express");
const router = express.Router();

const { reviewCard, getDueCards } = require("../controllers/studyController");
const { verifyToken } = require("../middlewares/authMiddleware");

// Bật lại bảo vệ nhé, vì Controller của cậu đã được bọc thép rồi!
router.use(verifyToken);

// 1. CỔNG LỌC THẺ (👉 ĐÃ SỬA: Cho khớp 100% với link Frontend)
router.get("/deck/:deckId/due-cards", getDueCards);

// 2. CỔNG ĐÁNH GIÁ
router.post("/review", reviewCard);

module.exports = router;
