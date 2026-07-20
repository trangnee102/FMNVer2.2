const { PrismaClient } = require("@prisma/client");
const path = require("path"); // 👉 ĐÃ THÊM: Để lấy đuôi file (.jpg, .pdf...)
const prisma = new PrismaClient();

// 1. Lấy danh sách thẻ nổi bật (Tab Khám phá)
const getDiscoveryDecks = async (req, res) => {
  try {
    const decks = await prisma.decks.findMany({
      where: { is_public: true },
      include: {
        Users: { select: { full_name: true, avatar_text: true } },
        _count: { select: { Flashcards: true } },
      },
      take: 10,
      orderBy: { id: "desc" },
    });

    const formattedDecks = decks.map((deck) => {
      let authorName = "Người dùng khuyết danh";
      const userData = deck.Users || deck.users || deck.User || deck.user;

      if (deck.is_anonymous === true) {
        authorName = "Người dùng ẩn danh";
      } else if (userData && userData.full_name) {
        authorName = userData.full_name;
      }

      return {
        id: deck.id,
        title: deck.title,
        author: authorName,
        cards: deck._count ? deck._count.Flashcards : 0,
        views: deck.clone_count || 0,
      };
    });

    res.status(200).json(formattedDecks);
  } catch (error) {
    console.error("Lỗi lấy danh sách khám phá:", error);
    res.status(500).json({ message: "Lỗi server khi tải dữ liệu khám phá" });
  }
};

// 2. Lấy Bảng xếp hạng
const getLeaderboard = async (req, res) => {
  try {
    const topUsers = await prisma.users.findMany({
      where: { role: "student" },
      select: {
        id: true,
        full_name: true,
        avatar_text: true,
        avatar_color: true,
        total_points: true,
        streak_days: true,
      },
      orderBy: { total_points: "desc" },
      take: 10,
    });

    res.status(200).json(topUsers);
  } catch (error) {
    console.error("Lỗi lấy bảng xếp hạng:", error);
    res.status(500).json({ message: "Lỗi server khi tải bảng xếp hạng" });
  }
};

// ==========================================
// CÁC HÀM XỬ LÝ CHAT & KẾT BẠN
// ==========================================

// 3. Lấy danh sách liên hệ
const getContacts = async (req, res) => {
  try {
    const currentUserId = parseInt(req.user?.id) || 1;

    const friendships = await prisma.friendships.findMany({
      where: {
        status: "accepted",
        OR: [{ requester_id: currentUserId }, { addressee_id: currentUserId }],
      },
      include: {
        Requester: {
          select: {
            id: true,
            full_name: true,
            email: true,
            avatar_text: true,
            avatar_color: true,
            is_online: true,
          },
        },
        Addressee: {
          select: {
            id: true,
            full_name: true,
            email: true,
            avatar_text: true,
            avatar_color: true,
            is_online: true,
          },
        },
      },
    });

    const contacts = friendships.map((f) =>
      f.requester_id === currentUserId ? f.Addressee : f.Requester,
    );

    res.status(200).json(contacts);
  } catch (error) {
    console.error("Lỗi lấy danh sách bạn bè:", error);
    res.status(500).json({ message: "Lỗi tải danh sách bạn bè" });
  }
};

// 4. Lấy lịch sử chat
const getMessages = async (req, res) => {
  try {
    const currentUserId = parseInt(req.user?.id) || 1;
    const friendId = parseInt(req.params.friendId);

    const messages = await prisma.messages.findMany({
      where: {
        OR: [
          { sender_id: currentUserId, receiver_id: friendId },
          { sender_id: friendId, receiver_id: currentUserId },
        ],
      },
      orderBy: { created_at: "asc" },
    });

    const formattedMessages = messages.map((msg) => ({
      ...msg,
      isMine: msg.sender_id === currentUserId,
    }));

    res.status(200).json(formattedMessages);
  } catch (error) {
    console.error("Lỗi lấy tin nhắn:", error);
    res.status(500).json({ message: "Lỗi tải tin nhắn" });
  }
};

// 👉 ĐÃ SỬA: 5. Gửi tin nhắn mới (Hỗ trợ Ảnh & File)
const sendMessage = async (req, res) => {
  try {
    const currentUserId = parseInt(req.user?.id) || 1;
    const { receiver_id, content } = req.body;

    // Chuẩn bị khung dữ liệu mặc định
    let messageData = {
      sender_id: currentUserId,
      receiver_id: parseInt(receiver_id),
      content: content || null, // Có thể null nếu người ta chỉ gửi file không ghi chữ
      message_type: "text",
    };

    // Nếu "người vận chuyển" Multer bắt được file từ Frontend
    if (req.file) {
      const fileExt = path.extname(req.file.originalname).toLowerCase();
      const imageExts = [".jpg", ".jpeg", ".png", ".gif"];

      // Phân loại xem nó là Ảnh hay File
      messageData.message_type = imageExts.includes(fileExt) ? "image" : "file";

      // Tạo đường link để trả về giao diện
      messageData.file_url = `/uploads/messages/${req.file.filename}`;
      messageData.file_name = req.file.originalname; // Giữ lại tên gốc (VD: baitap.pdf)
    }

    // Chặn người dùng spam gửi tin nhắn trống trơn
    if (!messageData.content && !req.file) {
      return res
        .status(400)
        .json({ success: false, message: "Nội dung tin nhắn trống!" });
    }

    const newMessage = await prisma.messages.create({
      data: messageData,
    });

    res.status(201).json({ ...newMessage, isMine: true });
  } catch (error) {
    console.error("Lỗi gửi tin nhắn:", error);
    res.status(500).json({ message: "Lỗi gửi tin nhắn" });
  }
};

// 6. Tìm kiếm người dùng
const searchUserByEmail = async (req, res) => {
  try {
    const { email } = req.query;
    const currentUserId = parseInt(req.user?.id) || 1;

    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Vui lòng nhập Email!" });
    }

    const user = await prisma.users.findUnique({
      where: { email: email.trim() },
    });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy người dùng!" });
    }
    if (user.id === currentUserId) {
      return res
        .status(400)
        .json({ success: false, message: "Không thể tự kết bạn!" });
    }

    const friendship = await prisma.friendships.findFirst({
      where: {
        OR: [
          { requester_id: currentUserId, addressee_id: user.id },
          { requester_id: user.id, addressee_id: currentUserId },
        ],
      },
    });

    res.status(200).json({
      success: true,
      data: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        avatar_text: user.avatar_text,
        avatar_color: user.avatar_color,
        is_online: user.is_online,
        friendship_status: friendship ? friendship.status : "none",
      },
    });
  } catch (error) {
    console.error("Lỗi khi tìm kiếm người dùng:", error);
    res
      .status(500)
      .json({ success: false, message: "Lỗi hệ thống khi tìm kiếm" });
  }
};

// ==========================================
// HÀM XỬ LÝ LỜI MỜI KẾT BẠN
// ==========================================

// 7. Gửi lời mời kết bạn
const sendFriendRequest = async (req, res) => {
  try {
    const currentUserId = parseInt(req.user?.id) || 1;
    const { targetUserId } = req.body;

    if (!targetUserId)
      return res
        .status(400)
        .json({ success: false, message: "Thiếu ID người nhận!" });

    const existing = await prisma.friendships.findFirst({
      where: {
        OR: [
          { requester_id: currentUserId, addressee_id: parseInt(targetUserId) },
          { requester_id: parseInt(targetUserId), addressee_id: currentUserId },
        ],
      },
    });

    if (existing) {
      if (existing.status === "accepted")
        return res
          .status(400)
          .json({ success: false, message: "Đã là bạn bè!" });
      if (existing.status === "pending")
        return res
          .status(400)
          .json({ success: false, message: "Đã có lời mời đang chờ xử lý!" });
    }

    await prisma.friendships.create({
      data: {
        requester_id: currentUserId,
        addressee_id: parseInt(targetUserId),
        status: "pending",
      },
    });

    res
      .status(201)
      .json({ success: true, message: "Đã gửi lời mời kết bạn thành công!" });
  } catch (error) {
    console.error("Lỗi gửi lời mời:", error);
    res.status(500).json({ success: false, message: "Lỗi khi gửi lời mời" });
  }
};

// 8. Lấy danh sách lời mời
const getPendingRequests = async (req, res) => {
  try {
    const currentUserId = parseInt(req.user?.id) || 1;
    const requests = await prisma.friendships.findMany({
      where: { addressee_id: currentUserId, status: "pending" },
      include: {
        Requester: {
          select: {
            id: true,
            full_name: true,
            email: true,
            avatar_text: true,
            avatar_color: true,
          },
        },
      },
    });
    res.status(200).json({ success: true, data: requests });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Lỗi tải danh sách lời mời" });
  }
};

// 9. Phản hồi lời mời
const respondFriendRequest = async (req, res) => {
  try {
    const currentUserId = parseInt(req.user?.id) || 1;
    const { requestId, action } = req.body;

    const request = await prisma.friendships.findUnique({
      where: { id: parseInt(requestId) },
    });
    if (!request || request.addressee_id !== currentUserId) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy lời mời này!" });
    }

    if (action === "declined") {
      await prisma.friendships.delete({ where: { id: parseInt(requestId) } });
      return res
        .status(200)
        .json({ success: true, message: "Đã từ chối lời mời!" });
    }

    await prisma.friendships.update({
      where: { id: parseInt(requestId) },
      data: { status: "accepted" },
    });

    res.status(200).json({ success: true, message: "Đã trở thành bạn bè!" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi hệ thống" });
  }
};

// ==========================================
// 2 HÀM XỬ LÝ XEM VÀ TẢI BỘ THẺ CỘNG ĐỒNG
// ==========================================

const getDeckDetails = async (req, res) => {
  try {
    const deckId = parseInt(req.params.id);
    const deck = await prisma.decks.findUnique({
      where: { id: deckId },
      include: {
        Flashcards: true,
        Users: { select: { full_name: true, avatar_text: true } },
      },
    });
    if (!deck || !deck.is_public)
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy thẻ!" });
    res.status(200).json({ success: true, data: deck });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

const cloneDeck = async (req, res) => {
  try {
    const currentUserId = parseInt(req.user?.id);
    const deckId = parseInt(req.params.id);
    if (!currentUserId)
      return res
        .status(401)
        .json({ success: false, message: "Chưa đăng nhập!" });

    const originalDeck = await prisma.decks.findUnique({
      where: { id: deckId },
      include: { Flashcards: true },
    });

    if (!originalDeck || !originalDeck.is_public)
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy thẻ!" });

    const newDeck = await prisma.decks.create({
      data: {
        title: originalDeck.title + " (Tải về)",
        description: originalDeck.description || "Tải về từ Cộng đồng",
        is_public: false,
        user_id: currentUserId,
        category_id: originalDeck.category_id,
      },
    });

    if (originalDeck.Flashcards && originalDeck.Flashcards.length > 0) {
      const newCards = originalDeck.Flashcards.map((card) => ({
        deck_id: newDeck.id,
        question: card.question,
        answer: card.answer,
      }));
      await prisma.flashcards.createMany({ data: newCards });
    }

    await prisma.decks.update({
      where: { id: deckId },
      data: { clone_count: (originalDeck.clone_count || 0) + 1 },
    });

    res
      .status(200)
      .json({ success: true, message: "Đã tải bộ thẻ về Thư viện!" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// ==========================================
// HÀM XỬ LÝ NHÓM HỌC (GROUPS)
// ==========================================

const createGroup = async (req, res) => {
  try {
    const currentUserId = parseInt(req.user?.id) || 1;
    const { name, description } = req.body;
    if (!name)
      return res
        .status(400)
        .json({ success: false, message: "Tên nhóm không được trống!" });

    const inviteCode =
      "GRP-" + Math.random().toString(36).substring(2, 8).toUpperCase();
    const newGroup = await prisma.groups.create({
      data: {
        name,
        description,
        invite_code: inviteCode,
        created_by: currentUserId,
      },
    });

    await prisma.groupMembers.create({
      data: { group_id: newGroup.id, user_id: currentUserId, role: "admin" },
    });
    res
      .status(201)
      .json({ success: true, message: "Tạo nhóm thành công!", data: newGroup });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

const joinGroup = async (req, res) => {
  try {
    const currentUserId = parseInt(req.user?.id) || 1;
    const { inviteCode } = req.body;
    if (!inviteCode)
      return res
        .status(400)
        .json({ success: false, message: "Nhập mã Invite!" });

    const group = await prisma.groups.findUnique({
      where: { invite_code: inviteCode.trim().toUpperCase() },
    });
    if (!group)
      return res
        .status(404)
        .json({ success: false, message: "Mã không hợp lệ!" });

    const existingMember = await prisma.groupMembers.findFirst({
      where: { group_id: group.id, user_id: currentUserId },
    });
    if (existingMember)
      return res
        .status(400)
        .json({ success: false, message: "Đã tham gia nhóm này rồi!" });

    await prisma.groupMembers.create({
      data: { group_id: group.id, user_id: currentUserId, role: "member" },
    });
    res
      .status(200)
      .json({ success: true, message: "Tham gia thành công!", data: group });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

const getMyGroups = async (req, res) => {
  try {
    const currentUserId = parseInt(req.user?.id) || 1;
    const memberships = await prisma.groupMembers.findMany({
      where: { user_id: currentUserId },
      include: { Group: true },
      orderBy: { joined_at: "desc" },
    });
    const groups = memberships.map((m) => ({ ...m.Group, my_role: m.role }));
    res.status(200).json({ success: true, data: groups });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

module.exports = {
  getDiscoveryDecks,
  getLeaderboard,
  getContacts,
  getMessages,
  sendMessage,
  searchUserByEmail,
  sendFriendRequest,
  getPendingRequests,
  respondFriendRequest,
  getDeckDetails,
  cloneDeck,
  createGroup,
  joinGroup,
  getMyGroups,
};
