const express = require("express");
const router = express.Router();

// 👉 ĐÃ SỬA: Import 3 file controller mới từ thư mục con "community"
const discoveryController = require("../controllers/community/discoveryController");
const friendController = require("../controllers/community/friendController");
const chatController = require("../controllers/community/chatController");

// Lính gác bảo vệ và xử lý file
const { verifyToken } = require("../middlewares/authMiddleware");
const upload = require("../middlewares/uploadMiddleware");

// ==========================================
// 1. KHÁM PHÁ & BẢNG XẾP HẠNG
// ==========================================
router.get("/discovery", discoveryController.getDiscoveryDecks);
router.get("/leaderboard", discoveryController.getLeaderboard);
router.get("/decks/:id", discoveryController.getDeckDetails);
router.post("/decks/:id/clone", verifyToken, discoveryController.cloneDeck);

// ==========================================
// 2. TÌM KIẾM & KẾT BẠN
// ==========================================
router.get("/search", verifyToken, friendController.searchUserByEmail);
router.post("/friend-request", verifyToken, friendController.sendFriendRequest);
router.get("/contacts", verifyToken, friendController.getContacts);
router.get(
  "/friend-requests/pending",
  verifyToken,
  friendController.getPendingRequests,
);
router.post(
  "/friend-request/respond",
  verifyToken,
  friendController.respondFriendRequest,
);

// ==========================================
// 3. HỆ SINH THÁI CHAT ZALO (ĐÃ ĐƯỢC CHUẨN HOÁ ĐƯỜNG DẪN)
// ==========================================
// Lấy danh sách nhóm học
router.get("/groups", verifyToken, chatController.getMyConversations);

// Tạo nhóm mới / Nhập mã vào nhóm
router.post("/groups", verifyToken, chatController.createGroup);
router.post("/groups/join", verifyToken, chatController.joinGroup);
router.post("/groups/:groupId/leave", verifyToken, chatController.leaveGroup);

// Lấy lịch sử tin nhắn (Tách biệt hộp thoại 1-1 và Nhóm)
router.get(
  "/messages/:id",
  verifyToken,
  chatController.getConversationMessages,
);
router.get(
  "/groups/:id/messages",
  verifyToken,
  chatController.getConversationMessages,
);

// Gửi tin nhắn và đính kèm file (Tách biệt hộp thoại 1-1 và Nhóm)
router.post(
  "/messages",
  verifyToken,
  upload.single("file"), // Phải khớp với tên field formData bên React
  chatController.sendMessage,
);
router.post(
  "/groups/:id/messages",
  verifyToken,
  upload.single("file"),
  chatController.sendMessage,
);

module.exports = router;
