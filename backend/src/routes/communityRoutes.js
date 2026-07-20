const express = require("express");
const router = express.Router();
const communityController = require("../controllers/communityController");

// 👉 "Bóc hộp" để lấy đúng function. (Tên phổ biến nhất thường là verifyToken)
const { verifyToken } = require("../middlewares/authMiddleware");

// 👉 ĐÃ THÊM: Import lính gác Multer để xử lý file đính kèm
const upload = require("../middlewares/uploadMiddleware");

// Mở đường link API: GET /api/community/discovery
router.get("/discovery", communityController.getDiscoveryDecks);

// Mở đường link API: GET /api/community/leaderboard
router.get("/leaderboard", communityController.getLeaderboard);

// ==========================================
// CÁC API CHO TAB CHAT & TÌM KIẾM
// ==========================================
router.get("/contacts", verifyToken, communityController.getContacts);
router.get("/messages/:friendId", verifyToken, communityController.getMessages);

// 👉 ĐÃ SỬA: Gắn lính gác Multer vào giữa: upload.single("file")
// Nghĩa là: Khi Frontend gọi link này, Multer sẽ xé file ra lưu trước, rồi mới đưa data vào sendMessage
router.post(
  "/messages",
  verifyToken,
  upload.single("file"), // 👉 Chữ "file" này phải khớp với tên field bên Frontend gửi lên
  communityController.sendMessage,
);

// Mở cổng cho API tìm kiếm bạn bè bằng Email
router.get("/search", verifyToken, communityController.searchUserByEmail);

// ==========================================
// CÁC API CHO LỜI MỜI KẾT BẠN
// ==========================================
router.post(
  "/friend-request",
  verifyToken,
  communityController.sendFriendRequest,
);
router.get(
  "/friend-requests/pending",
  verifyToken,
  communityController.getPendingRequests,
);
router.post(
  "/friend-request/respond",
  verifyToken,
  communityController.respondFriendRequest,
);

// ==========================================
// CÁC API XEM VÀ TẢI BỘ THẺ CỘNG ĐỒNG
// ==========================================
// 🔓 Ai cũng xem được nội dung thẻ (Không cần lính gác)
router.get("/decks/:id", communityController.getDeckDetails);

// 🔒 NHƯNG Tải về (Clone) thì BẮT BUỘC phải đi qua lính gác
router.post("/decks/:id/clone", verifyToken, communityController.cloneDeck);

// ==========================================
// CÁC API CHO NHÓM HỌC
// ==========================================
router.post("/groups", verifyToken, communityController.createGroup);
router.post("/groups/join", verifyToken, communityController.joinGroup);
router.get("/groups", verifyToken, communityController.getMyGroups);

module.exports = router;
