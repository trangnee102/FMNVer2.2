// backend/src/routes/studyRoutes.js
const express = require("express");
const router = express.Router();

const {
  reviewCard,
  getDueCards,
  generateRandomExam,
  submitExamResults,
} = require("../controllers/studyController");
const { verifyToken } = require("../middlewares/authMiddleware");

// Bật bảo vệ Middleware JWT cho toàn bộ Controller học tập
router.use(verifyToken);

// =========================================
// 1. CÁC ROUTE HỌC TẬP FLASHCARD TRUYỀN THỐNG
// =========================================

// CỔNG LỌC THẺ
router.get("/deck/:deckId/due-cards", getDueCards);

// CỔNG ĐÁNH GIÁ ĐƠN LẺ
router.post("/review", reviewCard);

// =========================================
// 2. ROUTE HỆ THỐNG ĐỀ THI TRẮC NGHIỆM TÍCH HỢP AI
// =========================================

// Cổng tạo đề thi ngẫu nhiên (Cram Mode / Trộn đề)
router.get("/exam/:deckId/random", generateRandomExam);

// Cổng nộp kết quả bài thi trắc nghiệm (Tự động chấm điểm & đồng bộ SM-2)
router.post("/exam/submit", submitExamResults);

module.exports = router;