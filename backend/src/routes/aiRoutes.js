// backend/src/routes/aiRoutes.js
const express = require("express");
const router = express.Router();
const multer = require("multer");

const {
  generateFlashcards,
  saveGeneratedCards,
  refineGeneratedCards, // 👉 THÊM MỚI: Khai báo hàm sửa thẻ
} = require("../controllers/aiController");
const { verifyToken } = require("../middlewares/authMiddleware");

// Cấu hình Multer: Lưu file vào bộ nhớ tạm (RAM) để xử lý luôn, giới hạn 5MB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // Tối đa 5MB
  fileFilter: (req, file, cb) => {
    // 👉 ĐÃ SỬA: Cho phép PDF, Word VÀ CẢ ẢNH (png, jpg, jpeg)
    if (
      file.mimetype === "application/pdf" ||
      file.mimetype === "application/msword" ||
      file.mimetype ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file.mimetype.startsWith("image/")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Chỉ hỗ trợ định dạng PDF, Word hoặc Ảnh (.png, .jpg)!"));
    }
  },
});

// =========================================================================
// API ROUTES
// =========================================================================

// Route 1: Tạo thẻ gốc (Nhận File + Text + customPrompt từ Frontend -> Trả về JSON thẻ)
router.post(
  "/generate",
  verifyToken,
  upload.single("file"),
  generateFlashcards,
);

// Route 2: Lưu thẻ vào Database
router.post("/save", verifyToken, saveGeneratedCards);

// 👉 THÊM MỚI Route 3: AI tự động sửa thẻ theo Prompt
router.post("/refine", verifyToken, refineGeneratedCards);

module.exports = router;
