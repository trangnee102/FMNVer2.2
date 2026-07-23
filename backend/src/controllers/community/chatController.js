const { PrismaClient } = require("@prisma/client");
const path = require("path");
const prisma = new PrismaClient();

// 👉 Máy quét ID thông minh (Chấp mọi loại tên biến từ Middleware)
const getUserId = (req) => {
  const id = req.user?.id || req.userId || req.user_id || req.user;
  return parseInt(id);
};

const getMyConversations = async (req, res) => {
  try {
    const currentUserId = getUserId(req);
    if (!currentUserId)
      return res.status(401).json({ success: false, message: "Lỗi xác thực!" });

    const participations = await prisma.participants.findMany({
      where: {
        user_id: currentUserId,
        // 👉 ĐÃ SỬA: Bộ lọc thép! CHỈ lấy những phòng là Group (loại bỏ hoàn toàn DM_)
        Conversation: {
          is_group: true,
        },
      },
      include: {
        Conversation: {
          include: {
            Participants: {
              include: {
                User: {
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
            },
            // 👉 ĐÃ SỬA: Đếm tổng số lượng thành viên trong nhóm
            _count: {
              select: { Participants: true },
            },
          },
        },
      },
      orderBy: { joined_at: "desc" },
    });

    const conversations = participations.map((p) => {
      const convo = p.Conversation;

      // 👉 ĐÃ SỬA: Định hình chuẩn dữ liệu cho Nhóm học trả về Frontend
      convo.display_name = convo.name;
      convo.display_avatar = "👥";
      convo.display_color = "#4f46e5";
      convo.member_count = convo._count?.Participants || 0; // Lấy số lượng thành viên
      convo.my_role = p.role; // Lấy vai trò của mình (admin/member)

      return convo;
    });
    res.status(200).json({ success: true, data: conversations });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

const createGroup = async (req, res) => {
  try {
    const currentUserId = getUserId(req);
    const { name } = req.body;
    if (!name)
      return res
        .status(400)
        .json({ success: false, message: "Tên nhóm không được trống!" });

    const inviteCode =
      "GRP-" + Math.random().toString(36).substring(2, 8).toUpperCase();
    const newGroup = await prisma.conversations.create({
      data: {
        name,
        is_group: true,
        invite_code: inviteCode,
        Participants: { create: { user_id: currentUserId, role: "admin" } },
      },
      include: { Participants: true },
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
    const currentUserId = getUserId(req);
    const { inviteCode } = req.body;
    if (!inviteCode)
      return res
        .status(400)
        .json({ success: false, message: "Nhập mã Invite!" });

    const conversation = await prisma.conversations.findUnique({
      where: { invite_code: inviteCode.trim().toUpperCase() },
    });
    if (!conversation)
      return res
        .status(404)
        .json({ success: false, message: "Mã nhóm không hợp lệ!" });

    const existingMember = await prisma.participants.findFirst({
      where: { conversation_id: conversation.id, user_id: currentUserId },
    });
    if (existingMember)
      return res
        .status(400)
        .json({ success: false, message: "Đã tham gia nhóm này rồi!" });

    await prisma.participants.create({
      data: {
        conversation_id: conversation.id,
        user_id: currentUserId,
        role: "member",
      },
    });
    res.status(200).json({
      success: true,
      message: "Tham gia thành công!",
      data: conversation,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

const getConversationMessages = async (req, res) => {
  try {
    const currentUserId = getUserId(req);
    let targetConversationId;

    if (req.originalUrl.includes("/groups/")) {
      targetConversationId = parseInt(req.params.id);
    } else {
      const friendId = parseInt(req.params.id);
      const convo = await prisma.conversations.findFirst({
        where: {
          is_group: false,
          AND: [
            { Participants: { some: { user_id: currentUserId } } },
            { Participants: { some: { user_id: friendId } } },
          ],
        },
      });

      if (!convo) {
        return res.status(200).json({ success: true, data: [] });
      }
      targetConversationId = convo.id;
    }

    const isParticipant = await prisma.participants.findFirst({
      where: { conversation_id: targetConversationId, user_id: currentUserId },
    });
    if (!isParticipant)
      return res
        .status(403)
        .json({ success: false, message: "Không có quyền xem" });

    const messages = await prisma.messages.findMany({
      where: { conversation_id: targetConversationId },
      orderBy: { created_at: "asc" },
      include: {
        Sender: {
          select: {
            id: true,
            full_name: true,
            avatar_text: true,
            avatar_color: true,
          },
        },
      },
    });

    const formatted = messages.map((msg) => ({
      ...msg,
      isMine: msg.sender_id === currentUserId,
    }));
    res.status(200).json({ success: true, data: formatted });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi tải tin nhắn" });
  }
};

const sendMessage = async (req, res) => {
  try {
    const currentUserId = getUserId(req);
    const { content } = req.body;
    let targetConversationId;

    if (req.originalUrl.includes("/groups/")) {
      targetConversationId = parseInt(req.params.id);
    } else {
      const receiver_id = parseInt(req.body.receiver_id);
      if (!receiver_id)
        return res
          .status(400)
          .json({ success: false, message: "Thiếu ID người nhận" });

      let convo = await prisma.conversations.findFirst({
        where: {
          is_group: false,
          AND: [
            { Participants: { some: { user_id: currentUserId } } },
            { Participants: { some: { user_id: receiver_id } } },
          ],
        },
      });

      if (!convo) {
        const uniqueSuffix =
          Date.now().toString(36) + Math.random().toString(36).substring(2, 6);

        convo = await prisma.conversations.create({
          data: {
            is_group: false,
            name: `DM_${currentUserId}_${receiver_id}_${uniqueSuffix}`,
            invite_code: `INV_${uniqueSuffix}`,
            Participants: {
              create: [
                { user_id: currentUserId, role: "member" },
                { user_id: receiver_id, role: "member" },
              ],
            },
          },
        });
      }
      targetConversationId = convo.id;
    }

    const isParticipant = await prisma.participants.findFirst({
      where: {
        conversation_id: targetConversationId,
        user_id: currentUserId,
      },
    });
    if (!isParticipant)
      return res
        .status(403)
        .json({ success: false, message: "Bạn không thuộc đoạn chat này" });

    let messageData = {
      conversation_id: targetConversationId,
      sender_id: currentUserId,
      content: content || null,
      message_type: "text",
    };

    if (req.file) {
      const fileExt = path.extname(req.file.originalname).toLowerCase();
      const imageExts = [".jpg", ".jpeg", ".png", ".gif"];
      messageData.message_type = imageExts.includes(fileExt) ? "image" : "file";
      messageData.file_url = `/uploads/messages/${req.file.filename}`;
      messageData.file_name = req.file.originalname;
    }

    if (!messageData.content && !req.file)
      return res
        .status(400)
        .json({ success: false, message: "Tin nhắn trống!" });

    const newMessage = await prisma.messages.create({
      data: messageData,
      include: {
        Sender: {
          select: {
            id: true,
            full_name: true,
            avatar_text: true,
            avatar_color: true,
          },
        },
      },
    });

    const io = req.app.get("io");
    if (io) {
      io.to(targetConversationId.toString()).emit(
        "receiveNewMessage",
        newMessage,
      );
    }

    res
      .status(201)
      .json({ success: true, data: { ...newMessage, isMine: true } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Lỗi gửi tin nhắn" });
  }
};

const leaveGroup = async (req, res) => {
  try {
    const currentUserId = getUserId(req);
    const groupId = parseInt(req.params.groupId);

    const conversation = await prisma.conversations.findUnique({
      where: { id: groupId },
    });
    if (!conversation || !conversation.is_group)
      return res.status(404).json({ success: false, message: "Lỗi!" });

    const membership = await prisma.participants.findFirst({
      where: { conversation_id: groupId, user_id: currentUserId },
    });
    if (!membership)
      return res
        .status(404)
        .json({ success: false, message: "Không thuộc nhóm" });

    await prisma.participants.delete({ where: { id: membership.id } });
    res.status(200).json({ success: true, message: "Đã rời nhóm!" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi khi rời nhóm" });
  }
};

module.exports = {
  getMyConversations,
  createGroup,
  joinGroup,
  getConversationMessages,
  sendMessage,
  leaveGroup,
};
