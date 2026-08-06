const express = require("express");
const router = express.Router();
const quickTestController = require("../controllers/quickTestController");
const { verifyToken } = require("../middlewares/authMiddleware");

// ==========================================
// GIÁO VIÊN (Yêu cầu đăng nhập - verifyToken)
// ==========================================
// Giáo viên phải đăng nhập mới tạo/điều khiển được phòng
router.post("/rooms", verifyToken, quickTestController.createRoom);
router.get("/my-room", verifyToken, quickTestController.getMyRoom);
router.put("/rooms/:roomCode/start", verifyToken, quickTestController.startRoom);
router.put("/rooms/:roomCode/end", verifyToken, quickTestController.endRoom);
router.put("/rooms/:roomCode/advance", verifyToken, quickTestController.advanceQuestion);
router.put("/rooms/:roomCode/reveal", verifyToken, quickTestController.revealQuestion);
router.get("/rooms/:roomCode/question-stats/:questionId", verifyToken, quickTestController.getQuestionStats);

// 👉 ĐÃ FIX: Sửa thành /rooms/ (có chữ s) để đồng bộ 100% với Frontend
router.post("/rooms/:roomCode/cancel", verifyToken, quickTestController.cancelRoom);

// ==========================================
// HỌC SINH (Tham gia ẩn danh - Không yêu cầu token)
// ==========================================
// Học sinh có thể tham gia ẩn danh (không bắt buộc đăng nhập)
router.get("/rooms/:roomCode", quickTestController.getRoom);
router.post("/join", quickTestController.joinRoom);
router.get("/leaderboard", quickTestController.getLeaderboard);
router.post("/submit", quickTestController.submitAnswer);
router.get("/rooms/:roomCode/all-question-stats", quickTestController.getAllQuestionStats);
router.get("/rooms/:roomCode/participant/:participantId/detail", quickTestController.getParticipantDetail);

module.exports = router;
