const express = require("express");
const router = express.Router();
const { getStatistics } = require("../controllers/statisticsController");

// 👉 ĐÃ SỬA: Lấy chính xác "anh bảo vệ" verifyToken ra từ Object
const { verifyToken } = require("../middlewares/authMiddleware");

// Đón request tại cổng: GET /api/statistics
// Áp dụng verifyToken để bảo mật
router.get("/", verifyToken, getStatistics);

module.exports = router;
