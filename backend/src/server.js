const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const prisma = require("./services/prisma");

// Nhập khẩu các Router
const authRoutes = require("./routes/authRoutes");
const deckRoutes = require("./routes/deckRoutes");
const flashcardRoutes = require("./routes/flashcardRoutes");
const studyRoutes = require("./routes/studyRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const statisticsRoutes = require("./routes/statisticsRoutes");
const aiRoutes = require("./routes/aiRoutes");
const communityRoutes = require("./routes/communityRoutes");
const quickTestRoutes = require("./routes/quickTestRoutes");

const app = express();
const PORT = Number(process.env.PORT) || 5000;

// Khởi tạo HTTP Server
const server = http.createServer(app);

// Khởi tạo Socket.IO với cấu hình CORS cho phép mọi nguồn kết nối
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  },
  transports: ["websocket", "polling"],
});

// Gắn đối tượng Socket.io vào Express app để có thể dùng trong Controller (req.app.get('io'))
app.set("io", io);

io.engine.on("connection_error", (err) => {
  console.error(
    "🚨 [SYSTEM] Có một trình duyệt bị chặn kết nối Socket:",
    err.message,
  );
});

// ==========================================
// CẤU HÌNH SỰ KIỆN SOCKET.IO
// ==========================================
io.on("connection", async (socket) => {
  const userId = socket.handshake.query.userId;

  // 👉 ĐÃ FIX: Chặn thêm chữ "guest" và kiểm tra xem userId có ĐÚNG LÀ MỘT SỐ hay không (!isNaN)
  if (
    userId &&
    userId !== "undefined" &&
    userId !== "null" &&
    userId !== "guest" &&
    !isNaN(parseInt(userId, 10))
  ) {
    socket.join(userId.toString());
    console.log(
      `✅ [SYSTEM] Người dùng ID: ${userId} (Socket: ${socket.id}) đã kết nối THÀNH CÔNG!`,
    );

    try {
      // Đăng ký nhận tin nhắn realtime cho tất cả cuộc hội thoại của User
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
      console.error("❌ Lỗi khi đăng ký kênh chat ngầm:", error);
    }
  } else {
    console.log(`📡 Một người dùng ẩn danh vừa kết nối: ${socket.id}`);
  }

  // Sự kiện phòng Chat
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

  // Sự kiện thi nhanh (QuickTest)
  socket.on("join_quicktest", ({ roomCode, userType, userName }) => {
    if (roomCode) {
      const roomStr = `quicktest_${roomCode}`;
      socket.join(roomStr);
      console.log(
        `⚡ [QuickTest] ${userType} [${userName || socket.id}] đã vào phòng: ${roomCode}`,
      );

      if (userType === "student" || userType === "participant") {
        io.to(roomStr).emit("player_joined", { id: socket.id, name: userName });
      }
    }
  });

  socket.on("start_quicktest", (roomCode) => {
    console.log(`⚡ [QuickTest] Phòng ${roomCode} đã BẮT ĐẦU làm bài!`);
    io.to(`quicktest_${roomCode}`).emit("test_started");
  });

  socket.on(
    "submit_answer",
    ({ roomCode, participantId, studentName, score, isCorrect }) => {
      io.to(`quicktest_${roomCode}`).emit("live_update", {
        participantId,
        studentName,
        score,
        isCorrect,
      });
    },
  );

  socket.on("end_quicktest", (roomCode) => {
    console.log(`⚡ [QuickTest] Phòng ${roomCode} đã KẾT THÚC!`);
    io.to(`quicktest_${roomCode}`).emit("test_ended");
  });

  socket.on("disconnect", () => {
    console.log(`❌ Người dùng ${userId || socket.id} đã ngắt kết nối`);
  });
});

// ==========================================
// CẤU HÌNH EXPRESS MIDDLEWARES & STATICS
// ==========================================
app.use(cors());
app.use(express.json());

// Phục vụ thư mục tệp tĩnh tải lên
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.get("/uploads/messages/:filename", (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, "../uploads/messages", filename);
  res.sendFile(filePath, (err) => {
    if (err) {
      res.status(404).send("File not found");
    }
  });
});

app.get("/api/debug/uploads", (req, res) => {
  const fs = require("fs");
  const dir = path.join(__dirname, "../uploads/messages");
  fs.readdir(dir, (err, files) => {
    if (err)
      return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, files });
  });
});

app.get("/", (req, res) => {
  res.json({ message: "Hệ thống FORGETMENOT đã khởi chạy!" });
});

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

// ==========================================
// ĐỊNH TUYẾN API (API ROUTES)
// ==========================================
app.use("/api/auth", authRoutes);
app.use("/api/decks", deckRoutes);
app.use("/api/flashcards", flashcardRoutes);
app.use("/api/study", studyRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/statistics", statisticsRoutes);
app.use("/api/ai", aiRoutes); // Route cho AI Exam & Flashcard AI
app.use("/api/community", communityRoutes);
app.use("/api/quicktest", quickTestRoutes);

// ==========================================
// KHỞI ĐỘNG SERVER (TỰ ĐỘNG XỬ LÝ TRÙNG CỔNG)
// ==========================================
const startServerWithPort = (port) => {
  const onError = (error) => {
    if (error.code === "EADDRINUSE") {
      console.warn(
        `⚠️ Cổng ${port} đang bị chiếm, đang thử cổng ${port + 1}...`,
      );
      server.removeListener("error", onError);
      startServerWithPort(port + 1);
    } else {
      console.error("❌ Server startup error:", error);
      process.exit(1);
    }
  };

  server.on("error", onError);

  server.listen(port, "0.0.0.0", () => {
    console.log(
      `✅ Server Backend & Socket.io đang chạy tại http://localhost:${port} (Mạng: 0.0.0.0)`,
    );
  });
};

startServerWithPort(PORT);
