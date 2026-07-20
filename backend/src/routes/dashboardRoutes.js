// backend/src/routes/dashboardRoutes.js
const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");

// 👉 THÊM MỚI: Gọi anh bảo vệ từ thư mục middlewares sang
const { verifyToken } = require("../middlewares/authMiddleware");

// Áp dụng thẻ bảo vệ cho tất cả các đường dẫn trong file này
router.use(verifyToken);

// Khai báo đường dẫn API: /api/dashboard/summary
router.get("/summary", dashboardController.getDashboardSummary);

module.exports = router;
