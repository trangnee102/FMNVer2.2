const { PrismaClient } = require("@prisma/client");
const path = require("path");
const prisma = new PrismaClient();

const getMyConversations = async (req, res) => {
  try {
    const currentUserId = parseInt(req.user?.id) || 1;
    const participations = await prisma.participants.findMany({
      where: { user_id: currentUserId },
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
          },
        },
      },
      orderBy: { joined_at: "desc" },
    });

    const conversations = participations.map((p) => {
      const convo = p.Conversation;
      if (!convo.is_group) {
        const friend = convo.Participants.find(
          (part) => part.user_id !== currentUserId,
        )?.User;
        convo.display_name =
          friend?.full_name || friend?.email || "Người dùng ẩn";
        convo.display_avatar = friend?.avatar_text || "U";
        convo.display_color = friend?.avatar_color || "#ccc";
      } else {
        convo.display_name = convo.name;
        convo.display_avatar = "👥";
        convo.display_color = "#4f46e5";
      }
      return convo;
    });
    res.status(200).json({ success: true, data: conversations });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

const createGroup = async (req, res) => {
  try {
    const currentUserId = parseInt(req.user?.id) || 1;
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
    const currentUserId = parseInt(req.user?.id) || 1;
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
    res
      .status(200)
      .json({
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
    const currentUserId = parseInt(req.user?.id) || 1;
    const conversationId = parseInt(req.params.id);

    const isParticipant = await prisma.participants.findFirst({
      where: { conversation_id: conversationId, user_id: currentUserId },
    });
    if (!isParticipant)
      return res
        .status(403)
        .json({ success: false, message: "Không có quyền xem" });

    const messages = await prisma.messages.findMany({
      where: { conversation_id: conversationId },
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
    const currentUserId = parseInt(req.user?.id) || 1;
    const { conversation_id, content } = req.body;

    const isParticipant = await prisma.participants.findFirst({
      where: {
        conversation_id: parseInt(conversation_id),
        user_id: currentUserId,
      },
    });
    if (!isParticipant)
      return res
        .status(403)
        .json({ success: false, message: "Bạn không thuộc đoạn chat này" });

    let messageData = {
      conversation_id: parseInt(conversation_id),
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

    res
      .status(201)
      .json({ success: true, data: { ...newMessage, isMine: true } });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi gửi tin nhắn" });
  }
};

const leaveGroup = async (req, res) => {
  try {
    const currentUserId = parseInt(req.user?.id) || 1;
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
