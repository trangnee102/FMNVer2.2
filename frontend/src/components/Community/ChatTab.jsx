import { useState, useEffect, useRef } from "react";
import "./ChatTab.css";
import { communityAPI } from "../../services/api";

const ChatTab = () => {
  const [chatType, setChatType] = useState("friends");
  const [selectedChat, setSelectedChat] = useState(null);
  const [message, setMessage] = useState("");

  const [contacts, setContacts] = useState([]);
  const [messages, setMessages] = useState([]);

  // State Tìm kiếm & Lời mời
  const [searchEmail, setSearchEmail] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [searchError, setSearchError] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [isSendingRequest, setIsSendingRequest] = useState(false);

  // State Nhóm Học
  const [groups, setGroups] = useState([]);
  const [showGroupAction, setShowGroupAction] = useState(null);
  const [groupName, setGroupName] = useState("");
  const [groupDesc, setGroupDesc] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [groupError, setGroupError] = useState("");

  // State File đính kèm
  const [attachedFile, setAttachedFile] = useState(null);
  const fileInputRef = useRef(null);

  const BACKEND_URL = "http://localhost:5000";

  // --- (CÁC HÀM XỬ LÝ LOGIC API VẪN GIỮ NGUYÊN) ---
  // Ref giữ id tin nhắn cuối cùng để so sánh khi polling
  const lastMsgIdRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const chatOptionsRef = useRef(null);

  const [showChatOptionsMenu, setShowChatOptionsMenu] = useState(false);
  const [isChatPinned, setIsChatPinned] = useState(false);
  const [isChatMuted, setIsChatMuted] = useState(false);
  const [isAutoDeleteEnabled, setIsAutoDeleteEnabled] = useState(false);

  const getFullUrl = (fileUrl) => {
    if (!fileUrl) return null;
    if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) return fileUrl;
    return `${BACKEND_URL}${fileUrl.startsWith("/") ? "" : "/"}${fileUrl}`;
  };
  useEffect(() => {
    const fetchData = async () => {
      try {
        const contactsData = await communityAPI.getContacts();
        const uniqueContacts = Array.from(
          new Map(contactsData.map((item) => [item.id, item])).values(),
        );
        setContacts(uniqueContacts);
        const requestsRes = await communityAPI.getPendingRequests();
        if (requestsRes.success) setPendingRequests(requestsRes.data);
        const groupsRes = await communityAPI.getMyGroups();
        if (groupsRes.success) setGroups(groupsRes.data);
      } catch (error) {
        console.error("Lỗi tải dữ liệu:", error);
      }
    };
    fetchData();
  }, [chatType]);

  useEffect(() => {
    if (!selectedChat) {
      setMessages([]);
      lastMsgIdRef.current = null;
      return;
    }

    const fetchMessages = async () => {
      try {
        const data = selectedChat.isGroup
          ? await communityAPI.getGroupMessages(selectedChat.id)
          : await communityAPI.getMessages(selectedChat.id);
        const messagesData = data.success ? data.data : data || [];
        setMessages(messagesData || []);
        lastMsgIdRef.current = messagesData?.[messagesData.length - 1]?.id || null;
      } catch (error) {
        console.error("Lỗi tải tin nhắn:", error);
      }
    };

    fetchMessages();
  }, [selectedChat]);

  // Polling nhẹ để cập nhật tin nhắn mới trong khung chat đang mở
  useEffect(() => {
    if (!selectedChat) return;

    const pollInterval = setInterval(async () => {
      try {
        const data = selectedChat.isGroup
          ? await communityAPI.getGroupMessages(selectedChat.id)
          : await communityAPI.getMessages(selectedChat.id);
        const messagesData = data.success ? data.data : data || [];
        const latestId = messagesData?.[messagesData.length - 1]?.id || null;

        if (latestId !== lastMsgIdRef.current) {
          setMessages(messagesData || []);
          lastMsgIdRef.current = latestId;
        }
      } catch (err) {
        console.error("Lỗi polling tin nhắn:", err);
      }
    }, 1500);

    return () => clearInterval(pollInterval);
  }, [selectedChat]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesContainerRef.current) {
      try {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      } catch {
        // Ignore scroll failures
      }
    }
  }, [messages]);

  useEffect(() => {
    if (!showChatOptionsMenu) return;
    const handleClickOutside = (event) => {
      if (chatOptionsRef.current && !chatOptionsRef.current.contains(event.target)) {
        setShowChatOptionsMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showChatOptionsMenu]);

  const toggleChatOptionsMenu = () => setShowChatOptionsMenu((prev) => !prev);
  const handleTogglePinChat = () => {
    setIsChatPinned((prev) => !prev);
    setShowChatOptionsMenu(false);
  };
  const handleClassifyChat = () => {
    setShowChatOptionsMenu(false);
    alert("Tính năng phân loại đang cập nhật.");
  };
  const handleMarkUnread = () => {
    setShowChatOptionsMenu(false);
    alert("Hội thoại đã được đánh dấu chưa đọc.");
  };
  const handleAddToGroup = () => {
    setShowChatOptionsMenu(false);
    alert("Tính năng thêm vào nhóm đang cập nhật.");
  };
  const handleToggleMuteChat = () => {
    setIsChatMuted((prev) => !prev);
    setShowChatOptionsMenu(false);
  };
  const handleHideChat = () => {
    setShowChatOptionsMenu(false);
    setSelectedChat(null);
  };
  const handleToggleAutoDelete = () => {
    setIsAutoDeleteEnabled((prev) => !prev);
    setShowChatOptionsMenu(false);
  };
  const handleDeleteConversation = () => {
    setShowChatOptionsMenu(false);
    if (window.confirm("Bạn có chắc muốn xóa hội thoại này không?")) {
      setMessages([]);
      setSelectedChat(null);
    }
  };
  const handleReportConversation = () => {
    setShowChatOptionsMenu(false);
    alert("Đã gửi báo cáo hội thoại.");
  };

  const handleLeaveGroup = async () => {
    if (!selectedChat?.isGroup) return;
    if (!window.confirm("Bạn có chắc muốn rời nhóm này?")) return;

    try {
      const response = await communityAPI.leaveGroup(selectedChat.id);
      if (response.success) {
        alert("Bạn đã rời nhóm.");
        const groupsRes = await communityAPI.getMyGroups();
        if (groupsRes.success) setGroups(groupsRes.data);
        setSelectedChat(null);
      } else {
        alert(response.message || "Không thể rời nhóm.");
      }
    } catch (error) {
      console.error("Lỗi rời nhóm:", error);
      alert("Lỗi khi rời nhóm.");
    }
  };

  const handleSendMessage = async () => {
    if (!selectedChat) return;
    if (!message.trim() && !attachedFile) return;

    const formData = new FormData();
    if (selectedChat.isGroup) {
      formData.append("content", message);
      if (attachedFile) formData.append("file", attachedFile);
    } else {
      formData.append("receiver_id", selectedChat.id);
      if (message.trim()) formData.append("content", message);
      if (attachedFile) formData.append("file", attachedFile);
    }

    try {
      const sentMsg = selectedChat.isGroup
        ? await communityAPI.sendGroupMessage(selectedChat.id, formData)
        : await communityAPI.sendMessage(formData);
      const data = sentMsg.success ? sentMsg.data : sentMsg;
      setMessages((prev) => {
        const next = [...prev, data];
        lastMsgIdRef.current = data.id || lastMsgIdRef.current;
        return next;
      });
      setMessage("");
      setAttachedFile(null);
    } catch (error) {
      console.error("Lỗi gửi tin nhắn:", error);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) setAttachedFile(file);
  };

  const handleSearchFriend = async () => {
    if (!searchEmail.trim())
      return setSearchError("Vui lòng nhập Email để tìm kiếm!");
    setIsSearching(true);
    setSearchError("");
    setSearchResult(null);
    try {
      const response = await communityAPI.searchUser(searchEmail);
      if (response.success && response.data) setSearchResult(response.data);
      else setSearchError(response.message || "Không tìm thấy người dùng này!");
    } catch {
      setSearchError("Lỗi kết nối khi tìm kiếm.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendFriendRequest = async () => {
    if (!searchResult) return;
    if (isSendingRequest) return;
    if (searchResult.friendship_status === "pending" || searchResult.friendship_status === "accepted") return;
    setIsSendingRequest(true);

    try {
      const response = await communityAPI.sendFriendRequest(searchResult.id);
      if (response.success) {
        alert("Đã gửi lời mời!");
        setSearchResult((prev) => ({ ...prev, friendship_status: "pending" }));
      } else {
        setSearchError(response.message);
      }
    } catch {
      setSearchError("Lỗi khi gửi lời mời!");
    } finally {
      setIsSendingRequest(false);
    }
  };

  const handleRespondRequest = async (requestId, action) => {
    try {
      const response = await communityAPI.respondFriendRequest(
        requestId,
        action,
      );
      if (response.success) {
        setPendingRequests((prev) =>
          prev.filter((req) => req.id !== requestId),
        );
        if (action === "accepted") {
          const contactsData = await communityAPI.getContacts();
          setContacts(contactsData);
        }
      }
    } catch (error) {
      console.error("Lỗi khi phản hồi:", error);
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
        if (groupsRes.success) setGroups(groupsRes.data);
        setShowGroupAction(null);
        setGroupName("");
        setGroupDesc("");
      } else setGroupError(res.message);
    } catch {
      setGroupError("Lỗi hệ thống khi tạo nhóm.");
    }
  };

  const handleJoinGroup = async () => {
    if (!inviteCode.trim()) return setGroupError("Vui lòng nhập mã Invite!");
    setGroupError("");
    try {
      const res = await communityAPI.joinGroup(inviteCode);
      if (res.success) {
        alert("🎉 Đã tham gia nhóm!");
        const groupsRes = await communityAPI.getMyGroups();
        if (groupsRes.success) setGroups(groupsRes.data);
        setShowGroupAction(null);
        setInviteCode("");
      } else setGroupError(res.message);
    } catch {
      setGroupError("Lỗi hệ thống khi tham gia nhóm.");
    }
  };

  // --- GIAO DIỆN (JSX) ĐÃ ĐƯỢC LÀM SẠCH ---
  return (
    <div className="chat-tab-container">
      {/* SIDEBAR BÊN TRÁI */}
      <div className="chat-sidebar">
        {/* HEADER CỦA SIDEBAR (Tìm kiếm / Nhóm) */}
        <div
          className="chat-sidebar-header"
          style={{
            flexDirection: "column",
            gap: "10px",
            alignItems: "stretch",
          }}
        >
          {chatType === "friends" ? (
            <>
              <div
                className="chat-search"
                style={{ display: "flex", width: "100%" }}
              >
                <input
                  type="email"
                  placeholder="Nhập Email tìm bạn..."
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearchFriend()}
                />
                <button
                  className="send-btn"
                  style={{ borderRadius: "0 8px 8px 0" }}
                  onClick={handleSearchFriend}
                  disabled={isSearching}
                >
                  {isSearching ? (
                    <i className="fa-solid fa-spinner fa-spin"></i>
                  ) : (
                    <i className="fa-solid fa-magnifying-glass"></i>
                  )}
                </button>
              </div>

              {searchError && <p className="search-error">{searchError}</p>}

              {searchResult && (
                <div className="search-result-card">
                  <div className="search-user-info">
                    <div
                      className="search-avatar"
                      style={{
                        backgroundColor: searchResult.avatar_color || "#10b981",
                      }}
                    >
                      {searchResult.avatar_text || "U"}
                    </div>
                    <div>
                      <h4 className="search-name">
                        {searchResult.full_name ||
                          searchResult.email ||
                          "Người dùng"}
                      </h4>
                      <p className="search-email">{searchResult.email}</p>
                    </div>
                  </div>
                  {searchResult.friendship_status === "accepted" ? (
                    <button
                      className="action-btn btn-primary"
                      onClick={handleChatWithFriend}
                    >
                      Nhắn tin
                    </button>
                  ) : searchResult.friendship_status === "pending" ? (
                    <button className="action-btn btn-disabled" disabled>
                      Đang chờ xác nhận...
                    </button>
                  ) : (
                    <button
                      className="action-btn btn-success"
                      onClick={handleSendFriendRequest}
                    >
                      Gửi lời mời kết bạn
                    </button>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="group-action-row">
                <button
                  className={`group-toggle-btn ${showGroupAction === "join" ? "active join" : "inactive"}`}
                  onClick={() => {
                    setShowGroupAction(
                      showGroupAction === "join" ? null : "join",
                    );
                    setGroupError("");
                  }}
                >
                  <i className="fa-solid fa-right-to-bracket"></i> Vào nhóm
                </button>
                <button
                  className={`group-toggle-btn ${showGroupAction === "create" ? "active create" : "inactive"}`}
                  onClick={() => {
                    setShowGroupAction(
                      showGroupAction === "create" ? null : "create",
                    );
                    setGroupError("");
                  }}
                >
                  <i className="fa-solid fa-plus"></i> Tạo nhóm
                </button>
              </div>

              {showGroupAction === "join" && (
                <div className="group-form-box join">
                  <input
                    className="group-input"
                    type="text"
                    placeholder="Nhập mã Invite (VD: GRP-ABC...)"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                  />
                  <button
                    className="action-btn btn-primary"
                    onClick={handleJoinGroup}
                  >
                    Tham gia ngay
                  </button>
                </div>
              )}

              {showGroupAction === "create" && (
                <div className="group-form-box create">
                  <input
                    className="group-input"
                    type="text"
                    placeholder="Tên nhóm học..."
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                  />
                  <input
                    className="group-input"
                    type="text"
                    placeholder="Mô tả ngắn..."
                    value={groupDesc}
                    onChange={(e) => setGroupDesc(e.target.value)}
                  />
                  <button
                    className="action-btn btn-success"
                    onClick={handleCreateGroup}
                  >
                    Hoàn tất tạo
                  </button>
                </div>
              )}
              {groupError && <p className="search-error">{groupError}</p>}
            </>
          )}
        </div>

        {/* TABS (Bạn bè / Nhóm học) */}
        <div className="chat-tabs">
          <button
            className={chatType === "friends" ? "active" : ""}
            onClick={() => {
              setChatType("friends");
              setSelectedChat(null);
            }}
          >
            Bạn bè
          </button>
          <button
            className={chatType === "groups" ? "active" : ""}
            onClick={() => {
              setChatType("groups");
              setSelectedChat(null);
              setShowGroupAction(null);
            }}
          >
            Nhóm học
          </button>
        </div>

        {/* DANH SÁCH LIÊN HỆ */}
        <div className="contact-list">
          {chatType === "friends" ? (
            <>
              {pendingRequests.length > 0 && (
                <div className="pending-requests-box">
                  <h4 className="pending-title">
                    Lời mời kết bạn ({pendingRequests.length})
                  </h4>
                  {pendingRequests.map((req) => (
                    <div className="request-item" key={req.id}>
                      <div className="request-info">
                        <div
                          className="request-avatar"
                          style={{
                            backgroundColor:
                              req.Requester.avatar_color || "#3b82f6",
                          }}
                        >
                          {req.Requester.avatar_text}
                        </div>
                        <b>
                          {req.Requester.full_name ||
                            req.Requester.email ||
                            "Người dùng"}
                        </b>
                      </div>
                      <div className="request-actions">
                        <button
                          className="request-btn btn-success"
                          onClick={() =>
                            handleRespondRequest(req.id, "accepted")
                          }
                        >
                          Chấp nhận
                        </button>
                        <button
                          className="request-btn btn-danger"
                          onClick={() =>
                            handleRespondRequest(req.id, "declined")
                          }
                        >
                          Từ chối
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {contacts.map((contact) => (
                <div
                  key={contact.id}
                  className={`contact-item ${selectedChat?.id === contact.id && !selectedChat?.isGroup ? "active" : ""}`}
                  onClick={() => setSelectedChat(contact)}
                >
                  <div
                    className="contact-avatar"
                    style={{
                      backgroundColor: contact.avatar_color || "#10b981",
                    }}
                  >
                    {contact.avatar_text || "U"}
                    {contact.is_online && <div className="online-dot"></div>}
                  </div>
                  <div className="contact-info">
                    <div className="contact-name-row">
                      <h4>
                        {contact.full_name || contact.email || "Người dùng"}
                      </h4>
                    </div>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <>
              {groups.map((group) => (
                <div
                  key={group.id}
                  className={`contact-item ${selectedChat?.id === group.id && selectedChat?.isGroup ? "active" : ""}`}
                  onClick={() => setSelectedChat({ ...group, isGroup: true })}
                >
                  <div
                    className="contact-avatar"
                    style={{ backgroundColor: "#8b5cf6" }}
                  >
                    <i className="fa-solid fa-users"></i>
                  </div>
                  <div className="contact-info">
                    <div className="contact-name-row">
                      <h4>{group.name}</h4>
                    </div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.75rem",
                        color: "#64748b",
                      }}
                    >
                      Vai trò:{" "}
                      <span
                        style={{
                          fontWeight: "bold",
                          color:
                            group.my_role === "admin" ? "#d97706" : "#475569",
                        }}
                      >
                        {group.my_role === "admin"
                          ? "Trưởng nhóm"
                          : "Thành viên"}
                      </span>
                    </p>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* KHUNG CHAT BÊN PHẢI */}
      <div className="chat-main">
        {!selectedChat ? (
          <div className="empty-chat-state">
            <div className="empty-icon">
              <i className="fa-regular fa-comments"></i>
            </div>
            <h3>Bắt đầu cuộc trò chuyện</h3>
            <p>
              Chọn một người bạn hoặc nhóm từ danh sách bên trái để kết nối,
              chia sẻ học liệu và cùng nhau tiến bộ nhé!
            </p>
          </div>
        ) : selectedChat.isGroup ? (
          <>
            <div className="chat-header group-chat-header">
              <div className="chat-header-info">
                <div className="header-avatar" style={{ backgroundColor: "#8b5cf6" }}>
                  <i className="fa-solid fa-users"></i>
                </div>
                <div>
                  <h4>{selectedChat.name}</h4>
                  <span className="status">
                    {selectedChat.description || "Nhóm học tập cộng đồng"}
                  </span>
                  <p className="group-meta">
                    <strong>{selectedChat.member_count || 0}</strong> thành viên • Vai trò: <strong>{selectedChat.my_role === "admin" ? "Trưởng nhóm" : "Thành viên"}</strong>
                  </p>
                </div>
              </div>
              <div className="group-header-actions">
                <button className="leave-group-btn" onClick={handleLeaveGroup}>
                  Rời nhóm
                </button>
              </div>
            </div>
            <div className="group-info-bar">
              <div>
                <p className="group-info-label">Mã Invite:</p>
                <div className="invite-code-row">
                  <span className="invite-code-text">{selectedChat.invite_code}</span>
                  <button
                    className="copy-btn"
                    onClick={() => {
                      navigator.clipboard.writeText(selectedChat.invite_code);
                      alert("Đã copy mã Invite!");
                    }}
                    title="Copy mã"
                  >
                    <i className="fa-regular fa-copy"></i>
                  </button>
                </div>
              </div>
            </div>
            <div className="chat-messages" ref={messagesContainerRef}>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`message-wrapper ${msg.isMine ? "mine" : "theirs"}`}
                >
                  <div className="message-bubble">
                    {msg.message_type === "image" && msg.file_url && (
                      <img
                        className="msg-image"
                        src={getFullUrl(msg.file_url)}
                        alt="Đính kèm"
                        onClick={() => window.open(getFullUrl(msg.file_url), "_blank")}
                      />
                    )}

                    {msg.message_type === "file" && msg.file_url && (() => {
                      const parts = msg.file_url.split('/');
                      const filename = parts[parts.length - 1];
                      const downloadUrl = `${BACKEND_URL}/api/community/download/${filename}`;
                      return (
                        <a
                          className="msg-file-link"
                          href={downloadUrl}
                          download={msg.file_name || ''}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => {
                            const url = downloadUrl;
                            if (!url) e.preventDefault();
                          }}
                        >
                          <i
                            className="fa-solid fa-file-lines"
                            style={{ fontSize: "1.5rem" }}
                          ></i>
                          <span
                            style={{ fontWeight: "bold", wordBreak: "break-all" }}
                          >
                            {msg.file_name}
                          </span>
                          <i
                            className="fa-solid fa-download"
                            style={{ marginLeft: "auto" }}
                          ></i>
                        </a>
                      );
                    })()}

                    {msg.content && <div>{msg.content}</div>}
                    <span className="message-time">
                      {new Date(msg.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="chat-input-container">
              {attachedFile && (
                <div className="file-preview-box">
                  {attachedFile.type.startsWith("image/") ? (
                    <img
                      className="file-preview-img"
                      src={URL.createObjectURL(attachedFile)}
                      alt="Preview"
                    />
                  ) : (
                    <i
                      className="fa-solid fa-file-zipper"
                      style={{ fontSize: "1.5rem", color: "#64748b" }}
                    ></i>
                  )}
                  <div className="file-preview-info">
                    <b>{attachedFile.name}</b>
                  </div>
                  <button
                    className="remove-file-btn"
                    onClick={() => setAttachedFile(null)}
                  >
                    <i
                      className="fa-solid fa-circle-xmark"
                      style={{ fontSize: "1.2rem" }}
                    ></i>
                  </button>
                </div>
              )}

              <div className="chat-input-row">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  style={{ display: "none" }}
                />
                <button
                  className="attach-btn"
                  onClick={() => fileInputRef.current.click()}
                  style={{ color: attachedFile ? "#3b82f6" : "#64748b" }}
                >
                  <i className="fa-solid fa-paperclip"></i>
                </button>
                <input
                  type="text"
                  placeholder={
                    attachedFile ? "Thêm lời nhắn..." : "Nhập tin nhắn..."
                  }
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                />
                <button className="send-btn" onClick={handleSendMessage}>
                  <i className="fa-solid fa-paper-plane"></i>
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="chat-header">
              <div className="chat-header-info">
                <div
                  className="header-avatar"
                  style={{
                    backgroundColor: selectedChat.avatar_color || "#10b981",
                  }}
                >
                  {selectedChat.avatar_text || "U"}
                </div>
                <div>
                  <h4>
                    {selectedChat.full_name ||
                      selectedChat.email ||
                      "Người dùng"}
                  </h4>
                  <span className="status">
                    {selectedChat.is_online ? "Đang hoạt động" : "Ngoại tuyến"}
                  </span>
                </div>
              </div>
              <div className="chat-options-container" ref={chatOptionsRef}>
                <button
                  className="chat-options-btn"
                  onClick={toggleChatOptionsMenu}
                  type="button"
                >
                  <i className="fa-solid fa-ellipsis-vertical"></i>
                </button>
                {showChatOptionsMenu && (
                  <div className="chat-options-menu">
                    <button
                      className="chat-options-item"
                      type="button"
                      onClick={handleTogglePinChat}
                    >
                      <i className="fa-solid fa-thumbtack"></i>
                      {isChatPinned ? "Bỏ ghim hội thoại" : "Ghim hội thoại"}
                    </button>
                    <button
                      className="chat-options-item"
                      type="button"
                      onClick={handleClassifyChat}
                    >
                      <i className="fa-solid fa-tags"></i>
                      Phân loại
                    </button>
                    <button
                      className="chat-options-item"
                      type="button"
                      onClick={handleMarkUnread}
                    >
                      <i className="fa-solid fa-envelope-open-text"></i>
                      Đánh dấu chưa đọc
                    </button>
                    <button
                      className="chat-options-item"
                      type="button"
                      onClick={handleAddToGroup}
                    >
                      <i className="fa-solid fa-users"></i>
                      Thêm vào nhóm
                    </button>
                    <button
                      className="chat-options-item"
                      type="button"
                      onClick={handleToggleMuteChat}
                    >
                      <i className="fa-solid fa-bell-slash"></i>
                      {isChatMuted ? "Bật thông báo" : "Tắt thông báo"}
                    </button>
                    <button
                      className="chat-options-item"
                      type="button"
                      onClick={handleHideChat}
                    >
                      <i className="fa-solid fa-eye-slash"></i>
                      Ẩn trò chuyện
                    </button>
                    <button
                      className="chat-options-item"
                      type="button"
                      onClick={handleToggleAutoDelete}
                    >
                      <i className="fa-solid fa-hourglass-half"></i>
                      {isAutoDeleteEnabled ? "Tắt tin nhắn tự xóa" : "Tin nhắn tự xóa"}
                    </button>
                    <div className="chat-options-divider" />
                    <button
                      className="chat-options-item"
                      type="button"
                      onClick={handleDeleteConversation}
                    >
                      <i className="fa-solid fa-trash"></i>
                      Xóa hội thoại
                    </button>
                    <button
                      className="chat-options-item"
                      type="button"
                      onClick={handleReportConversation}
                    >
                      <i className="fa-solid fa-flag"></i>
                      Báo xấu
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="chat-messages" ref={messagesContainerRef}>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`message-wrapper ${msg.isMine ? "mine" : "theirs"}`}
                >
                  <div className="message-bubble">
                    {msg.message_type === "image" && msg.file_url && (
                      <img
                        className="msg-image"
                        src={getFullUrl(msg.file_url)}
                        alt="Đính kèm"
                        onClick={() => window.open(getFullUrl(msg.file_url), "_blank")}
                      />
                    )}

                    {msg.message_type === "file" && msg.file_url && (() => {
                      const parts = msg.file_url.split('/');
                      const filename = parts[parts.length - 1];
                      const downloadUrl = `${BACKEND_URL}/api/community/download/${filename}`;
                      return (
                        <a
                          className="msg-file-link"
                          href={downloadUrl}
                          download={msg.file_name || ''}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => {
                            const url = downloadUrl;
                            if (!url) e.preventDefault();
                          }}
                        >
                          <i
                            className="fa-solid fa-file-lines"
                            style={{ fontSize: "1.5rem" }}
                          ></i>
                          <span
                            style={{ fontWeight: "bold", wordBreak: "break-all" }}
                          >
                            {msg.file_name}
                          </span>
                          <i
                            className="fa-solid fa-download"
                            style={{ marginLeft: "auto" }}
                          ></i>
                        </a>
                      );
                    })()}

                    {msg.content && <div>{msg.content}</div>}
                    <span className="message-time">
                      {new Date(msg.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="chat-input-container">
              {attachedFile && (
                <div className="file-preview-box">
                  {attachedFile.type.startsWith("image/") ? (
                    <img
                      className="file-preview-img"
                      src={URL.createObjectURL(attachedFile)}
                      alt="Preview"
                    />
                  ) : (
                    <i
                      className="fa-solid fa-file-zipper"
                      style={{ fontSize: "1.5rem", color: "#64748b" }}
                    ></i>
                  )}
                  <div className="file-preview-info">
                    <b>{attachedFile.name}</b>
                  </div>
                  <button
                    className="remove-file-btn"
                    onClick={() => setAttachedFile(null)}
                  >
                    <i
                      className="fa-solid fa-circle-xmark"
                      style={{ fontSize: "1.2rem" }}
                    ></i>
                  </button>
                </div>
              )}

              <div className="chat-input-row">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  style={{ display: "none" }}
                />
                <button
                  className="attach-btn"
                  onClick={() => fileInputRef.current.click()}
                  style={{ color: attachedFile ? "#3b82f6" : "#64748b" }}
                >
                  <i className="fa-solid fa-paperclip"></i>
                </button>
                <input
                  type="text"
                  placeholder={
                    attachedFile ? "Thêm lời nhắn..." : "Nhập tin nhắn..."
                  }
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                />
                <button className="send-btn" onClick={handleSendMessage}>
                  <i className="fa-solid fa-paper-plane"></i>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ChatTab;
