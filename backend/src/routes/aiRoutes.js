const express = require("express");
const router = express.Router();
const multer = require("multer");

const {
  generateFlashcards,
  saveGeneratedCards,
  refineGeneratedCards,
  askAIMentor,
} = require("../controllers/aiController");

const aiExamController = require("../controllers/aiExamController");
const { verifyToken } = require("../middlewares/authMiddleware");

// ==========================================
// 1. CẤU HÌNH MULTER (UPLOAD FILE TRONG BỘ NHỚ)
// ==========================================
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // Giới hạn 5MB
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype === "application/pdf" ||
      file.mimetype === "application/msword" ||
      file.mimetype ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file.mimetype.startsWith("image/")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Chỉ hỗ trợ định dạng PDF, Word hoặc Ảnh (.png, .jpg, .jpeg)!"));
    }
  },
});

// Middleware xử lý lỗi Multer (tránh crash app khi upload sai định dạng / quá dung lượng)
const handleMulterUpload = (req, res, next) => {
  const uploadSingle = upload.single("file");
  uploadSingle(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          message: "Dung lượng file vượt quá giới hạn 5MB!",
        });
      }
      return res.status(400).json({
        success: false,
        message: `Lỗi upload file: ${err.message}`,
      });
    } else if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || "File không hợp lệ!",
      });
    }
    next();
  });
};

// ==========================================
// 2. CÁC ROUTES AI - FLASHCARD
// ==========================================
router.post(
  "/generate",
  verifyToken,
  handleMulterUpload,
  generateFlashcards
);

router.post("/save", verifyToken, saveGeneratedCards);

router.post("/refine", verifyToken, refineGeneratedCards);

router.post("/ask-mentor", verifyToken, askAIMentor);

// ==========================================
// 3. CÁC ROUTES AI - ĐỀ THI TRẮC NGHIỆM (EXAM)
// ==========================================
router.post(
  "/generate-exam",
  verifyToken,
  handleMulterUpload,
  aiExamController.generateExam
);

router.post("/save-exam", verifyToken, aiExamController.saveGeneratedExam);

router.post(
  "/edit-exam-question",
  verifyToken,
  aiExamController.editQuestionWithAI
);

// Bổ sung route Tạo đề thi thích ứng (Adaptive Exam) còn thiếu
router.post(
  "/generate-adaptive-exam/:deckId",
  verifyToken,
  aiExamController.generateAdaptiveExam
);

module.exports = router;