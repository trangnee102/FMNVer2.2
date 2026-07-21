// backend/src/server.js

const express = require("express");
const cors = require("cors");
const path = require("path"); // 👉 ĐÃ THÊM: Import module xử lý đường dẫn
require("dotenv").config({ path: path.join(__dirname, "../.env") });

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

// Debug-friendly route: serve message files with explicit logging (helps when static returns 404)
app.get('/uploads/messages/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, '../uploads/messages', filename);
  console.log('Serving upload file request:', filePath);
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error('Error sending file', filePath, err && err.code);
      res.status(404).send('File not found');
    }
  });
});

// Debug route: list files in uploads/messages
app.get('/api/debug/uploads', (req, res) => {
  const fs = require('fs');
  const dir = path.join(__dirname, '../uploads/messages');
  fs.readdir(dir, (err, files) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, files });
  });
});

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

// Log registered route paths for debugging
if (app._router && app._router.stack) {
  const routes = [];
  app._router.stack.forEach((r) => {
    if (r.route && r.route.path) routes.push(r.route.path);
    else if (r.name === 'router' && r.handle && r.handle.stack) {
      r.handle.stack.forEach((layer) => {
        if (layer.route && layer.route.path) routes.push(layer.route.path);
      });
    }
  });
  console.log('Registered routes:', routes);
}
app.listen(PORT, () => {
  console.log(`✅ Server Backend đang chạy tại http://localhost:${PORT}`);
});
