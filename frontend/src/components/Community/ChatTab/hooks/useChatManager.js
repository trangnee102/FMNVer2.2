import { useState, useEffect, useRef } from "react";
import { communityAPI } from "../../../../services/api";

// 👉 Helper: Chuẩn hóa dữ liệu trả về từ API (Gọt bỏ mấy dòng if/else lặp lại)
const extractData = (res) => (res?.success ? res.data : res) || [];

const useChatManager = () => {
  // ==========================================
  // 1. KHAI BÁO STATE
  // ==========================================
  const [chatType, setChatType] = useState("friends");
  const [selectedChat, setSelectedChat] = useState(null);
  const [message, setMessage] = useState("");
  const [contacts, setContacts] = useState([]);
  const [messages, setMessages] = useState([]);

  // Tìm kiếm & Kết bạn
  const [searchEmail, setSearchEmail] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [searchError, setSearchError] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [isSendingRequest, setIsSendingRequest] = useState(false);

  // Nhóm chat
  const [groups, setGroups] = useState([]);
  const [showGroupAction, setShowGroupAction] = useState(null);
  const [groupName, setGroupName] = useState("");
  const [groupDesc, setGroupDesc] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [groupError, setGroupError] = useState("");

  // Tùy chọn Chat & File
  const [attachedFile, setAttachedFile] = useState(null);
  const [showChatOptionsMenu, setShowChatOptionsMenu] = useState(false);
  const [isChatPinned, setIsChatPinned] = useState(false);
  const [isChatMuted, setIsChatMuted] = useState(false);
  const [isAutoDeleteEnabled, setIsAutoDeleteEnabled] = useState(false);

  // Refs
  const fileInputRef = useRef(null);
  const lastMsgIdRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const chatOptionsRef = useRef(null);

  // 👉 CHUẨN HÓA URL: Lấy từ biến môi trường, tự động đổi khi đưa lên mạng
  const BACKEND_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

  const getFullUrl = (fileUrl) => {
    if (!fileUrl) return null;
    if (fileUrl.startsWith("http")) return fileUrl;
    return `${BACKEND_URL}${fileUrl.startsWith("/") ? "" : "/"}${fileUrl}`;
  };

  // ==========================================
  // 2. EFFECT: LẤY DỮ LIỆU BAN ĐẦU (DANH BẠ, NHÓM, LỜI MỜI)
  // ==========================================
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [contactsRes, requestsRes, groupsRes] = await Promise.all([
          communityAPI.getContacts(),
          communityAPI.getPendingRequests(),
          communityAPI.getMyGroups(),
        ]);

        // Lọc trùng lặp danh bạ (Dùng Map để đảm bảo ID là duy nhất)
        const actualContacts = extractData(contactsRes);
        const uniqueContacts = Array.from(
          new Map(actualContacts.map((item) => [item.id, item])).values(),
        );

        setContacts(uniqueContacts);
        setPendingRequests(extractData(requestsRes));
        setGroups(extractData(groupsRes));
      } catch (error) {
        console.error("Lỗi tải dữ liệu Community:", error);
      }
    };
    fetchInitialData();
  }, [chatType]);

  // ==========================================
  // 3. EFFECT: QUẢN LÝ TIN NHẮN (TẢI LẦN ĐẦU & LẮNG NGHE)
  // ==========================================
  useEffect(() => {
    if (!selectedChat) {
      setMessages([]);
      lastMsgIdRef.current = null;
      return;
    }

    const fetchMessages = async () => {
      try {
        const res = selectedChat.isGroup
          ? await communityAPI.getGroupMessages(selectedChat.id)
          : await communityAPI.getMessages(selectedChat.id);

        const safeMessages = extractData(res);
        // Đảm bảo phải là mảng
        const validMessages = Array.isArray(safeMessages) ? safeMessages : [];

        setMessages(validMessages);
        lastMsgIdRef.current =
          validMessages[validMessages.length - 1]?.id || null;
      } catch (error) {
        console.error("Lỗi tải tin nhắn:", error);
      }
    };

    fetchMessages();

    // ⚠️ TODO của Senior: Tạm thời dùng setInterval, nhưng tương lai phải đổi sang Socket.io!
    const pollInterval = setInterval(async () => {
      try {
        const res = selectedChat.isGroup
          ? await communityAPI.getGroupMessages(selectedChat.id)
          : await communityAPI.getMessages(selectedChat.id);

        const validMessages = Array.isArray(extractData(res))
          ? extractData(res)
          : [];
        const latestId = validMessages[validMessages.length - 1]?.id || null;

        // Chỉ cập nhật state nếu thực sự có tin nhắn mới (Tránh re-render liên tục)
        if (latestId !== lastMsgIdRef.current) {
          setMessages(validMessages);
          lastMsgIdRef.current = latestId;
        }
      } catch (err) {
        // Im lặng bỏ qua lỗi mạng tạm thời khi polling
      }
    }, 1500);

    return () => clearInterval(pollInterval);
  }, [selectedChat]);

  // Tự động cuộn xuống cuối khi có tin nhắn mới
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop =
        messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Đóng Menu Option khi click ra ngoài
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

  // ==========================================
  // 4. CÁC HÀM XỬ LÝ SỰ KIỆN (ACTIONS)
  // ==========================================

  const handleSendMessage = async () => {
    if (!selectedChat || (!message.trim() && !attachedFile)) return;

    const formData = new FormData();
    if (selectedChat.isGroup) {
      formData.append("content", message.trim());
      if (attachedFile) formData.append("file", attachedFile);
    } else {
      formData.append("receiver_id", selectedChat.id);
      if (message.trim()) formData.append("content", message.trim());
      if (attachedFile) formData.append("file", attachedFile);
    }

    try {
      const res = selectedChat.isGroup
        ? await communityAPI.sendGroupMessage(selectedChat.id, formData)
        : await communityAPI.sendMessage(formData);

      const sentMsg = extractData(res);

      // Bắt lỗi 403 (Cấm quyền)
      if (
        res &&
        !res.success &&
        (res.message === "Forbidden" || res.message?.includes("quyền"))
      ) {
        console.error("Bị Backend chặn không cho gửi tin nhắn!");
        return alert("Bạn không có quyền gửi tin nhắn vào lúc này.");
      }

      setMessages((prev) => {
        const next = [...prev, sentMsg];
        lastMsgIdRef.current = sentMsg.id || lastMsgIdRef.current;
        return next;
      });

      // Reset form
      setMessage("");
      setAttachedFile(null);
    } catch (error) {
      console.error("Lỗi gửi tin nhắn:", error);
    }
  };

  // ... (Giữ nguyên các hàm thao tác nhóm, kết bạn, options như cũ để không làm gãy Logic UI của cậu)
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
    if (!selectedChat?.isGroup || !window.confirm("Rời nhóm này?")) return;
    try {
      const res = await communityAPI.leaveGroup(selectedChat.id);
      if (res.success) {
        alert("Đã rời nhóm.");
        const groupsRes = await communityAPI.getMyGroups();
        setGroups(extractData(groupsRes));
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
  };
};

export default useChatManager;
