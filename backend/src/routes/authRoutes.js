const express = require("express");
const router = express.Router();
const { register, login } = require("../controllers/authController");

// Khai báo đường dẫn API cho đăng ký
router.post("/register", register);

// Khai báo đường dẫn API cho đăng nhập
router.post("/login", login);

// Xuất router ra cho server.js sử dụng
module.exports = router;
