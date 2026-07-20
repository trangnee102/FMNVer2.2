import React, { useState, useEffect } from "react";
import "./ChatTab.css";
import { communityAPI } from "../../services/api";

const ChatTab = () => {
  const [chatType, setChatType] = useState("friends");
  const [selectedChat, setSelectedChat] = useState(null);
  const [message, setMessage] = useState("");

  const [contacts, setContacts] = useState([]);
  const [messages, setMessages] = useState([]);

  // Các state phục vụ tính năng tìm kiếm
  const [searchEmail, setSearchEmail] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [searchError, setSearchError] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // State chứa danh sách lời mời kết bạn đang chờ duyệt
  const [pendingRequests, setPendingRequests] = useState([]);

  // 👉 ĐÃ THÊM: Các state phục vụ tính năng Nhóm Học
  const [groups, setGroups] = useState([]);
  const [showGroupAction, setShowGroupAction] = useState(null); // 'create' | 'join' | null
  const [groupName, setGroupName] = useState("");
  const [groupDesc, setGroupDesc] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [groupError, setGroupError] = useState("");

  // 1. Tải danh sách bạn bè, lời mời & NHÓM HỌC
  useEffect(() => {
    const fetchData = async () => {
      try {
        const contactsData = await communityAPI.getContacts();
        setContacts(contactsData);

        const requestsRes = await communityAPI.getPendingRequests();
        if (requestsRes.success) {
          setPendingRequests(requestsRes.data);
        }

        // 👉 Tải danh sách Nhóm học
        const groupsRes = await communityAPI.getMyGroups();
        if (groupsRes.success) {
          setGroups(groupsRes.data);
        }
      } catch (error) {
        console.error("Lỗi tải dữ liệu:", error);
      }
    };
    fetchData();
  }, [chatType]);

  // 2. Tải lịch sử tin nhắn (Chỉ gọi API nếu là chat Bạn bè)
  useEffect(() => {
    if (!selectedChat || selectedChat.isGroup) return; // Nếu là Nhóm thì bỏ qua
    const fetchMessages = async () => {
      try {
        const data = await communityAPI.getMessages(selectedChat.id);
        setMessages(data);
      } catch (error) {
        console.error("Lỗi tải tin nhắn:", error);
      }
    };
    fetchMessages();
  }, [selectedChat]);

  // 3. Gửi tin nhắn
  const handleSendMessage = async () => {
    if (!message.trim() || !selectedChat || selectedChat.isGroup) return;
    try {
      const sentMsg = await communityAPI.sendMessage(selectedChat.id, message);
      setMessages((prev) => [...prev, sentMsg]);
      setMessage("");
    } catch (error) {
      console.error("Lỗi gửi tin nhắn:", error);
    }
  };

  // 4. Xử lý tìm kiếm bạn bè
  const handleSearchFriend = async () => {
    if (!searchEmail.trim()) {
      setSearchError("Vui lòng nhập Email để tìm kiếm!");
      return;
    }
    setIsSearching(true);
    setSearchError("");
    setSearchResult(null);

    try {
      const response = await communityAPI.searchUser(searchEmail);
      if (response.success && response.data) {
        setSearchResult(response.data);
      } else {
        setSearchError(response.message || "Không tìm thấy người dùng này!");
      }
    } catch (error) {
      setSearchError("Lỗi kết nối khi tìm kiếm.");
    } finally {
      setIsSearching(false);
    }
  };

  // Hàm Gửi lời mời kết bạn
  const handleSendFriendRequest = async () => {
    if (!searchResult) return;
    try {
      const response = await communityAPI.sendFriendRequest(searchResult.id);
      if (response.success) {
        alert("Đã gửi lời mời kết bạn thành công!");
        setSearchResult((prev) => ({ ...prev, friendship_status: "pending" }));
      } else {
        setSearchError(response.message);
      }
    } catch (error) {
      setSearchError("Lỗi khi gửi lời mời!");
    }
  };

  // Hàm Phản hồi lời mời
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
      console.error("Lỗi khi phản hồi lời mời:", error);
    }
  };

  // Hàm chuyển sang chat
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

  // =========================================
  // 👉 ĐÃ THÊM: CÁC HÀM XỬ LÝ GIAO DIỆN NHÓM
  // =========================================
  const handleCreateGroup = async () => {
    if (!groupName.trim())
      return setGroupError("Tên nhóm không được bỏ trống!");
    setGroupError("");
    try {
      const res = await communityAPI.createGroup(groupName, groupDesc);
      if (res.success) {
        alert("🎉 Đã tạo nhóm thành công!");
        const groupsRes = await communityAPI.getMyGroups();
        if (groupsRes.success) setGroups(groupsRes.data);
        setShowGroupAction(null);
        setGroupName("");
        setGroupDesc("");
      } else {
        setGroupError(res.message);
      }
    } catch (e) {
      setGroupError("Lỗi hệ thống khi tạo nhóm.");
    }
  };

  const handleJoinGroup = async () => {
    if (!inviteCode.trim()) return setGroupError("Vui lòng nhập mã Invite!");
    setGroupError("");
    try {
      const res = await communityAPI.joinGroup(inviteCode);
      if (res.success) {
        alert("🎉 Đã tham gia nhóm thành công!");
        const groupsRes = await communityAPI.getMyGroups();
        if (groupsRes.success) setGroups(groupsRes.data);
        setShowGroupAction(null);
        setInviteCode("");
      } else {
        setGroupError(res.message);
      }
    } catch (e) {
      setGroupError("Lỗi hệ thống khi tham gia nhóm.");
    }
  };

  return (
    <div className="chat-tab-container">
      {/* SIDEBAR BÊN TRÁI */}
      <div className="chat-sidebar">
        {/* THANH TÌM KIẾM / HÀNH ĐỘNG */}
        <div
          className="chat-sidebar-header"
          style={{
            flexDirection: "column",
            gap: "10px",
            alignItems: "stretch",
          }}
        >
          {chatType === "friends" ? (
            // GIAO DIỆN TÌM BẠN BÈ
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
                  style={{
                    flex: 1,
                    padding: "8px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "8px 0 0 8px",
                    outline: "none",
                  }}
                />
                <button
                  onClick={handleSearchFriend}
                  disabled={isSearching}
                  style={{
                    padding: "8px 12px",
                    background: "#3b82f6",
                    color: "white",
                    border: "none",
                    borderRadius: "0 8px 8px 0",
                    cursor: "pointer",
                  }}
                >
                  {isSearching ? (
                    <i className="fa-solid fa-spinner fa-spin"></i>
                  ) : (
                    <i className="fa-solid fa-magnifying-glass"></i>
                  )}
                </button>
              </div>

              {searchError && (
                <p
                  style={{ color: "#ef4444", fontSize: "0.8rem", margin: "0" }}
                >
                  {searchError}
                </p>
              )}

              {searchResult && (
                <div
                  style={{
                    background: "#f0fdf4",
                    border: "1px solid #bbf7d0",
                    padding: "10px",
                    borderRadius: "8px",
                    marginTop: "5px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      marginBottom: "8px",
                    }}
                  >
                    <div
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        background: searchResult.avatar_color || "#10b981",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        color: "white",
                        fontWeight: "bold",
                      }}
                    >
                      {searchResult.avatar_text || "U"}
                    </div>
                    <div>
                      <h4
                        style={{
                          margin: 0,
                          fontSize: "0.9rem",
                          color: "#166534",
                        }}
                      >
                        {searchResult.full_name ||
                          searchResult.email ||
                          "Người dùng"}
                      </h4>
                      <p
                        style={{
                          margin: 0,
                          fontSize: "0.75rem",
                          color: "#64748b",
                        }}
                      >
                        {searchResult.email}
                      </p>
                    </div>
                  </div>

                  {searchResult.friendship_status === "accepted" ? (
                    <button
                      onClick={handleChatWithFriend}
                      style={{
                        width: "100%",
                        padding: "6px",
                        background: "#3b82f6",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        fontSize: "0.85rem",
                        cursor: "pointer",
                      }}
                    >
                      Nhắn tin
                    </button>
                  ) : searchResult.friendship_status === "pending" ? (
                    <button
                      disabled
                      style={{
                        width: "100%",
                        padding: "6px",
                        background: "#cbd5e1",
                        color: "#475569",
                        border: "none",
                        borderRadius: "4px",
                        fontSize: "0.85rem",
                        cursor: "not-allowed",
                      }}
                    >
                      Đang chờ xác nhận...
                    </button>
                  ) : (
                    <button
                      onClick={handleSendFriendRequest}
                      style={{
                        width: "100%",
                        padding: "6px",
                        background: "#10b981",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        fontSize: "0.85rem",
                        cursor: "pointer",
                      }}
                    >
                      Gửi lời mời kết bạn
                    </button>
                  )}
                </div>
              )}
            </>
          ) : (
            // 👉 ĐÃ THÊM: GIAO DIỆN THAO TÁC NHÓM
            <>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={() => {
                    setShowGroupAction(
                      showGroupAction === "join" ? null : "join",
                    );
                    setGroupError("");
                  }}
                  style={{
                    flex: 1,
                    padding: "8px",
                    background:
                      showGroupAction === "join" ? "#3b82f6" : "#e2e8f0",
                    color: showGroupAction === "join" ? "white" : "#475569",
                    border: "none",
                    borderRadius: "6px",
                    fontWeight: "bold",
                    cursor: "pointer",
                  }}
                >
                  <i className="fa-solid fa-right-to-bracket"></i> Vào nhóm
                </button>
                <button
                  onClick={() => {
                    setShowGroupAction(
                      showGroupAction === "create" ? null : "create",
                    );
                    setGroupError("");
                  }}
                  style={{
                    flex: 1,
                    padding: "8px",
                    background:
                      showGroupAction === "create" ? "#10b981" : "#e2e8f0",
                    color: showGroupAction === "create" ? "white" : "#475569",
                    border: "none",
                    borderRadius: "6px",
                    fontWeight: "bold",
                    cursor: "pointer",
                  }}
                >
                  <i className="fa-solid fa-plus"></i> Tạo nhóm
                </button>
              </div>

              {showGroupAction === "join" && (
                <div
                  style={{
                    background: "#eff6ff",
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid #bfdbfe",
                  }}
                >
                  <input
                    type="text"
                    placeholder="Nhập mã Invite (VD: GRP-ABC...)"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px",
                      marginBottom: "8px",
                      borderRadius: "4px",
                      border: "1px solid #93c5fd",
                      outline: "none",
                    }}
                  />
                  <button
                    onClick={handleJoinGroup}
                    style={{
                      width: "100%",
                      padding: "8px",
                      background: "#3b82f6",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      fontWeight: "bold",
                      cursor: "pointer",
                    }}
                  >
                    Tham gia ngay
                  </button>
                </div>
              )}

              {showGroupAction === "create" && (
                <div
                  style={{
                    background: "#f0fdf4",
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid #bbf7d0",
                  }}
                >
                  <input
                    type="text"
                    placeholder="Tên nhóm học..."
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px",
                      marginBottom: "8px",
                      borderRadius: "4px",
                      border: "1px solid #86efac",
                      outline: "none",
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Mô tả ngắn..."
                    value={groupDesc}
                    onChange={(e) => setGroupDesc(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px",
                      marginBottom: "8px",
                      borderRadius: "4px",
                      border: "1px solid #86efac",
                      outline: "none",
                    }}
                  />
                  <button
                    onClick={handleCreateGroup}
                    style={{
                      width: "100%",
                      padding: "8px",
                      background: "#10b981",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      fontWeight: "bold",
                      cursor: "pointer",
                    }}
                  >
                    Hoàn tất tạo
                  </button>
                </div>
              )}
              {groupError && (
                <p
                  style={{ color: "#ef4444", fontSize: "0.8rem", margin: "0" }}
                >
                  {groupError}
                </p>
              )}
            </>
          )}
        </div>

        {/* CÁC TAB CHUYỂN ĐỔI */}
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

        {/* DANH SÁCH BÊN TRÁI */}
        <div className="contact-list">
          {chatType === "friends" ? (
            <>
              {/* Lời mời kết bạn */}
              {pendingRequests.length > 0 && (
                <div
                  style={{
                    background: "#fffbeb",
                    padding: "10px",
                    borderBottom: "1px solid #fde68a",
                  }}
                >
                  <h4
                    style={{
                      fontSize: "0.85rem",
                      color: "#b45309",
                      margin: "0 0 10px 0",
                    }}
                  >
                    Lời mời kết bạn ({pendingRequests.length})
                  </h4>
                  {pendingRequests.map((req) => (
                    <div
                      key={req.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "8px",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "0.85rem",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <div
                          style={{
                            width: "24px",
                            height: "24px",
                            borderRadius: "50%",
                            background: req.Requester.avatar_color || "#3b82f6",
                            color: "#fff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "0.7rem",
                            fontWeight: "bold",
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
                      <div style={{ display: "flex", gap: "5px" }}>
                        <button
                          onClick={() =>
                            handleRespondRequest(req.id, "accepted")
                          }
                          style={{
                            background: "#10b981",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            padding: "4px 8px",
                            cursor: "pointer",
                            fontSize: "0.75rem",
                          }}
                        >
                          Chấp nhận
                        </button>
                        <button
                          onClick={() =>
                            handleRespondRequest(req.id, "declined")
                          }
                          style={{
                            background: "#ef4444",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            padding: "4px 8px",
                            cursor: "pointer",
                            fontSize: "0.75rem",
                          }}
                        >
                          Từ chối
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Danh sách Bạn bè */}
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
              {contacts.length === 0 && pendingRequests.length === 0 && (
                <p
                  style={{
                    textAlign: "center",
                    color: "#94a3b8",
                    fontSize: "0.9rem",
                    marginTop: "20px",
                  }}
                >
                  Chưa có bạn bè nào.
                </p>
              )}
            </>
          ) : (
            // 👉 ĐÃ THÊM: DANH SÁCH NHÓM HỌC
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
              {groups.length === 0 && (
                <p
                  style={{
                    textAlign: "center",
                    color: "#94a3b8",
                    fontSize: "0.9rem",
                    marginTop: "20px",
                  }}
                >
                  Cậu chưa tham gia nhóm nào.
                </p>
              )}
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
          // 👉 ĐÃ THÊM: MÀN HÌNH QUẢN LÝ NHÓM
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              background: "#f8fafc",
              padding: "20px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: "80px",
                height: "80px",
                borderRadius: "16px",
                background: "#8b5cf6",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "2rem",
                marginBottom: "20px",
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
              }}
            >
              <i className="fa-solid fa-users"></i>
            </div>
            <h2 style={{ color: "#1e293b", marginBottom: "10px" }}>
              {selectedChat.name}
            </h2>
            <p
              style={{
                color: "#475569",
                maxWidth: "400px",
                marginBottom: "20px",
              }}
            >
              {selectedChat.description ||
                "Nhóm học tập cộng đồng trên FOGETMENOT"}
            </p>

            <div
              style={{
                background: "white",
                padding: "20px",
                borderRadius: "12px",
                border: "1px dashed #cbd5e1",
                width: "100%",
                maxWidth: "400px",
              }}
            >
              <p
                style={{
                  margin: "0 0 10px 0",
                  color: "#64748b",
                  fontSize: "0.9rem",
                }}
              >
                Mã Invite để mời bạn bè tham gia:
              </p>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                }}
              >
                <span
                  style={{
                    fontSize: "1.5rem",
                    fontWeight: "900",
                    letterSpacing: "2px",
                    color: "#4f46e5",
                  }}
                >
                  {selectedChat.invite_code}
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(selectedChat.invite_code);
                    alert("Đã copy mã Invite!");
                  }}
                  style={{
                    background: "#e2e8f0",
                    border: "none",
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    cursor: "pointer",
                    color: "#475569",
                  }}
                  title="Copy mã"
                >
                  <i className="fa-regular fa-copy"></i>
                </button>
              </div>
            </div>

            <div
              style={{
                marginTop: "40px",
                padding: "15px",
                background: "#eff6ff",
                borderRadius: "8px",
                color: "#1e40af",
                fontSize: "0.9rem",
              }}
            >
              <i
                className="fa-solid fa-tools"
                style={{ marginRight: "8px" }}
              ></i>
              Tính năng <b>Nhắn tin & Chia sẻ Flashcard trong Nhóm</b> sẽ được
              cập nhật ở phiên bản tiếp theo!
            </div>
          </div>
        ) : (
          // GIAO DIỆN CHAT 1-1 VỚI BẠN BÈ (GIỮ NGUYÊN)
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
              <button className="chat-options-btn">
                <i className="fa-solid fa-ellipsis-vertical"></i>
              </button>
            </div>

            <div className="chat-messages">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`message-wrapper ${msg.isMine ? "mine" : "theirs"}`}
                >
                  <div className="message-bubble">
                    {msg.content}
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

            <div className="chat-input-area">
              <button className="share-deck-btn" title="Chia sẻ bộ thẻ">
                <i className="fa-solid fa-layer-group"></i>
              </button>
              <input
                type="text"
                placeholder="Nhập tin nhắn..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              />
              <button className="send-btn" onClick={handleSendMessage}>
                <i className="fa-solid fa-paper-plane"></i>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ChatTab;
