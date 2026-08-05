const express = require("express");
const router = express.Router();
const quickTestController = require("../controllers/quickTestController");
const { verifyToken } = require("../middlewares/authMiddleware");

// Giáo viên phải đăng nhập mới tạo/điều khiển được phòng
router.post("/rooms", verifyToken, quickTestController.createRoom);
router.get("/my-room", verifyToken, quickTestController.getMyRoom);
router.put("/rooms/:roomCode/start", verifyToken, quickTestController.startRoom);
router.put("/rooms/:roomCode/end", verifyToken, quickTestController.endRoom);
router.put("/rooms/:roomCode/advance", verifyToken, quickTestController.advanceQuestion);
router.put("/rooms/:roomCode/reveal", verifyToken, quickTestController.revealQuestion);
router.get("/rooms/:roomCode/question-stats/:questionId", verifyToken, quickTestController.getQuestionStats);

// Học sinh có thể tham gia ẩn danh (không bắt buộc đăng nhập)
router.get("/rooms/:roomCode", quickTestController.getRoom);
router.post("/join", quickTestController.joinRoom);
router.get("/leaderboard", quickTestController.getLeaderboard);
router.post("/submit", quickTestController.submitAnswer);
router.get("/rooms/:roomCode/all-question-stats", quickTestController.getAllQuestionStats);

module.exports = router;