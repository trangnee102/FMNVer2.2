const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "fmn_secret_key_2026";

const verifyToken = (req, res, next) => {
  // Lấy token từ header của request gửi lên
  const token = req.header("Authorization");

  if (!token) {
    return res
      .status(401)
      .json({
        success: false,
        message: "Truy cập bị từ chối! Vui lòng đăng nhập.",
      });
  }

  try {
    // Cắt bỏ chữ "Bearer " ở đầu chuỗi token (chuẩn chung của thế giới)
    const tokenString = token.startsWith("Bearer ")
      ? token.slice(7, token.length)
      : token;

    // Giải mã token xem có hợp lệ hay đã hết hạn chưa
    const verified = jwt.verify(tokenString, JWT_SECRET);

    // Nếu hợp lệ, nhét thông tin user (id, email) vào request để Controller xài
    req.user = verified;

    // Mời qua cửa đi tiếp đến Controller
    next();
  } catch (error) {
    res
      .status(400)
      .json({ success: false, message: "Token không hợp lệ hoặc đã hết hạn!" });
  }
};

module.exports = { verifyToken };
