// backend/src/server.js
const express = require("express");
const http = require("http"); // Module HTTP tích hợp của Node.js
const { Server } = require("socket.io"); // Class Server của Socket.io
const cors = require("cors");
const path = require("path");
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
// 👉 ĐÃ THÊM: Route cho QuickTest
const quickTestRoutes = require("./routes/quickTestRoutes");

const app = express();
const PORT = Number(process.env.PORT) || 5000;

// =========================================
// KHỞI TẠO SERVER & SOCKET.IO
// =========================================
const server = http.createServer(app);

// 👉 Mở toang cửa cho Socket.io với các cấu hình mạng mạnh nhất
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  },
  transports: ["websocket", "polling"], // Ép trình duyệt dùng giao thức WebSocket thời gian thực
});

// Ép Socket.io vào trong Express để các file Controller có thể lôi ra dùng
app.set("io", io);

// 🚨 BẪY BACKEND: Theo dõi nếu có kết nối nào bị máy chủ hắt hủi từ vòng gửi xe
io.engine.on("connection_error", (err) => {
  console.error(
    "🚨 [SYSTEM] Có một trình duyệt bị chặn kết nối Socket:",
    err.message,
  );
});

// Xử lý sự kiện khi có người dùng kết nối qua WebSockets
io.on("connection", async (socket) => {
  // Lấy User ID từ Frontend truyền lên
  const userId = socket.handshake.query.userId;

  if (userId && userId !== "undefined" && userId !== "null") {
    // 1. Tự động join vào phòng cá nhân (Nhận tin nhắn 1-1)
    socket.join(userId.toString());
    console.log(
      `✅ [SYSTEM] Người dùng ID: ${userId} (Socket: ${socket.id}) đã kết nối THÀNH CÔNG!`,
    );

    // 2. Tự động đăng ký tần số cho TẤT CẢ các phòng chat của user
    try {
      const myChats = await prisma.participants.findMany({
        where: { user_id: parseInt(userId, 10) },
        select: { conversation_id: true },
      });

      myChats.forEach((chat) => {
        socket.join(chat.conversation_id.toString());
      });
      console.log(
        `✅ [SYSTEM] Đã đăng ký nhận tin ngầm cho ${myChats.length} hội thoại của User ${userId}`,
      );
    } catch (error) {
      console.error("Lỗi khi đăng ký kênh chat ngầm:", error);
    }
  } else {
    console.log(`📡 Một người dùng ẩn danh vừa kết nối: ${socket.id}`);
  }

  // =========================================
  // LOGIC REAL-TIME CHO CHAT CỘNG ĐỒNG
  // =========================================
  socket.on("joinRoom", (conversationId) => {
    if (conversationId) {
      socket.join(conversationId.toString());
      console.log(
        `User ${userId || socket.id} đã vào phòng chat ${conversationId}`,
      );
    }
  });

  socket.on("typing", ({ targetId, isGroup, userName, conversationId }) => {
    if (targetId) {
      socket
        .to(targetId.toString())
        .emit("userTyping", { userName, conversationId });
    }
  });

  socket.on("stopTyping", ({ targetId, isGroup, userName, conversationId }) => {
    if (targetId) {
      socket
        .to(targetId.toString())
        .emit("userStoppedTyping", { userName, conversationId });
    }
  });


  // =========================================
  // 👉 ĐÃ THÊM: LOGIC REAL-TIME CHO QUICKTEST 
  // =========================================
  
  // 1. Giáo viên/Học sinh join vào phòng thi (phân biệt bằng roomCode)
  socket.on("join_quicktest", ({ roomCode, userType, userName }) => {
    if (roomCode) {
      const roomStr = `quicktest_${roomCode}`;
      socket.join(roomStr);
      console.log(`⚡ [QuickTest] ${userType} [${userName || socket.id}] đã vào phòng: ${roomCode}`);

      // Nếu là học sinh, báo cho cả phòng (đặc biệt là giáo viên) biết để update danh sách chờ
      if (userType === "student" || userType === "participant") {
        io.to(roomStr).emit("player_joined", { id: socket.id, name: userName });
      }
    }
  });

  // 2. Giáo viên bấm "Bắt đầu" -> Báo toàn bộ học sinh chuyển sang màn hình làm bài
  socket.on("start_quicktest", (roomCode) => {
    console.log(`⚡ [QuickTest] Phòng ${roomCode} đã BẮT ĐẦU làm bài!`);
    io.to(`quicktest_${roomCode}`).emit("test_started");
  });

  // 3. Học sinh chọn đáp án -> Báo điểm về cho Giáo viên (Live Leaderboard)
  socket.on("submit_answer", ({ roomCode, participantId, studentName, score, isCorrect }) => {
    io.to(`quicktest_${roomCode}`).emit("live_update", { 
      participantId, 
      studentName, 
      score, 
      isCorrect 
    });
  });

  // 4. Giáo viên kết thúc bài thi sớm (hoặc hết giờ) -> Báo học sinh dừng làm bài
  socket.on("end_quicktest", (roomCode) => {
    console.log(`⚡ [QuickTest] Phòng ${roomCode} đã KẾT THÚC!`);
    io.to(`quicktest_${roomCode}`).emit("test_ended");
  });

  // Xử lý khi người dùng thoát trang hoặc đóng trình duyệt
  socket.on("disconnect", () => {
    console.log(`❌ Người dùng ${userId || socket.id} đã ngắt kết nối`);
  });
});
// =========================================

app.use(cors());
app.use(express.json());

// Mở cổng public cho thư mục uploads để Frontend có thể tải ảnh/file về xem
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Debug-friendly route: serve message files with explicit logging
app.get("/uploads/messages/:filename", (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, "../uploads/messages", filename);
  res.sendFile(filePath, (err) => {
    if (err) {
      res.status(404).send("File not found");
    }
  });
});

// Debug route: list files in uploads/messages
app.get("/api/debug/uploads", (req, res) => {
  const fs = require("fs");
  const dir = path.join(__dirname, "../uploads/messages");
  fs.readdir(dir, (err, files) => {
    if (err)
      return res.status(500).json({ success: false, error: err.message });
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

// 👉 ĐÃ THÊM: Kích hoạt đường dẫn API cho QuickTest
app.use("/api/quicktest", quickTestRoutes);

// Khởi chạy Server
const startServerWithPort = (port) => {
  const onError = (error) => {
    if (error.code === "EADDRINUSE") {
      console.warn(
        `⚠️ Cổng ${port} đang bị chiếm, đang thử cổng ${port + 1}...`,
      );
      server.removeListener("error", onError);
      startServerWithPort(port + 1);
    } else {
      console.error("Server startup error:", error);
      process.exit(1);
    }
  };

  server.on("error", onError);

  // Ép server lắng nghe trên MỌI card mạng ("0.0.0.0") thay vì chỉ máy ảo cục bộ
  server.listen(port, "0.0.0.0", () => {
    console.log(
      `✅ Server Backend & Socket.io đang chạy tại http://localhost:${port} (Mạng: 0.0.0.0)`,
    );
  });
};

startServerWithPort(PORT);