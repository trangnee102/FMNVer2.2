const prisma = require("../services/prisma");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Chìa khóa bí mật để tạo thẻ thông hành token (có thể đổi tùy ý)
const JWT_SECRET = process.env.JWT_SECRET || "fmn_secret_key_2026";

// --- CHỨC NĂNG ĐĂNG KÝ ---
const register = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập đầy đủ email và mật khẩu!",
      });
    }

    // Kiểm tra trùng email
    const existingUser = await prisma.users.findUnique({
      where: { email: email },
    });
    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, message: "Email này đã được sử dụng rồi!" });
    }

    // Mã hóa mật khẩu
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Lưu xuống DB
    const newUser = await prisma.users.create({
      data: {
        email: email,
        password_hash: hashedPassword,
        role: "student",
      },
    });

    // 👉 ĐÃ VÁ LỖI: Cấp luôn Token cho người dùng mới đăng ký
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role },
      JWT_SECRET,
      { expiresIn: "1d" },
    );

    res.status(201).json({
      success: true,
      message: "Đăng ký tài khoản thành công!",
      token: token, // <-- Gửi Token về cho Frontend
      user: { id: newUser.id, email: newUser.email, role: newUser.role },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi hệ thống khi đăng ký!",
      error: error.message,
    });
  }
};

// --- CHỨC NĂNG ĐĂNG NHẬP ---
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng điền đầy đủ email và mật khẩu!",
      });
    }

    // Tìm user theo email
    const user = await prisma.users.findUnique({
      where: { email: email },
    });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Email hoặc mật khẩu không chính xác!",
      });
    }

    // So sánh mật khẩu
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Email hoặc mật khẩu không chính xác!",
      });
    }

    // Cấp Token hạn 1 ngày
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "1d" },
    );

    res.json({
      success: true,
      message: "Đăng nhập thành công!",
      token: token,
      user: { id: user.id, email: user.email, role: user.role },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi hệ thống khi đăng nhập!",
      error: error.message,
    });
  }
};

// XUẤT CÁC HÀM ĐỂ FILE KHÁC XÀI ĐƯỢC
module.exports = {
  register,
  login,
};
