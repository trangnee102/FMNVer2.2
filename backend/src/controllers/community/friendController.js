const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const searchUserByEmail = async (req, res) => {
  try {
    const { email } = req.query;
    const currentUserId = parseInt(req.user?.id) || 1;
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
    const currentUserId = parseInt(req.user?.id) || 1;
    const targetUserId = parseInt(req.body.targetUserId);

    if (!targetUserId || isNaN(targetUserId))
      return res.status(400).json({ success: false, message: "Thiếu ID!" });
    if (targetUserId === currentUserId)
      return res.status(400).json({ success: false, message: "Lỗi!" });

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
          .json({ success: false, message: "Đã là bạn bè!" });
      if (existing.status === "pending")
        return res
          .status(400)
          .json({ success: false, message: "Đã gửi lời mời!" });
    }

    await prisma.friendships.create({
      data: {
        requester_id: currentUserId,
        addressee_id: targetUserId,
        status: "pending",
      },
    });
    res.status(201).json({ success: true, message: "Đã gửi lời mời!" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi khi gửi lời mời" });
  }
};

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
    const uniqueContacts = Array.from(
      new Map(contacts.map((item) => [item.id, item])).values(),
    );
    res.status(200).json({ success: true, data: uniqueContacts });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi tải danh sách" });
  }
};

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
    res.status(500).json({ success: false, message: "Lỗi tải lời mời" });
  }
};

const respondFriendRequest = async (req, res) => {
  try {
    const currentUserId = parseInt(req.user?.id) || 1;
    const { requestId, action } = req.body;

    const request = await prisma.friendships.findUnique({
      where: { id: parseInt(requestId) },
    });
    if (!request || request.addressee_id !== currentUserId)
      return res.status(404).json({ success: false, message: "Lỗi!" });

    if (action === "declined") {
      await prisma.friendships.delete({ where: { id: parseInt(requestId) } });
      return res.status(200).json({ success: true, message: "Đã từ chối!" });
    }

    await prisma.friendships.update({
      where: { id: parseInt(requestId) },
      data: { status: "accepted" },
    });

    // Tạo phòng chat 1-1
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
      await prisma.conversations.create({
        data: {
          is_group: false,
          Participants: {
            create: [
              { user_id: currentUserId },
              { user_id: request.requester_id },
            ],
          },
        },
      });
    }
    res.status(200).json({ success: true, message: "Đã kết bạn!" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi hệ thống" });
  }
};

module.exports = {
  searchUserByEmail,
  sendFriendRequest,
  getContacts,
  getPendingRequests,
  respondFriendRequest,
};
