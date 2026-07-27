const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// 👉 Máy quét ID thông minh: Đảm bảo 100% luôn trả về số nguyên hợp lệ
const getUserId = (req) => {
  const id = req.user?.id || req.userId || req.user_id || req.user;
  return parseInt(id, 10);
};

const searchUserByEmail = async (req, res) => {
  try {
    const { email } = req.query;
    const currentUserId = getUserId(req);
    if (!email)
      return res
        .status(400)
        .json({ success: false, message: "Vui lòng nhập Email!" });

    const user = await prisma.users.findUnique({
      where: { email: email.trim() },
    });

    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy người dùng!" });

    if (user.id === currentUserId)
      return res
        .status(400)
        .json({ success: false, message: "Không thể tự kết bạn!" });

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
        requester_id: friendship ? friendship.requester_id : null,
        friendship_id: friendship ? friendship.id : null,
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Lỗi hệ thống khi tìm kiếm" });
  }
};

const sendFriendRequest = async (req, res) => {
  try {
    const currentUserId = getUserId(req);
    // 🛠️ CHỐT CHẶN BẢO VỆ: Ép kiểu targetUserId chặt chẽ tránh bị lệch sóng
    const targetUserId = parseInt(req.body.targetUserId, 10);

    if (!targetUserId || isNaN(targetUserId))
      return res
        .status(400)
        .json({ success: false, message: "Thiếu ID người nhận!" });

    if (targetUserId === currentUserId)
      return res
        .status(400)
        .json({ success: false, message: "Không thể tự gửi cho mình!" });

    const existing = await prisma.friendships.findFirst({
      where: {
        OR: [
          { requester_id: currentUserId, addressee_id: targetUserId },
          { requester_id: targetUserId, addressee_id: currentUserId },
        ],
      },
    });

    if (existing) {
      if (existing.status === "accepted")
        return res
          .status(400)
          .json({ success: false, message: "Hai bạn đã là bạn bè!" });
      if (existing.status === "pending")
        return res
          .status(400)
          .json({ success: false, message: "Lời mời kết bạn đã tồn tại!" });
    }

    await prisma.friendships.create({
      data: {
        requester_id: currentUserId,
        addressee_id: targetUserId,
        status: "pending",
      },
    });

    // 📢 KÍCH HOẠT LOA PHƯỜNG SOCKET.IO
    const io = req.app.get("io");
    if (io) {
      // Gửi tín hiệu báo cho tất cả client để reload danh sách chờ (Frontend sẽ tự check ID)
      io.emit("friend_request_updated", {
        user1: currentUserId,
        user2: targetUserId,
      });
    }

    res.status(201).json({ success: true, message: "Đã gửi lời mời kết bạn!" });
  } catch (error) {
    console.error("Lỗi gửi kết bạn:", error);
    res
      .status(500)
      .json({ success: false, message: "Lỗi khi gửi lời mời kết bạn" });
  }
};

const getContacts = async (req, res) => {
  try {
    const currentUserId = getUserId(req);
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
    const uniqueContacts = Array.from(
      new Map(contacts.map((item) => [item.id, item])).values(),
    );
    res.status(200).json({ success: true, data: uniqueContacts });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Lỗi tải danh sách bạn bè" });
  }
};

const getPendingRequests = async (req, res) => {
  try {
    const currentUserId = getUserId(req);
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

const respondFriendRequest = async (req, res) => {
  try {
    const currentUserId = getUserId(req);
    // 🛠️ CHỐT CHẶN BẢO VỆ: Ép kiểu requestId
    const requestId = parseInt(req.body.requestId, 10);
    const { action } = req.body;

    if (isNaN(requestId)) {
      return res
        .status(400)
        .json({ success: false, message: "ID lời mời không hợp lệ!" });
    }

    const request = await prisma.friendships.findUnique({
      where: { id: requestId },
    });

    if (!request || request.addressee_id !== currentUserId)
      return res
        .status(404)
        .json({
          success: false,
          message: "Không tìm thấy lời mời hoặc không có quyền!",
        });

    if (action === "declined") {
      await prisma.friendships.delete({ where: { id: requestId } });

      const io = req.app.get("io");
      if (io) {
        io.emit("friend_request_updated", {
          user1: currentUserId,
          user2: request.requester_id,
        });
      }

      return res
        .status(200)
        .json({ success: true, message: "Đã từ chối lời mời!" });
    }

    await prisma.friendships.update({
      where: { id: requestId },
      data: { status: "accepted" },
    });

    const chatExists = await prisma.conversations.findFirst({
      where: {
        is_group: false,
        AND: [
          { Participants: { some: { user_id: currentUserId } } },
          { Participants: { some: { user_id: request.requester_id } } },
        ],
      },
    });

    if (!chatExists) {
      const uniqueSuffix =
        Date.now().toString(36) + Math.random().toString(36).substring(2, 6);

      await prisma.conversations.create({
        data: {
          is_group: false,
          name: `DM_${currentUserId}_${request.requester_id}_${uniqueSuffix}`,
          invite_code: `INV_${uniqueSuffix}`,
          Participants: {
            create: [
              { user_id: currentUserId, role: "member" },
              { user_id: request.requester_id, role: "member" },
            ],
          },
        },
      });
    }

    const io = req.app.get("io");
    if (io) {
      io.emit("friend_request_updated", {
        user1: currentUserId,
        user2: request.requester_id,
      });
    }

    res.status(200).json({ success: true, message: "Đã kết bạn thành công!" });
  } catch (error) {
    console.error("Lỗi phản hồi kết bạn:", error);
    res
      .status(500)
      .json({ success: false, message: "Lỗi hệ thống khi phản hồi lời mời" });
  }
};

module.exports = {
  searchUserByEmail,
  sendFriendRequest,
  getContacts,
  getPendingRequests,
  respondFriendRequest,
};
