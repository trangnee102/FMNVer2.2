const express = require("express");
const router = express.Router();

const { reviewCard, getDueCards } = require("../controllers/studyController");
// Tạm thời vô hiệu hóa anh bảo vệ khắt khe để test cho mượt
// const { verifyToken } = require("../middlewares/authMiddleware");
// router.use(verifyToken);

// 1. CỔNG LỌC THẺ
router.get("/due/:deckId", getDueCards);

// 2. CỔNG ĐÁNH GIÁ
router.post("/review", reviewCard);

module.exports = router;
