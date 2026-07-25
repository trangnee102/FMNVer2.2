import React from "react";
import "./ChatSidebar.css"; // 👉 Thêm dòng này để nhận diện file CSS vừa tạo

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
  } = logic;

  return (
    <div className="chat-sidebar">
      <div className="chat-sidebar-header">
        {chatType === "friends" ? (
          <>
            <div className="chat-search">
              <input
                type="email"
                placeholder="Nhập Email tìm bạn..."
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearchFriend()}
              />
              <button
                className="send-btn"
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
                    // Giữ inline CSS vì màu nền là dữ liệu động tải từ DB
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

      <div className="contact-list">
        {chatType === "friends" ? (
          <>
            {pendingRequests.length > 0 && (
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
            {contacts.map((contact) => (
              <div
                key={contact.id}
                className={`contact-item ${selectedChat?.id === contact.id && !selectedChat?.isGroup ? "active" : ""}`}
                onClick={() => setSelectedChat(contact)}
              >
                <div
                  className="contact-avatar"
                  style={{ backgroundColor: contact.avatar_color || "#10b981" }}
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
                  <p className="contact-role-text">
                    Vai trò:{" "}
                    <span
                      className="role-highlight"
                      // Màu text của vai trò giữ inline vì thay đổi theo admin/member
                      style={{
                        color:
                          group.my_role === "admin" ? "#d97706" : "#475569",
                      }}
                    >
                      {group.my_role === "admin" ? "Trưởng nhóm" : "Thành viên"}
                    </span>
                  </p>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default ChatSidebar;
