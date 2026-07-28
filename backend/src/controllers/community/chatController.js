const { PrismaClient } = require("@prisma/client");
const path = require("path");
const prisma = new PrismaClient();

// 👉 Máy quét ID thông minh
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
        Conversation: { is_group: true },
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
            _count: {
              select: { Participants: true },
            },
            Messages: {
              orderBy: { created_at: "desc" },
              take: 1,
              select: { content: true, created_at: true, message_type: true },
            },
          },
        },
      },
      orderBy: { joined_at: "desc" },
    });

    const conversations = await Promise.all(
      participations.map(async (p) => {
        const convo = p.Conversation;

        let unreadCount = 0;
        if (p.last_read_message_id !== null) {
          unreadCount = await prisma.messages.count({
            where: {
              conversation_id: convo.id,
              id: { gt: p.last_read_message_id },
            },
          });
        } else {
          unreadCount = await prisma.messages.count({
            where: { conversation_id: convo.id },
          });
        }

        if (convo.is_group) {
          convo.display_name = convo.name;
          convo.display_avatar = "👥";
          convo.display_color = "#4f46e5";
          convo.member_count = convo._count?.Participants || 0;
        } else {
          const friend = convo.Participants.find(
            (part) => part.user_id !== currentUserId,
          )?.User;
          if (friend) {
            convo.display_name = friend.full_name;
            convo.display_avatar = friend.avatar_text;
            convo.display_color = friend.avatar_color;
            convo.is_online = friend.is_online;
          }
        }

        convo.my_role = p.role;
        convo.unread_count = unreadCount;

        if (convo.Messages && convo.Messages.length > 0) {
          const lastMsg = convo.Messages[0];
          convo.last_message_preview =
            lastMsg.message_type === "image" ? "[Hình ảnh]" : lastMsg.content;
          convo.last_message_time = lastMsg.created_at;
        } else {
          convo.last_message_preview = "Chưa có tin nhắn nào.";
        }

        delete convo.Messages;

        return convo;
      }),
    );

    conversations.sort((a, b) => {
      const timeA = a.last_message_time
        ? new Date(a.last_message_time).getTime()
        : 0;
      const timeB = b.last_message_time
        ? new Date(b.last_message_time).getTime()
        : 0;
      return timeB - timeA;
    });

    res.status(200).json({ success: true, data: conversations });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

const markMessagesAsRead = async (req, res) => {
  try {
    const currentUserId = getUserId(req);
    const conversationId = parseInt(req.params.id);

    const latestMessage = await prisma.messages.findFirst({
      where: { conversation_id: conversationId },
      orderBy: { id: "desc" },
    });

    if (latestMessage) {
      await prisma.participants.updateMany({
        where: {
          conversation_id: conversationId,
          user_id: currentUserId,
        },
        data: { last_read_message_id: latestMessage.id },
      });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Lỗi khi đánh dấu đã đọc" });
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

      if (!convo) return res.status(200).json({ success: true, data: [] });
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
    let receiverId = null;

    if (req.originalUrl.includes("/groups/")) {
      targetConversationId = parseInt(req.params.id);
    } else {
      receiverId = parseInt(req.body.receiver_id);
      if (!receiverId)
        return res
          .status(400)
          .json({ success: false, message: "Thiếu ID người nhận" });

      let convo = await prisma.conversations.findFirst({
        where: {
          is_group: false,
          AND: [
            { Participants: { some: { user_id: currentUserId } } },
            { Participants: { some: { user_id: receiverId } } },
          ],
        },
      });

      if (!convo) {
        const uniqueSuffix =
          Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
        convo = await prisma.conversations.create({
          data: {
            is_group: false,
            name: `DM_${currentUserId}_${receiverId}_${uniqueSuffix}`,
            invite_code: `INV_${uniqueSuffix}`,
            Participants: {
              create: [
                { user_id: currentUserId, role: "member" },
                { user_id: receiverId, role: "member" },
              ],
            },
          },
        });
      }
      targetConversationId = convo.id;
    }

    const isParticipant = await prisma.participants.findFirst({
      where: { conversation_id: targetConversationId, user_id: currentUserId },
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

    // LƯU TIN NHẮN VÀO DATABASE
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

    // ==========================================
    // 👉 ĐÃ FIX CHÍ TỬ: Tách riêng từng lệnh io.to() để chống nuốt sự kiện
    // ==========================================
    try {
      const io = req.app.get("io");
      if (io) {
        const emitPayload = { ...newMessage, broadcast_from: currentUserId };

        // 1. Nếu chat 1-1, gọi đích danh điện thoại người nhận!
        if (receiverId) {
          io.to(receiverId.toString()).emit("receiveNewMessage", emitPayload);
        }

        // 2. Phóng loa vào phòng hội thoại chung
        if (targetConversationId) {
          io.to(targetConversationId.toString()).emit(
            "receiveNewMessage",
            emitPayload,
          );
        }

        // 3. Phóng loa về lại chính người gửi (Trường hợp họ đăng nhập 2 máy tính)
        if (currentUserId) {
          io.to(currentUserId.toString()).emit(
            "receiveNewMessage",
            emitPayload,
          );
        }

        console.log(
          `✅ [SOCKET] Đã gửi tin thành công từ ${currentUserId} tới ${receiverId || "Nhóm"}`,
        );
      }
    } catch (socketErr) {
      console.error("❌ Lỗi khi phát loa Socket:", socketErr);
    }

    // Cập nhật CSDL
    try {
      await prisma.participants.updateMany({
        where: {
          conversation_id: targetConversationId,
          user_id: currentUserId,
        },
        data: { last_read_message_id: newMessage.id },
      });
    } catch (dbErr) {
      console.error("Lỗi khi cập nhật Database:", dbErr);
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

const renameGroup = async (req, res) => {
  try {
    const currentUserId = getUserId(req);
    const groupId = parseInt(req.params.id);
    const { name } = req.body;

    if (!name || name.trim() === "") {
      return res
        .status(400)
        .json({ success: false, message: "Tên nhóm không được trống" });
    }

    const membership = await prisma.participants.findFirst({
      where: { conversation_id: groupId, user_id: currentUserId },
    });

    if (!membership)
      return res
        .status(403)
        .json({ success: false, message: "Bạn không có trong nhóm này" });
    if (membership.role !== "admin")
      return res
        .status(403)
        .json({ success: false, message: "Chỉ trưởng nhóm mới được đổi tên" });

    await prisma.conversations.update({
      where: { id: groupId },
      data: { name: name.trim() },
    });

    res.status(200).json({ success: true, message: "Đổi tên thành công" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi Server" });
  }
};

const getGroupMembers = async (req, res) => {
  try {
    const currentUserId = getUserId(req);
    const groupId = parseInt(req.params.id);

    const isMember = await prisma.participants.findFirst({
      where: { conversation_id: groupId, user_id: currentUserId },
    });
    if (!isMember)
      return res
        .status(403)
        .json({ success: false, message: "Từ chối truy cập" });

    const participants = await prisma.participants.findMany({
      where: { conversation_id: groupId },
      include: {
        User: {
          select: {
            id: true,
            full_name: true,
            email: true,
            avatar_text: true,
            avatar_color: true,
          },
        },
      },
      orderBy: { role: "asc" },
    });

    const members = participants.map((p) => ({
      ...p.User,
      role: p.role,
      joined_at: p.joined_at,
    }));
    res.status(200).json({ success: true, data: members });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi Server" });
  }
};

const addGroupMember = async (req, res) => {
  try {
    const currentUserId = getUserId(req);
    const groupId = parseInt(req.params.id);
    const { email } = req.body;

    if (!email)
      return res
        .status(400)
        .json({ success: false, message: "Vui lòng nhập Email" });

    const inviter = await prisma.participants.findFirst({
      where: { conversation_id: groupId, user_id: currentUserId },
    });
    if (!inviter || inviter.role !== "admin")
      return res.status(403).json({
        success: false,
        message: "Chỉ trưởng nhóm mới được thêm thành viên",
      });

    const targetUser = await prisma.users.findUnique({
      where: { email: email.trim() },
    });
    if (!targetUser)
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng với Email này",
      });

    const existingMember = await prisma.participants.findFirst({
      where: { conversation_id: groupId, user_id: targetUser.id },
    });
    if (existingMember)
      return res
        .status(400)
        .json({ success: false, message: "Người này đã có trong nhóm!" });

    await prisma.participants.create({
      data: {
        conversation_id: groupId,
        user_id: targetUser.id,
        role: "member",
      },
    });

    res.status(200).json({ success: true, message: "Đã thêm thành viên!" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi Server" });
  }
};

const clearGroupHistory = async (req, res) => {
  try {
    const currentUserId = getUserId(req);
    const groupId = parseInt(req.params.id);

    const membership = await prisma.participants.findFirst({
      where: { conversation_id: groupId, user_id: currentUserId },
    });

    if (!membership || membership.role !== "admin")
      return res.status(403).json({
        success: false,
        message: "Chỉ trưởng nhóm mới được xóa lịch sử",
      });

    await prisma.messages.deleteMany({ where: { conversation_id: groupId } });
    res.status(200).json({ success: true, message: "Đã xóa sạch lịch sử!" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi Server" });
  }
};

module.exports = {
  getMyConversations,
  createGroup,
  joinGroup,
  getConversationMessages,
  sendMessage,
  leaveGroup,
  renameGroup,
  getGroupMembers,
  addGroupMember,
  clearGroupHistory,
  markMessagesAsRead,
};
