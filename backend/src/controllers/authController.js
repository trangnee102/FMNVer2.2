const prisma = require("../services/prisma");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const sendEmail = require("../utils/sendEmail");

// Chìa khóa bí mật để tạo thẻ thông hành token (bắt buộc phải có trong .env)
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("Thiếu biến môi trường JWT_SECRET! Vui lòng khai báo trong file .env");
}

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
    // 👉 Lấy userId từ token đã xác thực (verifyToken), KHÔNG tin vào body
    const userId = req.user.id;
    const { full_name, email } = req.body;

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

// 👉 ĐÃ THÊM: --- CHỨC NĂNG QUÊN MẬT KHẨU ---
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: "Vui lòng cung cấp email" });
    }

    const user = await prisma.users.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ success: false, message: "Không tìm thấy tài khoản với email này" });
    }

    const resetToken = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '15m' });
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

    const message = `Bạn nhận được email này vì bạn (hoặc ai đó) đã yêu cầu khôi phục mật khẩu tài khoản ForgetMeNot.\n\nVui lòng nhấp vào đường dẫn bên dưới để đặt lại mật khẩu (có hiệu lực trong 15 phút):\n\n${resetUrl}\n\nNếu bạn không yêu cầu, hãy bỏ qua email này.`;

    await sendEmail({
      email: user.email,
      subject: "Yêu cầu khôi phục mật khẩu - ForgetMeNot",
      message: message,
    });

    res.json({ success: true, message: "Đã gửi link khôi phục vào email của bạn!" });
  } catch (error) {
    console.error("Lỗi forgotPassword:", error);
    res.status(500).json({ success: false, message: "Lỗi hệ thống khi gửi email", error: error.message });
  }
};

// 👉 ĐÃ THÊM: --- CHỨC NĂNG ĐẶT LẠI MẬT KHẨU ---
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({ success: false, message: "Token hoặc mật khẩu mới không hợp lệ" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return res.status(400).json({ success: false, message: "Đường dẫn không hợp lệ hoặc đã hết hạn" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await prisma.users.update({
      where: { id: decoded.id },
      data: { password_hash: hashedPassword }
    });

    res.json({ success: true, message: "Đặt lại mật khẩu thành công!" });
  } catch (error) {
    console.error("Lỗi resetPassword:", error);
    res.status(500).json({ success: false, message: "Lỗi hệ thống khi đặt lại mật khẩu", error: error.message });
  }
};

// XUẤT CÁC HÀM ĐỂ FILE KHÁC XÀI ĐƯỢC
module.exports = {
  register,
  login,
  updateProfile, // 👉 ĐÃ BỔ SUNG
  forgotPassword,
  resetPassword,
};
