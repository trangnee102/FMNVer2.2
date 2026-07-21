// backend/src/server.js

const express = require("express");
const cors = require("cors");
const path = require("path"); // 👉 ĐÃ THÊM: Import module xử lý đường dẫn
require("dotenv").config();

const prisma = require("./services/prisma");

// 1. NHÚNG ROUTE: Nạp file định tuyến vào hệ thống
const authRoutes = require("./routes/authRoutes");
const deckRoutes = require("./routes/deckRoutes");
const flashcardRoutes = require("./routes/flashcardRoutes");
const studyRoutes = require("./routes/studyRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const statisticsRoutes = require("./routes/statisticsRoutes");
const aiRoutes = require("./routes/aiRoutes");
const communityRoutes = require("./routes/communityRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// 👉 ĐÃ THÊM: Mở cổng public cho thư mục uploads để Frontend có thể tải ảnh/file về xem
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// API gốc (Lời chào hệ thống)
app.get("/", (req, res) => {
  res.json({ message: "Hệ thống FORGETMENOT đã khởi chạy!" });
});

// API TEST KẾT NỐI DATABASE
app.get("/api/test-db", async (req, res) => {
  try {
    const users = await prisma.users.findMany();
    res.json({
      success: true,
      message: "Kết nối SQL Server thành công rực rỡ!",
      data: users,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. KÍCH HOẠT ĐƯỜNG DẪN
app.use("/api/auth", authRoutes);
app.use("/api/decks", deckRoutes);
app.use("/api/flashcards", flashcardRoutes);
app.use("/api/study", studyRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/statistics", statisticsRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/community", communityRoutes);

app.listen(PORT, () => {
  console.log(`✅ Server Backend đang chạy tại http://localhost:${PORT}`);
});
