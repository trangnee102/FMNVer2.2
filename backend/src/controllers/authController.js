const prisma = require("../services/prisma");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Chìa khóa bí mật để tạo thẻ thông hành token (có thể đổi tùy ý)
const JWT_SECRET = process.env.JWT_SECRET || "fmn_secret_key_2026";

// --- CHỨC NĂNG ĐĂNG KÝ ---
const register = async (req, res) => {
  try {
    const { email, password, full_name } = req.body;

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

    const nameToSave = full_name || email.split("@")[0];

    // Lưu xuống DB
    const newUser = await prisma.users.create({
      data: {
        email: email,
        password_hash: hashedPassword,
        role: "student",
        full_name: nameToSave,
      },
    });

    const token = jwt.sign(
      {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        full_name: newUser.full_name,
        created_at: newUser.created_at || newUser.createdAt,
      },
      JWT_SECRET,
      { expiresIn: "1d" },
    );

    res.status(201).json({
      success: true,
      message: "Đăng ký tài khoản thành công!",
      token: token,
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        full_name: newUser.full_name,
        created_at: newUser.created_at || newUser.createdAt,
      },
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

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        full_name: user.full_name,
        created_at: user.created_at || user.createdAt,
      },
      JWT_SECRET,
      { expiresIn: "1d" },
    );

    res.json({
      success: true,
      message: "Đăng nhập thành công!",
      token: token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        full_name: user.full_name,
        created_at: user.created_at || user.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi hệ thống khi đăng nhập!",
      error: error.message,
    });
  }
};

// 👉 ĐÃ THÊM: --- CHỨC NĂNG CẬP NHẬT HỒ SƠ ---
const updateProfile = async (req, res) => {
  try {
    // Nhận ID từ body (do Frontend gửi xuống) và dữ liệu cần sửa
    const { userId, full_name, email } = req.body;

    if (!userId) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Không tìm thấy thông tin người dùng để cập nhật!",
        });
    }

    // Tiến hành cập nhật thông tin trong Database
    const updatedUser = await prisma.users.update({
      where: { id: userId },
      data: {
        full_name: full_name,
        email: email, // Bổ sung để cho phép đổi email nếu cần
      },
    });

    // Cấp lại Token mới với thông tin vừa được cập nhật
    const token = jwt.sign(
      {
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
        full_name: updatedUser.full_name,
        created_at: updatedUser.created_at || updatedUser.createdAt,
      },
      JWT_SECRET,
      { expiresIn: "1d" },
    );

    res.json({
      success: true,
      message: "Đã lưu cài đặt thành công!",
      token: token,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
        full_name: updatedUser.full_name,
        created_at: updatedUser.created_at || updatedUser.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi hệ thống khi cập nhật hồ sơ!",
      error: error.message,
    });
  }
};

// XUẤT CÁC HÀM ĐỂ FILE KHÁC XÀI ĐƯỢC
module.exports = {
  register,
  login,
  updateProfile, // 👉 ĐÃ BỔ SUNG
};
