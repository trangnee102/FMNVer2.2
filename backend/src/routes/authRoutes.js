const express = require("express");
const router = express.Router();
// 👉 ĐÃ SỬA: Lôi thêm hàm updateProfile từ Controller ra
const {
  register,
  login,
  updateProfile,
} = require("../controllers/authController");

// Khai báo đường dẫn API cho đăng ký
router.post("/register", register);

// Khai báo đường dẫn API cho đăng nhập
router.post("/login", login);

// 👉 ĐÃ THÊM: Cánh cửa API nhận dữ liệu Cập nhật hồ sơ từ Frontend
router.put("/update-profile", updateProfile);

// Xuất router ra cho server.js sử dụng
module.exports = router;
