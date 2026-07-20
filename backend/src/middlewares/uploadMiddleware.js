// backend/src/middlewares/uploadMiddleware.js
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// 👉 Tự động tạo thư mục uploads/messages nếu chưa có
const uploadDir = path.join(__dirname, "../../uploads/messages");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 👉 Cấu hình nơi lưu và tên file
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir); // Lưu vào backend/uploads/messages
  },
  filename: function (req, file, cb) {
    // Tạo tên file ngẫu nhiên để không bị trùng (VD: 1715000000-btap.pdf)
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});

// 👉 Bộ lọc file: Cho phép ảnh và các file tài liệu phổ biến
const fileFilter = (req, file, cb) => {
  const allowedExtensions = [
    ".jpg",
    ".jpeg",
    ".png",
    ".gif", // Ảnh
    ".pdf",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
    ".ppt",
    ".pptx",
    ".txt",
    ".zip",
    ".rar", // Tài liệu
  ];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedExtensions.includes(ext)) {
    cb(null, true); // Chấp nhận
  } else {
    cb(new Error("Loại file này không được hỗ trợ!"), false); // Từ chối
  }
};

// 👉 Giới hạn dung lượng: Ảnh < 5MB, File < 20MB
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB (tối đa)
  },
});

module.exports = upload;
