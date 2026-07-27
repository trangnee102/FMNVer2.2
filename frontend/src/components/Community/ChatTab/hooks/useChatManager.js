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

  useEffect(() => {
    selectedChatRef.current = selectedChat;
    setTypingUsers([]);
  }, [selectedChat]);

  useEffect(() => {
    groupsRef.current = groups;
  }, [groups]);

  const BACKEND_URL = import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace("/api", "")
    : "http://localhost:5000";

  const getFullUrl = (fileUrl) => {
    if (!fileUrl) return null;
    if (fileUrl.startsWith("http")) return fileUrl;
    return `${BACKEND_URL}${fileUrl.startsWith("/") ? "" : "/"}${fileUrl}`;
  };

  const getReceiverId = (chat) => {
    if (!chat || chat.isGroup || chat.is_group) return null;
    if (chat.Participants) {
      const friend = chat.Participants.find((p) => p.user_id !== user.id);
      return friend ? friend.user_id : null;
    }
    return chat.id;
  };

  const getConvoId = (chat) => {
    if (!chat) return null;
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

  useEffect(() => {
    if (!user || !user.id) return;

    if (!socketRef.current) {
      socketRef.current = io(BACKEND_URL, {
        query: { userId: user.id },
        reconnection: true,
      });
    }

    socketRef.current.on("receiveNewMessage", (newMessage) => {
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

      setMessages((prevMessages) => {
        const isExist = prevMessages.find((msg) => msg.id === safeMessage.id);
        if (isExist) return prevMessages;

        if (currentConvoId === safeMessage.conversation_id) {
          return [...prevMessages, safeMessage];
        }
        return prevMessages;
      });

      setGroups((prevGroups) => {
        const idx = prevGroups.findIndex(
          (g) => g.id === safeMessage.conversation_id,
        );
        if (idx === -1) return prevGroups;

        const isCurrentlyViewing =
          currentConvoId === safeMessage.conversation_id;

        const updatedGroup = {
          ...prevGroups[idx],
          unread_count: isCurrentlyViewing
            ? 0
            : (prevGroups[idx].unread_count || 0) + 1,
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

    socketRef.current.on("friend_request_updated", async (data) => {
      if (data && user && (data.user1 === user.id || data.user2 === user.id)) {
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
        } catch (error) {
          console.error("Lỗi cập nhật danh sách bạn bè:", error);
        }
      }
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.off("receiveNewMessage");
        socketRef.current.off("userTyping");
        socketRef.current.off("userStoppedTyping");
        socketRef.current.off("friend_request_updated");
      }
    };
  }, [BACKEND_URL, user?.id]);

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
      userName: user.full_name || "Người dùng",
      conversationId: convoId,
    });

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current.emit("stopTyping", {
        targetId: targetId.toString(),
        isGroup: !!isGroup,
        userName: user.full_name || "Người dùng",
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

    const isGroup = selectedChat.isGroup || selectedChat.is_group;
    if (socketRef.current && isGroup) {
      socketRef.current.emit("joinRoom", selectedChat.id.toString());
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
        alert("🎉 Đổi tên nhóm thành công!");
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
      // 👉 ĐÃ SỬA: Hiển thị lỗi chuẩn từ Backend
      alert(error.message || "Lỗi kết nối.");
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
        alert("✅ Thêm thành viên thành công!");
        fetchGroupMembers();
      } else alert(res.message || "Lỗi khi thêm thành viên.");
    } catch (error) {
      // 👉 ĐÃ SỬA
      alert(error.message || "Lỗi kết nối.");
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
        // 👉 ĐÃ SỬA
        alert(error.message || "Lỗi kết nối.");
      }
    }
  };

  const handleSendMessage = async () => {
    if (!selectedChat || (!message.trim() && !attachedFile)) return;

    const currentUserId = user?.id || 0;
    const textContent = message.trim();
    const currentFile = attachedFile;
    const tempId = `temp-${Date.now()}`;
    const timestamp = new Date().toISOString();
    const isGroup = selectedChat.isGroup || selectedChat.is_group;

    const optimisticMsg = {
      id: tempId,
      content: textContent,
      isMine: true,
      sender_id: currentUserId,
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
        id: currentUserId,
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
        userName: user.full_name || "Người dùng",
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

        if (!convoId) {
          const groupsRes = await communityAPI.getMyGroups();
          setGroups(extractData(groupsRes));
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
      if (res.success) {
        alert("Đã rời nhóm.");
        setGroups((prev) => prev.filter((g) => g.id !== selectedChat.id));
        setSelectedChat(null);
      } else alert(res.message);
    } catch (error) {
      // 👉 ĐÃ SỬA
      alert(error.message || "Lỗi.");
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) setAttachedFile(file);
  };

  // 👉 ĐÃ SỬA: Bắt đúng lỗi 404 từ API trả về
  const handleSearchFriend = async () => {
    if (!searchEmail.trim()) return setSearchError("Vui lòng nhập Email!");
    setIsSearching(true);
    setSearchError("");
    setSearchResult(null);
    try {
      const res = await communityAPI.searchUser(searchEmail);
      if (res.success && res.data) setSearchResult(res.data);
      else setSearchError(res.message || "Không tìm thấy!");
    } catch (error) {
      // Bóc tách lỗi chi tiết từ Backend
      setSearchError(error.message || "Không tìm thấy người dùng này!");
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
    } catch (error) {
      // 👉 ĐÃ SỬA
      setSearchError(error.message || "Lỗi.");
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
    const exists = contacts.find((c) => c.id === searchResult.id);
    if (exists) {
      setSelectedChat(exists);
      setChatType("friends");
      setSearchEmail("");
      setSearchResult(null);
    }
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
    } catch (error) {
      // 👉 ĐÃ SỬA
      setGroupError(error.message || "Lỗi.");
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
    } catch (error) {
      // 👉 ĐÃ SỬA
      setGroupError(error.message || "Lỗi.");
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
