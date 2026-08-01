const express = require("express");
const router = express.Router();

// 👉 ĐÃ THÊM: Import hàm generateRandomExam từ controller
const {
  reviewCard,
  getDueCards,
  generateRandomExam,
} = require("../controllers/studyController");
const { verifyToken } = require("../middlewares/authMiddleware");

// Bật lại bảo vệ nhé, vì Controller của cậu đã được bọc thép rồi!
router.use(verifyToken);

// =========================================
// 1. CÁC ROUTE HỌC TẬP FLASHCARD TRUYỀN THỐNG
// =========================================

// CỔNG LỌC THẺ (👉 ĐÃ SỬA: Cho khớp 100% với link Frontend)
router.get("/deck/:deckId/due-cards", getDueCards);

// CỔNG ĐÁNH GIÁ
router.post("/review", reviewCard);

// =========================================
// 2. ROUTE HỆ THỐNG ĐỀ THI TRẮC NGHIỆM (FMNVER 2.1)
// =========================================

// 👉 ROUTE MỚI: Cổng tạo đề thi ngẫu nhiên
// Frontend gọi: GET /api/study/exam/:deckId/random?limit=20&difficulty=HARD
router.get("/exam/:deckId/random", generateRandomExam);

module.exports = router;
