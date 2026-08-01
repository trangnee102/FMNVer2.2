// backend/src/routes/aiRoutes.js
const express = require("express");
const router = express.Router();
const multer = require("multer");

const {
  generateFlashcards,
  saveGeneratedCards,
  refineGeneratedCards,
} = require("../controllers/aiController");

// Gọi Controller xử lý Đề thi
const aiExamController = require("../controllers/aiExamController");

const { verifyToken } = require("../middlewares/authMiddleware");

// Cấu hình Multer: Lưu file vào bộ nhớ tạm (RAM) để xử lý luôn, giới hạn 5MB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // Tối đa 5MB
  fileFilter: (req, file, cb) => {
    // Cho phép PDF, Word VÀ CẢ ẢNH (png, jpg, jpeg)
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

// =========================================================================
// TÍNH NĂNG 1: TẠO FLASHCARD (LẬT TRUYỀN THỐNG)
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

// Route 3: AI tự động sửa thẻ theo Prompt
router.post("/refine", verifyToken, refineGeneratedCards);

// =========================================================================
// TÍNH NĂNG 2: TẠO ĐỀ THI TRẮC NGHIỆM (MỚI)
// =========================================================================

// Route 4: AI sinh ra đề thi trắc nghiệm từ text hoặc file
router.post(
  "/generate-exam",
  verifyToken,
  upload.single("file"),
  aiExamController.generateExam,
);

// Route 5: Lưu đề thi vào Database
router.post("/save-exam", verifyToken, aiExamController.saveGeneratedExam);

// 👉 ĐÃ THÊM: Route 6: Sửa câu hỏi thi bằng AI
router.post(
  "/edit-exam-question",
  verifyToken,
  aiExamController.editQuestionWithAI,
);

module.exports = router;
