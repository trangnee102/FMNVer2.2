import React from "react";
import "./ChatSidebar.css";

const ChatSidebar = ({ logic }) => {
  // Rút gọn các biến cần dùng từ logic
  const {
    chatType,
    setChatType,
    selectedChat,
    setSelectedChat,
    searchEmail,
    setSearchEmail,
    searchResult,
    searchError,
    isSearching,
    pendingRequests,
    contacts,
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
    handleSearchFriend,
    handleSendFriendRequest,
    handleRespondRequest,
    handleChatWithFriend,
    handleCreateGroup,
    handleJoinGroup,
    isInitialLoading,
  } = logic;

  // 👉 Hàm con hỗ trợ định dạng thời gian tin nhắn cuối
  const formatTime = (timeString) => {
    if (!timeString) return "";
    const date = new Date(timeString);
    return date.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="chat-sidebar">
      <div className="chat-sidebar-header">
        {chatType === "friends" ? (
          <>
            {/* 👉 ĐÃ FIX: Ô tìm kiếm màu xanh liền khối chuẩn phong cách Zalo/Messenger bằng Inline Style */}
            <div style={{ marginBottom: "12px" }}>
              <div style={{ 
                display: "flex", 
                width: "100%", 
                overflow: "hidden", 
                borderRadius: "12px", 
                border: "1px solid #e2e8f0", 
                backgroundColor: "#f8fafc",
                boxShadow: "0 1px 2px rgba(0,0,0,0.02)"
              }}>
                <input
                  type="email"
                  placeholder="Nhập Email tìm bạn..."
                  style={{
                    width: "100%",
                    backgroundColor: "transparent",
                    padding: "10px 14px",
                    fontSize: "0.9rem",
                    outline: "none",
                    border: "none",
                    color: "#1e293b"
                  }}
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearchFriend()}
                />
                <button
                  style={{
                    backgroundColor: "#3b82f6",
                    color: "#ffffff",
                    padding: "0 18px",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "background-color 0.2s",
                    opacity: isSearching ? 0.7 : 1
                  }}
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
              {searchError && (
                <p style={{ color: "#ef4444", fontSize: "13px", marginTop: "8px", fontWeight: "500", margin: "8px 0 0 0" }}>
                  {searchError}
                </p>
              )}
            </div>

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
                  searchResult.requester_id === searchResult.id ? (
                    <div className="request-action-row">
                      <button
                        className="action-btn btn-success"
                        onClick={() =>
                          handleRespondRequest(
                            searchResult.friendship_id,
                            "accepted",
                          )
                        }
                      >
                        Chấp nhận
                      </button>
                      <button
                        className="action-btn btn-danger"
                        onClick={() =>
                          handleRespondRequest(
                            searchResult.friendship_id,
                            "declined",
                          )
                        }
                      >
                        Từ chối
                      </button>
                    </div>
                  ) : (
                    <button className="action-btn btn-disabled" disabled>
                      Đang chờ xác nhận...
                    </button>
                  )
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
                  placeholder="Nhập mã Invite..."
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
                  placeholder="Tên nhóm..."
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                />
                <input
                  className="group-input"
                  type="text"
                  placeholder="Mô tả..."
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

      <div className="chat-tabs">
        <button
          className={chatType === "friends" ? "active" : ""}
          onClick={() => {
            setChatType("friends");
            setSelectedChat(null);
          }}
          style={{ position: "relative" }}
        >
          <i className="fa-solid fa-user-group" style={{ marginRight: "6px" }}></i> Bạn bè
          {pendingRequests?.length > 0 && (
            <span
              style={{
                position: "absolute",
                top: "4px",
                right: "8px",
                backgroundColor: "#ef4444",
                color: "white",
                fontSize: "10px",
                fontWeight: "bold",
                padding: "2px 6px",
                borderRadius: "10px",
              }}
            >
              {pendingRequests.length}
            </span>
          )}
        </button>
        <button
          className={chatType === "groups" ? "active" : ""}
          onClick={() => {
            setChatType("groups");
            setSelectedChat(null);
            setShowGroupAction(null);
          }}
        >
          <i className="fa-solid fa-people-roof" style={{ marginRight: "6px" }}></i> Nhóm học
        </button>
      </div>

      <div className="contact-list">
        {isInitialLoading ? (
          <div
            style={{
              padding: "30px 20px",
              textAlign: "center",
              color: "#64748b",
            }}
          >
            <i
              className="fa-solid fa-circle-notch fa-spin"
              style={{ fontSize: "1.5rem", marginBottom: "10px" }}
            ></i>
            <p style={{ margin: 0, fontSize: "0.95rem" }}>
              Đang tải danh bạ...
            </p>
          </div>
        ) : chatType === "friends" ? (
          <>
            {pendingRequests?.length > 0 && (
              <div className="pending-requests-box">
                <h4 className="pending-title">
                  Lời mời ({pendingRequests.length})
                </h4>
                {pendingRequests.map((req) => (
                  <div className="request-item" key={req.id}>
                    <div className="request-info">
                      <div
                        className="request-avatar"
                        style={{
                          backgroundColor:
                            req.Requester?.avatar_color || "#3b82f6",
                        }}
                      >
                        {req.Requester?.avatar_text || "U"}
                      </div>
                      <b>
                        {req.Requester?.full_name ||
                          req.Requester?.email ||
                          "Người dùng"}
                      </b>
                    </div>
                    <div className="request-actions">
                      <button
                        className="request-btn btn-success"
                        onClick={() => handleRespondRequest(req.id, "accepted")}
                      >
                        Chấp nhận
                      </button>
                      <button
                        className="request-btn btn-danger"
                        onClick={() => handleRespondRequest(req.id, "declined")}
                      >
                        Từ chối
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {contacts?.length > 0
              ? contacts.map((contact) => (
                  <div
                    key={contact.id}
                    className={`contact-item ${
                      !selectedChat?.isGroup &&
                      ((selectedChat?.conversation_id &&
                        selectedChat?.conversation_id === contact.conversation_id) ||
                        (!selectedChat?.conversation_id &&
                          selectedChat?.id === contact.id))
                        ? "active"
                        : ""
                    }`}
                    onClick={() => setSelectedChat({ ...contact, isGroup: false })}
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

                    <div
                      className="contact-info"
                      style={{ flex: 1, minWidth: 0 }}
                    >
                      <div
                        className="contact-name-row"
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <h4
                          style={{
                            margin: 0,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {contact.full_name || contact.email || "Người dùng"}
                        </h4>
                        {contact.last_message_time && (
                          <span
                            style={{
                              fontSize: "11px",
                              color: "#94a3b8",
                              whiteSpace: "nowrap",
                              marginLeft: "8px",
                            }}
                          >
                            {formatTime(contact.last_message_time)}
                          </span>
                        )}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginTop: "4px",
                        }}
                      >
                        <p
                          style={{
                            margin: 0,
                            fontSize: "13px",
                            color:
                              contact.unread_count > 0 ? "#1e293b" : "#64748b",
                            fontWeight:
                              contact.unread_count > 0 ? "600" : "400",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            flex: 1,
                          }}
                        >
                          {contact.last_message_preview}
                        </p>

                        {contact.unread_count > 0 && (
                          <div
                            style={{
                              backgroundColor: "#ef4444",
                              color: "white",
                              fontSize: "11px",
                              fontWeight: "bold",
                              padding: "2px 6px",
                              borderRadius: "10px",
                              minWidth: "18px",
                              textAlign: "center",
                              marginLeft: "8px",
                            }}
                          >
                            {contact.unread_count > 99
                              ? "99+"
                              : contact.unread_count}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              : pendingRequests?.length === 0 && (
                  <p
                    style={{
                      textAlign: "center",
                      color: "#94a3b8",
                      marginTop: "30px",
                      fontSize: "0.9rem",
                    }}
                  >
                    Chưa có bạn bè nào. <br /> Hãy tìm kiếm và kết bạn nhé!
                  </p>
                )}
          </>
        ) : (
          <>
            {groups?.length > 0 ? (
              groups.map((group) => (
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

                  <div
                    className="contact-info"
                    style={{ flex: 1, minWidth: 0 }}
                  >
                    <div
                      className="contact-name-row"
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <h4
                        style={{
                          margin: 0,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {group.name}
                      </h4>
                      {group.last_message_time && (
                        <span
                          style={{
                            fontSize: "11px",
                            color: "#94a3b8",
                            whiteSpace: "nowrap",
                            marginLeft: "8px",
                          }}
                        >
                          {formatTime(group.last_message_time)}
                        </span>
                      )}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginTop: "4px",
                      }}
                    >
                      <p
                        style={{
                          margin: 0,
                          fontSize: "13px",
                          color: group.unread_count > 0 ? "#1e293b" : "#64748b",
                          fontWeight: group.unread_count > 0 ? "600" : "400",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          flex: 1,
                        }}
                      >
                        {group.last_message_preview}
                      </p>

                      {group.unread_count > 0 && (
                        <div
                          style={{
                            backgroundColor: "#ef4444",
                            color: "white",
                            fontSize: "11px",
                            fontWeight: "bold",
                            padding: "2px 6px",
                            borderRadius: "10px",
                            minWidth: "18px",
                            textAlign: "center",
                            marginLeft: "8px",
                          }}
                        >
                          {group.unread_count > 99 ? "99+" : group.unread_count}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p
                style={{
                  textAlign: "center",
                  color: "#94a3b8",
                  marginTop: "30px",
                  fontSize: "0.9rem",
                }}
              >
                Bạn chưa tham gia nhóm nào.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ChatSidebar;
