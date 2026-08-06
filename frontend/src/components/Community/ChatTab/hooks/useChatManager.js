import { useState, useEffect, useRef } from "react";
import { communityAPI } from "../../../../services/api";
import { io } from "socket.io-client";
import { useAuth } from "../../../../context/AuthContext";

const extractData = (res) => (res?.success ? res.data : res) || [];

const useChatManager = () => {
  const { user } = useAuth();
  const [chatType, setChatType] = useState("friends");
  const [selectedChat, setSelectedChat] = useState(null);
  const [message, setMessage] = useState("");
  const [contacts, setContacts] = useState([]);
  const [messages, setMessages] = useState([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const [searchEmail, setSearchEmail] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [searchError, setSearchError] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [isSendingRequest, setIsSendingRequest] = useState(false);

  const [groups, setGroups] = useState([]);
  const [showGroupAction, setShowGroupAction] = useState(null);
  const [groupName, setGroupName] = useState("");
  const [groupDesc, setGroupDesc] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [groupError, setGroupError] = useState("");

  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [groupMembers, setGroupMembers] = useState([]);
  const [isMembersLoading, setIsMembersLoading] = useState(false);

  const [attachedFile, setAttachedFile] = useState(null);
  const [showChatOptionsMenu, setShowChatOptionsMenu] = useState(false);
  const [isChatPinned, setIsChatPinned] = useState(false);
  const [isChatMuted, setIsChatMuted] = useState(false);
  const [isAutoDeleteEnabled, setIsAutoDeleteEnabled] = useState(false);

  const [typingUsers, setTypingUsers] = useState([]);
  const typingTimeoutRef = useRef(null);

  const fileInputRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const chatOptionsRef = useRef(null);
  const socketRef = useRef(null);

  const selectedChatRef = useRef(selectedChat);
  const groupsRef = useRef(groups);

  const isFetchingMessages = useRef(false);

  const getActiveUserId = () => {
    let id = user?.id || user?.user_id || user?.userId;
    if (id) return parseInt(id);

    try {
      const storedUser = JSON.parse(localStorage.getItem("user"));
      id = storedUser?.id || storedUser?.user_id;
      if (id) return parseInt(id);
    } catch (e) {}

    try {
      const token = localStorage.getItem("token");
      if (token) {
        const payload = JSON.parse(atob(token.split(".")[1]));
        id = payload.id || payload.user_id;
        if (id) return parseInt(id);
      }
    } catch (e) {}

    return null;
  };

  const activeUserId = getActiveUserId();

  useEffect(() => {
    selectedChatRef.current = selectedChat;
    setTypingUsers([]);
  }, [selectedChat]);

  useEffect(() => {
    groupsRef.current = groups;
  }, [groups]);

  // 👉 ÉP CỨNG LUÔN LINK RENDER, KHÔNG ĐỂ NÓ NHÌN FILE .ENV NỮA CHO CHẮC CỐP
  const BACKEND_URL = "https://fmn-backend.onrender.com";

  const getFullUrl = (fileUrl) => {
    if (!fileUrl) return null;
    if (fileUrl.startsWith("http")) return fileUrl;
    return `${BACKEND_URL}${fileUrl.startsWith("/") ? "" : "/"}${fileUrl}`;
  };

  const getReceiverId = (chat) => {
    if (!chat || chat.isGroup || chat.is_group) return null;
    if (chat.Participants) {
      const friend = chat.Participants.find((p) => p.user_id !== activeUserId);
      return friend ? friend.user_id : null;
    }
    return chat.id;
  };

  const getConvoId = (chat) => {
    if (!chat) return null;
    if (chat.conversation_id) return chat.conversation_id;
    if (chat.Participants || chat.isGroup || chat.is_group) return chat.id;
    const existing = groupsRef.current.find(
      (g) =>
        !(g.isGroup || g.is_group) &&
        g.Participants?.some((p) => p.user_id === chat.id),
    );
    return existing ? existing.id : null;
  };

  const moveConversationToTop = (conversationId, latestMessage) => {
    setGroups((prevGroups) => {
      const idx = prevGroups.findIndex((g) => g.id === conversationId);
      if (idx === -1) return prevGroups;
      const updatedGroup = {
        ...prevGroups[idx],
        last_message_preview:
          latestMessage.message_type === "image"
            ? "[Hình ảnh]"
            : latestMessage.content,
        last_message_time: latestMessage.created_at,
      };
      const newGroups = [...prevGroups];
      newGroups.splice(idx, 1);
      newGroups.unshift(updatedGroup);
      return newGroups;
    });
  };

  // ==========================================
  // KHỞI TẠO ĂNG-TEN SOCKET.IO
  // ==========================================
  useEffect(() => {
    if (!activeUserId) {
      console.log(
        "❌ [CẢNH BÁO] Không tìm thấy User ID, ăng-ten Socket bị vô hiệu hóa!",
      );
      return;
    }

    if (!socketRef.current) {
      console.log(
        `🔌 [TIẾN HÀNH] Đang cắm cáp Socket tới ${BACKEND_URL} cho User ID: ${activeUserId}`,
      );
      socketRef.current = io(BACKEND_URL, {
        query: { userId: activeUserId },
        reconnection: true,
        reconnectionAttempts: 10,
        transports: ["polling", "websocket"],
        secure: true,
      });

      socketRef.current.on("connect", () => {
        console.log(
          `🟢 [THÀNH CÔNG] Đã cắm ăng-ten Socket! ID Của Tôi: ${socketRef.current.id}`,
        );
      });

      socketRef.current.on("connect_error", (error) => {
        console.error("🔴 [LỖI] Đứt cáp Socket:", error.message);
      });
    }

    socketRef.current.on("receiveNewMessage", (newMessage) => {
      console.log("🚨 [TIN NHẮN ĐẾN] Đã bắt được sóng từ Server:", newMessage);

      const safeMessage = {
        ...newMessage,
        Sender: newMessage.Sender || {
          id: newMessage.sender_id,
          full_name: "Người dùng",
          email: "unknown",
          avatar_text: "U",
          avatar_color: "#94a3b8",
        },
      };

      const currentChat = selectedChatRef.current;
      const currentConvoId = getConvoId(currentChat);

      setTypingUsers((prev) =>
        prev.filter((name) => name !== safeMessage.Sender.full_name),
      );

      let isMatch = false;
      const isGroupMsg = safeMessage.is_group || !!safeMessage.group_id;

      if (isGroupMsg) {
        if (currentConvoId && safeMessage.conversation_id === currentConvoId) {
          isMatch = true;
        }
      } else {
        const friendId = getReceiverId(currentChat);
        if (currentConvoId && safeMessage.conversation_id === currentConvoId) {
          isMatch = true;
        } else if (friendId && safeMessage.sender_id === friendId) {
          isMatch = true;
        } else if (safeMessage.sender_id === activeUserId) {
          isMatch = true;
        }
      }

      if (isMatch) {
        setMessages((prevMessages) => {
          const isExist = prevMessages.find((msg) => msg.id === safeMessage.id);
          if (isExist) return prevMessages;

          if (safeMessage.sender_id === activeUserId) {
            const cleanMessages = prevMessages.filter(
              (msg) =>
                !(
                  msg.id.toString().startsWith("temp-") &&
                  msg.content === safeMessage.content
                ),
            );
            return [...cleanMessages, { ...safeMessage, isMine: true }];
          }

          return [...prevMessages, safeMessage];
        });
      }

      setGroups((prevGroups) => {
        const idx = prevGroups.findIndex(
          (g) => g.id === safeMessage.conversation_id,
        );
        if (idx === -1) return prevGroups;

        const updatedGroup = {
          ...prevGroups[idx],
          unread_count: isMatch ? 0 : (prevGroups[idx].unread_count || 0) + 1,
          last_message_preview:
            safeMessage.message_type === "image"
              ? "[Hình ảnh]"
              : safeMessage.content,
          last_message_time: safeMessage.created_at,
        };

        const newGroups = [...prevGroups];
        newGroups.splice(idx, 1);
        newGroups.unshift(updatedGroup);
        return newGroups;
      });
    });

    socketRef.current.on("userTyping", ({ userName, conversationId }) => {
      const currentChat = selectedChatRef.current;
      const currentConvoId = getConvoId(currentChat);
      if (currentConvoId === conversationId) {
        setTypingUsers((prev) => {
          if (!prev.includes(userName)) return [...prev, userName];
          return prev;
        });
      }
    });

    socketRef.current.on(
      "userStoppedTyping",
      ({ userName, conversationId }) => {
        const currentChat = selectedChatRef.current;
        const currentConvoId = getConvoId(currentChat);
        if (currentConvoId === conversationId) {
          setTypingUsers((prev) => prev.filter((name) => name !== userName));
        }
      },
    );

    // 👉 BẮT SÓNG ĐỒNG BỘ DATA BẠN BÈ
    socketRef.current.on("friend_request_updated", async (data) => {
      if (
        data &&
        activeUserId &&
        (data.user1 === activeUserId || data.user2 === activeUserId)
      ) {
        try {
          const [contactsRes, requestsRes] = await Promise.all([
            communityAPI.getContacts(),
            communityAPI.getPendingRequests(),
          ]);
          const actualContacts = extractData(contactsRes);
          const uniqueContacts = Array.from(
            new Map(actualContacts.map((item) => [item.id, item])).values(),
          );
          setContacts(uniqueContacts);
          setPendingRequests(extractData(requestsRes));

          // 🛠️ BẢN VÁ LỖI HIỂN THỊ KẾT QUẢ TÌM KIẾM Ở ĐÂY
          setSearchResult((prev) => {
            // Nếu người được cập nhật chính là người đang hiển thị ở ô tìm kiếm
            if (prev && (prev.id === data.user1 || prev.id === data.user2)) {
              return { ...prev, friendship_status: "accepted" }; // Đổi trạng thái ngay!
            }
            return prev;
          });
        } catch (error) {
          console.error("Lỗi cập nhật danh sách bạn bè:", error);
        }
      }
    });

    socketRef.current.on("new_friend_request_received", (data) => {
      console.log("💌 [THÔNG BÁO] Có lời mời kết bạn mới:", data);
      alert(data.message || "Bạn có lời mời kết bạn mới!");
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.off("receiveNewMessage");
        socketRef.current.off("userTyping");
        socketRef.current.off("userStoppedTyping");
        socketRef.current.off("friend_request_updated");
        socketRef.current.off("new_friend_request_received");
      }
    };
  }, [BACKEND_URL, activeUserId]); // Thêm ID vào dependency để tránh lỗi vòng lặp

  const handleTyping = () => {
    if (!selectedChat || !socketRef.current) return;

    const convoId = getConvoId(selectedChat);
    const isGroup = selectedChat.isGroup || selectedChat.is_group;
    const receiverId = isGroup ? null : getReceiverId(selectedChat);
    const targetId = isGroup ? convoId : receiverId;

    if (!targetId) return;

    socketRef.current.emit("typing", {
      targetId: targetId.toString(),
      isGroup: !!isGroup,
      userName: user?.full_name || "Người dùng",
      conversationId: convoId,
    });

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current.emit("stopTyping", {
        targetId: targetId.toString(),
        isGroup: !!isGroup,
        userName: user?.full_name || "Người dùng",
        conversationId: convoId,
      });
    }, 2000);
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      setIsInitialLoading(true);
      try {
        const [contactsRes, requestsRes, groupsRes] = await Promise.all([
          communityAPI.getContacts(),
          communityAPI.getPendingRequests(),
          communityAPI.getMyGroups(),
        ]);
        const actualContacts = extractData(contactsRes);
        const uniqueContacts = Array.from(
          new Map(actualContacts.map((item) => [item.id, item])).values(),
        );
        setContacts(uniqueContacts);
        setPendingRequests(extractData(requestsRes));
        setGroups(extractData(groupsRes));
      } catch (error) {
        console.error("Lỗi tải dữ liệu Community:", error);
      } finally {
        setIsInitialLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (!selectedChat) {
      setMessages([]);
      return;
    }

    const fetchMessagesAndMarkRead = async () => {
      if (isFetchingMessages.current) return;
      isFetchingMessages.current = true;

      try {
        let res;
        const friendId = getReceiverId(selectedChat);
        const isGroup = selectedChat.isGroup || selectedChat.is_group;

        if (isGroup) {
          res = await communityAPI.getGroupMessages(selectedChat.id);
        } else {
          res = await communityAPI.getMessages(friendId);
        }

        const safeMessages = extractData(res);
        setMessages(Array.isArray(safeMessages) ? safeMessages : []);

        const firstMsgConvoId = safeMessages[0]?.conversation_id;
        if (firstMsgConvoId && !selectedChat?.conversation_id) {
          setSelectedChat((prev) =>
            prev ? { ...prev, conversation_id: firstMsgConvoId } : null,
          );
        }

        const convoId = getConvoId(selectedChat);
        if (convoId) {
          communityAPI
            .markAsRead(convoId)
            .catch((err) => console.error("Lỗi xóa chấm đỏ:", err));
        }
      } catch (error) {
        console.error("Lỗi tải tin nhắn:", error);
      } finally {
        isFetchingMessages.current = false;
      }
    };

    fetchMessagesAndMarkRead();

    const convoIdForSocket = getConvoId(selectedChat);
    if (socketRef.current && convoIdForSocket) {
      socketRef.current.emit("joinRoom", convoIdForSocket.toString());
    }
  }, [selectedChat?.id]);

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop =
        messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!showChatOptionsMenu) return;
    const handleClickOutside = (e) => {
      if (
        chatOptionsRef.current &&
        !chatOptionsRef.current.contains(e.target)
      ) {
        setShowChatOptionsMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showChatOptionsMenu]);

  const handleRenameGroup = async (newName) => {
    if (!selectedChat?.isGroup && !selectedChat?.is_group) return;
    try {
      const res = await communityAPI.renameGroup(selectedChat.id, newName);
      if (res.success) {
        alert("Đổi tên nhóm thành công!");
        setIsRenameModalOpen(false);
        setSelectedChat((prev) => ({ ...prev, name: newName }));

        setGroups((prev) =>
          prev.map((g) =>
            g.id === selectedChat.id
              ? { ...g, display_name: newName, name: newName }
              : g,
          ),
        );
      } else alert(res.message || "Lỗi khi đổi tên nhóm.");
    } catch (error) {
      alert("Lỗi kết nối.");
    }
  };

  const fetchGroupMembers = async () => {
    if (!selectedChat?.isGroup && !selectedChat?.is_group) return;
    setIsMembersLoading(true);
    try {
      const res = await communityAPI.getGroupMembers(selectedChat.id);
      setGroupMembers(extractData(res));
    } catch (error) {
      console.error(error);
    } finally {
      setIsMembersLoading(false);
    }
  };

  const handleOpenMembersModal = () => {
    setIsMembersModalOpen(true);
    fetchGroupMembers();
  };

  const handleAddMember = async (email) => {
    if (!selectedChat?.isGroup && !selectedChat?.is_group) return;
    try {
      const res = await communityAPI.addGroupMember(selectedChat.id, email);
      if (res.success) {
        alert("Thêm thành viên thành công!");
        fetchGroupMembers();
      } else alert(res.message || "Lỗi khi thêm thành viên.");
    } catch (error) {
      alert("Lỗi kết nối.");
    }
  };

  const handleClearHistory = async () => {
    if (!selectedChat?.isGroup && !selectedChat?.is_group) return;
    if (window.confirm("Xóa toàn bộ lịch sử trò chuyện này?")) {
      try {
        const res = await communityAPI.clearGroupHistory(selectedChat.id);
        if (res.success) {
          alert("Đã xóa sạch lịch sử!");
          setMessages([]);
        } else alert(res.message || "Lỗi xóa lịch sử.");
      } catch (error) {
        alert("Lỗi kết nối.");
      }
    }
  };

  const handleSendMessage = async () => {
    if (!selectedChat || (!message.trim() && !attachedFile)) return;

    const textContent = message.trim();
    const currentFile = attachedFile;
    const tempId = `temp-${Date.now()}`;
    const timestamp = new Date().toISOString();
    const isGroup = selectedChat.isGroup || selectedChat.is_group;

    const optimisticMsg = {
      id: tempId,
      content: textContent,
      isMine: true,
      sender_id: activeUserId,
      created_at: timestamp,
      isSending: true,
      message_type: currentFile
        ? currentFile.type.startsWith("image/")
          ? "image"
          : "file"
        : "text",
      file_name: currentFile ? currentFile.name : null,
      file_url:
        currentFile && currentFile.type.startsWith("image/")
          ? URL.createObjectURL(currentFile)
          : null,
      Sender: {
        id: activeUserId,
        full_name: user?.full_name || "Tôi",
        avatar_text: user?.full_name
          ? user.full_name.charAt(0).toUpperCase()
          : "U",
        avatar_color: "#3b82f6",
      },
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setMessage("");
    setAttachedFile(null);

    clearTimeout(typingTimeoutRef.current);
    const convoIdForTyping = getConvoId(selectedChat);
    const targetIdForTyping = isGroup
      ? convoIdForTyping
      : getReceiverId(selectedChat);
    if (targetIdForTyping && socketRef.current) {
      socketRef.current.emit("stopTyping", {
        targetId: targetIdForTyping.toString(),
        isGroup: !!isGroup,
        userName: user?.full_name || "Người dùng",
        conversationId: convoIdForTyping,
      });
    }

    const convoId = getConvoId(selectedChat);
    if (convoId) {
      moveConversationToTop(convoId, optimisticMsg);
    }

    const formData = new FormData();
    if (isGroup) {
      if (textContent) formData.append("content", textContent);
      if (currentFile) formData.append("file", currentFile);
    } else {
      const friendId = getReceiverId(selectedChat);
      formData.append("receiver_id", friendId);
      if (textContent) formData.append("content", textContent);
      if (currentFile) formData.append("file", currentFile);
    }

    try {
      const res = isGroup
        ? await communityAPI.sendGroupMessage(selectedChat.id, formData)
        : await communityAPI.sendMessage(formData);

      if (
        res &&
        !res.success &&
        (res.message === "Forbidden" || res.message?.includes("quyền"))
      ) {
        setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
        return alert("Bạn không có quyền gửi tin nhắn.");
      }

      if (res.success && res.data) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === res.data.id)) {
            return prev.filter((m) => m.id !== tempId);
          }
          return prev.map((msg) =>
            msg.id === tempId ? { ...res.data, isMine: true } : msg,
          );
        });

        if (!convoId && res.data.conversation_id) {
          setSelectedChat((prev) =>
            prev
              ? { ...prev, conversation_id: res.data.conversation_id }
              : null,
          );
        }
      }
    } catch (error) {
      console.error("Lỗi gửi tin nhắn:", error);
      setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
      alert("Gửi tin nhắn thất bại.");
    }
  };

  const toggleChatOptionsMenu = () => setShowChatOptionsMenu((prev) => !prev);
  const handleTogglePinChat = () => {
    setIsChatPinned(!isChatPinned);
    setShowChatOptionsMenu(false);
  };
  const handleClassifyChat = () => {
    setShowChatOptionsMenu(false);
    alert("Đang cập nhật.");
  };
  const handleMarkUnread = () => {
    setShowChatOptionsMenu(false);
    alert("Đã đánh dấu.");
  };
  const handleAddToGroup = () => {
    setShowChatOptionsMenu(false);
    alert("Đang cập nhật.");
  };
  const handleToggleMuteChat = () => {
    setIsChatMuted(!isChatMuted);
    setShowChatOptionsMenu(false);
  };
  const handleHideChat = () => {
    setShowChatOptionsMenu(false);
    setSelectedChat(null);
  };
  const handleToggleAutoDelete = () => {
    setIsAutoDeleteEnabled(!isAutoDeleteEnabled);
    setShowChatOptionsMenu(false);
  };

  const handleDeleteConversation = () => {
    setShowChatOptionsMenu(false);
    if (window.confirm("Xóa hội thoại?")) {
      setMessages([]);
      setSelectedChat(null);
    }
  };

  const handleReportConversation = () => {
    setShowChatOptionsMenu(false);
    alert("Đã gửi báo cáo.");
  };

  const handleLeaveGroup = async () => {
    if (!selectedChat?.isGroup && !selectedChat?.is_group) return;
    if (!window.confirm("Rời nhóm này?")) return;
    try {
      const res = await communityAPI.leaveGroup(selectedChat.id);
      if (res.res) {
        alert("Đã rời nhóm.");
        setGroups((prev) => prev.filter((g) => g.id !== selectedChat.id));
        setSelectedChat(null);
      } else alert(res.message);
    } catch {
      alert("Lỗi.");
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) setAttachedFile(file);
  };

  const handleSearchFriend = async () => {
    if (!searchEmail.trim()) return setSearchError("Vui lòng nhập Email!");
    setIsSearching(true);
    setSearchError("");
    setSearchResult(null);
    try {
      const res = await communityAPI.searchUser(searchEmail);
      if (res.success && res.data) setSearchResult(res.data);
      else setSearchError(res.message || "Không tìm thấy!");
    } catch {
      setSearchError("Lỗi kết nối.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendFriendRequest = async () => {
    if (
      !searchResult ||
      isSendingRequest ||
      ["pending", "accepted"].includes(searchResult.friendship_status)
    )
      return;
    setIsSendingRequest(true);
    try {
      const res = await communityAPI.sendFriendRequest(searchResult.id);
      if (res.success) {
        alert("Đã gửi lời mời!");
        setSearchResult((prev) => ({ ...prev, friendship_status: "pending" }));
      } else setSearchError(res.message);
    } catch {
      setSearchError("Lỗi.");
    } finally {
      setIsSendingRequest(false);
    }
  };

  const handleRespondRequest = async (requestId, action) => {
    try {
      const res = await communityAPI.respondFriendRequest(requestId, action);
      if (res.success) {
        setPendingRequests((prev) =>
          prev.filter((req) => req.id !== requestId),
        );
        if (action === "accepted") {
          const contactsRes = await communityAPI.getContacts();
          const uniqueContacts = Array.from(
            new Map(
              extractData(contactsRes).map((item) => [item.id, item]),
            ).values(),
          );
          setContacts(uniqueContacts);
          if (searchResult && searchResult.friendship_id === requestId)
            setSearchResult((prev) => ({
              ...prev,
              friendship_status: "accepted",
            }));
        } else {
          if (searchResult && searchResult.friendship_id === requestId)
            setSearchResult((prev) => ({ ...prev, friendship_status: "none" }));
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleChatWithFriend = () => {
    if (!searchResult) return;

    // 👉 "contacts" chỉ được đồng bộ qua socket "friend_request_updated" — nếu socket bị lỡ
    // (tab không mở đúng lúc, đang reconnect...) thì contacts có thể chưa kịp có bạn mới dù
    // searchResult đã báo friendship_status "accepted". Trước đây bấm "Nhắn tin" trong tình
    // huống này không làm gì cả (contacts.find thất bại) — giờ dựng thẳng đối tượng chat từ
    // chính searchResult thay vì bắt buộc phải có sẵn trong contacts.
    const exists = contacts.find((c) => c.id === searchResult.id);
    const target = exists || {
      id: searchResult.id,
      full_name: searchResult.full_name,
      email: searchResult.email,
      avatar_text: searchResult.avatar_text,
      avatar_color: searchResult.avatar_color,
      is_online: searchResult.is_online || false,
    };

    if (!exists) {
      setContacts((prev) => [target, ...prev]);
    }

    setSelectedChat({ ...target, isGroup: false });
    setChatType("friends");
    setSearchEmail("");
    setSearchResult(null);
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim())
      return setGroupError("Tên nhóm không được bỏ trống!");
    setGroupError("");
    try {
      const res = await communityAPI.createGroup(groupName, groupDesc);
      if (res.success) {
        alert("🎉 Đã tạo nhóm!");
        const groupsRes = await communityAPI.getMyGroups();
        setGroups(extractData(groupsRes));
        setShowGroupAction(null);
        setGroupName("");
        setGroupDesc("");
      } else setGroupError(res.message);
    } catch {
      setGroupError("Lỗi.");
    }
  };

  const handleJoinGroup = async () => {
    if (!inviteCode.trim()) return setGroupError("Nhập mã Invite!");
    setGroupError("");
    try {
      const res = await communityAPI.joinGroup(inviteCode);
      if (res.success) {
        alert("🎉 Đã tham gia nhóm!");
        const groupsRes = await communityAPI.getMyGroups();
        setGroups(extractData(groupsRes));
        setShowGroupAction(null);
        setInviteCode("");
      } else setGroupError(res.message);
    } catch {
      setGroupError("Lỗi.");
    }
  };

  return {
    isInitialLoading,
    chatType,
    setChatType,
    selectedChat,
    setSelectedChat,
    message,
    setMessage,
    contacts,
    messages,
    searchEmail,
    setSearchEmail,
    searchResult,
    searchError,
    isSearching,
    pendingRequests,
    groups,
    showGroupAction,
    setShowGroupAction,
    groupName,
    setGroupName,
    groupDesc,
    setGroupDesc,
    inviteCode,
    setInviteCode,
    groupError,
    setGroupError,
    attachedFile,
    setAttachedFile,
    fileInputRef,
    messagesContainerRef,
    chatOptionsRef,
    showChatOptionsMenu,
    isChatPinned,
    isChatMuted,
    isAutoDeleteEnabled,
    typingUsers,
    handleTyping,
    BACKEND_URL,
    getFullUrl,
    toggleChatOptionsMenu,
    handleTogglePinChat,
    handleClassifyChat,
    handleMarkUnread,
    handleAddToGroup,
    handleToggleMuteChat,
    handleHideChat,
    handleToggleAutoDelete,
    handleDeleteConversation,
    handleReportConversation,
    handleLeaveGroup,
    handleSendMessage,
    handleFileChange,
    handleSearchFriend,
    handleSendFriendRequest,
    handleRespondRequest,
    handleChatWithFriend,
    handleCreateGroup,
    handleJoinGroup,
    isRenameModalOpen,
    setIsRenameModalOpen,
    isMembersModalOpen,
    setIsMembersModalOpen,
    groupMembers,
    isMembersLoading,
    handleRenameGroup,
    handleOpenMembersModal,
    handleAddMember,
    handleClearHistory,
  };
};

export default useChatManager;
