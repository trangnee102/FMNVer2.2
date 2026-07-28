import React, { useState } from "react";
import { useAuth } from "../../../../context/AuthContext";
import GroupInfoSidebar from "./GroupInfoSidebar";
import RenameGroupModal from "./RenameGroupModal";
import MembersGroupModal from "./MembersGroupModal";
import "./ChatWindow.css";

const ChatWindow = ({ logic }) => {
  const { user } = useAuth();
  const [showGroupInfo, setShowGroupInfo] = useState(false);

  const {
    selectedChat,
    messages,
    messagesContainerRef,
    BACKEND_URL,
    getFullUrl,
    attachedFile,
    setAttachedFile,
    fileInputRef,
    message,
    setMessage,
    showChatOptionsMenu,
    chatOptionsRef,
    isChatPinned,
    toggleChatOptionsMenu,
    handleTogglePinChat,
    handleHideChat,
    handleDeleteConversation,
    handleLeaveGroup,
    handleFileChange,
    handleSendMessage,

    // 👉 ĐÃ THÊM: Các state và hàm quản lý sự kiện "Đang gõ..."
    typingUsers,
    handleTyping,

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
  } = logic;

  // 👉 HÀM PHỤ TRỢ: Kiểm tra xem 2 ngày có cùng nhau không
  const isSameDay = (date1, date2) => {
    if (!date1 || !date2) return false;
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return (
      d1.getDate() === d2.getDate() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getFullYear() === d2.getFullYear()
    );
  };

  // 👉 HÀM PHỤ TRỢ: Định dạng ngày hiển thị (VD: "Hôm nay", "T3 21/07/2026")
  const formatDateDivider = (dateString) => {
    const msgDate = new Date(dateString);
    const today = new Date();

    if (isSameDay(msgDate, today)) {
      return "Hôm nay";
    }

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (isSameDay(msgDate, yesterday)) {
      return "Hôm qua";
    }

    // Trả về định dạng: T3 21/07/2026
    const days = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
    const dayOfWeek = days[msgDate.getDay()];
    const date = msgDate.getDate().toString().padStart(2, "0");
    const month = (msgDate.getMonth() + 1).toString().padStart(2, "0");
    const year = msgDate.getFullYear();

    return `${dayOfWeek} ${date}/${month}/${year}`;
  };

  // Hàm xử lý khi người dùng gõ phím
  const onInputChange = (e) => {
    setMessage(e.target.value);
    if (handleTyping) handleTyping(); // Báo cáo cho hệ thống là đang gõ
  };

  if (!selectedChat) {
    return (
      <div className="chat-main">
        <div className="empty-chat-state">
          <div className="empty-icon">
            <i className="fa-regular fa-comments"></i>
          </div>
          <h3>Bắt đầu cuộc trò chuyện</h3>
          <p>
            Chọn một người bạn hoặc nhóm từ danh sách bên trái để kết nối nhé!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-main-wrapper">
      <div className="chat-conversation-area">
        {selectedChat.isGroup ? (
          <div
            className="chat-header group-chat-header"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div className="chat-header-info">
              <div
                className="header-avatar"
                style={{ backgroundColor: "#8b5cf6" }}
              >
                <i className="fa-solid fa-users"></i>
              </div>
              <div>
                <h4>{selectedChat.name}</h4>
                <p
                  className="group-meta"
                  style={{
                    margin: "2px 0 0 0",
                    color: "#64748b",
                    fontSize: "0.85rem",
                  }}
                >
                  <i
                    className="fa-solid fa-user-group"
                    style={{ marginRight: "5px" }}
                  ></i>
                  {selectedChat.member_count || 1} thành viên
                </p>
              </div>
            </div>

            <div style={{ marginLeft: "auto" }}>
              <button
                className={`group-info-toggle-btn ${showGroupInfo ? "active" : ""}`}
                onClick={() => setShowGroupInfo(!showGroupInfo)}
                title="Thông tin nhóm"
              >
                <i
                  className="fa-solid fa-circle-info"
                  style={{
                    fontSize: "1.4rem",
                    color: showGroupInfo ? "#3b82f6" : "#64748b",
                  }}
                ></i>
              </button>
            </div>
          </div>
        ) : (
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
                  {selectedChat.full_name || selectedChat.email || "Người dùng"}
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
              >
                <i className="fa-solid fa-ellipsis-vertical"></i>
              </button>
              {showChatOptionsMenu && (
                <div className="chat-options-menu">
                  <button
                    className="chat-options-item"
                    onClick={handleTogglePinChat}
                  >
                    <i className="fa-solid fa-thumbtack"></i>{" "}
                    {isChatPinned ? "Bỏ ghim" : "Ghim"}
                  </button>
                  <button
                    className="chat-options-item"
                    onClick={handleHideChat}
                  >
                    <i className="fa-solid fa-eye-slash"></i> Ẩn trò chuyện
                  </button>
                  <div className="chat-options-divider" />
                  <button
                    className="chat-options-item"
                    onClick={handleDeleteConversation}
                  >
                    <i className="fa-solid fa-trash"></i> Xóa hội thoại
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="chat-messages" ref={messagesContainerRef}>
          {messages.map((msg, index) => {
            const avatarChar =
              msg.Sender?.avatar_text ||
              msg.Sender?.full_name?.charAt(0)?.toUpperCase() ||
              msg.Sender?.email?.charAt(0)?.toUpperCase() ||
              "U";

            const isMyMessage =
              msg.isMine || (user && msg.sender_id === user.id);

            // 👉 THUẬT TOÁN 1: XÁC ĐỊNH VÁCH NGĂN NGÀY
            const prevMsg = messages[index - 1];
            const showDateDivider =
              !prevMsg || !isSameDay(prevMsg.created_at, msg.created_at);

            // 👉 THUẬT TOÁN 2: XÁC ĐỊNH GỘP TIN NHẮN (Nhìn xuống người kế tiếp)
            const nextMsg = messages[index + 1];
            // Sẽ gộp nếu: Tin nhắn tiếp theo do CÙNG MỘT NGƯỜI gửi VÀ gửi trong CÙNG MỘT NGÀY
            const isGroupedWithNext =
              nextMsg &&
              nextMsg.sender_id === msg.sender_id &&
              isSameDay(msg.created_at, nextMsg.created_at);

            return (
              <React.Fragment key={msg.id}>
                {/* HIỂN THỊ VÁCH NGĂN NGÀY NẾU CẦN */}
                {showDateDivider && (
                  <div
                    className="date-divider-wrapper"
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      margin: "20px 0",
                    }}
                  >
                    <span
                      className="date-divider-badge"
                      style={{
                        backgroundColor: "#e2e8f0",
                        color: "#64748b",
                        fontSize: "0.75rem",
                        padding: "4px 12px",
                        borderRadius: "12px",
                        fontWeight: 500,
                      }}
                    >
                      {formatDateDivider(msg.created_at)}
                    </span>
                  </div>
                )}

                <div
                  className={`message-wrapper ${isMyMessage ? "mine" : "theirs"} ${isGroupedWithNext ? "grouped" : ""}`}
                  style={{
                    opacity: msg.isSending ? 0.6 : 1,
                    marginBottom: isGroupedWithNext ? "2px" : "16px", // 👉 Thu hẹp khoảng cách nếu bị gộp
                  }}
                >
                  {!isMyMessage && (
                    <div
                      className="message-sender-avatar"
                      style={{
                        backgroundColor: msg.Sender?.avatar_color || "#94a3b8",
                        opacity: isGroupedWithNext ? 0 : 1, // 👉 Giấu Avatar nếu tin nhắn chưa phải là chốt sổ
                      }}
                      title={msg.Sender?.full_name || msg.Sender?.email}
                    >
                      {avatarChar}
                    </div>
                  )}

                  <div className="message-content-col">
                    {!isMyMessage && selectedChat.isGroup && (
                      <span className="sender-name">
                        {msg.Sender?.full_name ||
                          msg.Sender?.email?.split("@")[0] ||
                          "Thành viên"}
                      </span>
                    )}

                    <div
                      className="message-bubble"
                      style={{
                        borderBottomRightRadius:
                          isMyMessage && isGroupedWithNext ? "16px" : undefined,
                        borderBottomLeftRadius:
                          !isMyMessage && isGroupedWithNext
                            ? "16px"
                            : undefined,
                      }}
                    >
                      {msg.message_type === "image" && msg.file_url && (
                        <img
                          className="msg-image"
                          src={
                            msg.isSending
                              ? msg.file_url
                              : getFullUrl(msg.file_url)
                          }
                          alt="Đính kèm"
                          onClick={() =>
                            !msg.isSending &&
                            window.open(getFullUrl(msg.file_url), "_blank")
                          }
                        />
                      )}
                      {msg.message_type === "file" && msg.file_url && (
                        <a
                          className="msg-file-link"
                          href={
                            msg.isSending
                              ? "#"
                              : `${BACKEND_URL}/api/community/download/${msg.file_url.split("/").pop()}`
                          }
                          download={msg.file_name || ""}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <i
                            className="fa-solid fa-file-lines"
                            style={{ fontSize: "1.5rem" }}
                          ></i>
                          <span
                            style={{
                              fontWeight: "bold",
                              wordBreak: "break-all",
                            }}
                          >
                            {msg.file_name}
                          </span>
                          <i
                            className="fa-solid fa-download"
                            style={{ marginLeft: "auto" }}
                          ></i>
                        </a>
                      )}
                      {msg.content && <div>{msg.content}</div>}
                    </div>

                    {/* 👉 CHỈ HIỆN THỜI GIAN/TRẠNG THÁI Ở TIN NHẮN CUỐI CÙNG CỦA KHỐI (Khi không bị gộp nữa) */}
                    {!isGroupedWithNext && (
                      <div className="message-meta-footer">
                        <span className="message-time">
                          {new Date(msg.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>

                        {isMyMessage && (
                          <span className="message-status-icon">
                            {msg.isSending ? (
                              <span title="Đang gửi...">
                                <i className="fa-solid fa-paper-plane"></i> Đang
                                gửi...
                              </span>
                            ) : (
                              <span title="Đã nhận">Đã nhận</span>
                            )}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>

        {/* 👉 ĐÃ THÊM: KHU VỰC HIỂN THỊ "ĐANG GÕ..." BÊN TRONG KHUNG CHAT */}
        {typingUsers && typingUsers.length > 0 && (
          <div
            className="typing-indicator-wrapper"
            style={{
              padding: "0 20px 10px 20px",
              fontSize: "0.85rem",
              color: "#64748b",
              fontStyle: "italic",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <div className="typing-dots">
              <span className="dot">.</span>
              <span className="dot">.</span>
              <span className="dot">.</span>
            </div>
            <span>
              {typingUsers.length === 1
                ? `${typingUsers[0]} đang gõ...`
                : `${typingUsers.length} người đang gõ...`}
            </span>
          </div>
        )}

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
                <i className="fa-solid fa-circle-xmark"></i>
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

            {/* 👉 ĐÃ SỬA: Bắt sự kiện onChange để phát tín hiệu Typing */}
            <input
              type="text"
              placeholder={
                attachedFile ? "Thêm lời nhắn..." : "Nhập tin nhắn..."
              }
              value={message}
              onChange={onInputChange}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSendMessage();
              }}
            />
            <button className="send-btn" onClick={handleSendMessage}>
              <i className="fa-solid fa-paper-plane"></i>
            </button>
          </div>
        </div>
      </div>

      {selectedChat.isGroup && showGroupInfo && (
        <GroupInfoSidebar
          selectedChat={selectedChat}
          onClose={() => setShowGroupInfo(false)}
          handleLeaveGroup={handleLeaveGroup}
          onViewMembers={handleOpenMembersModal}
          onAddMember={handleOpenMembersModal}
          onRenameGroup={() => setIsRenameModalOpen(true)}
          onClearHistory={handleClearHistory}
        />
      )}

      <RenameGroupModal
        isOpen={isRenameModalOpen}
        onClose={() => setIsRenameModalOpen(false)}
        currentName={selectedChat?.name}
        onRename={handleRenameGroup}
      />

      <MembersGroupModal
        isOpen={isMembersModalOpen}
        onClose={() => setIsMembersModalOpen(false)}
        members={groupMembers}
        onAddMember={handleAddMember}
        isLoading={isMembersLoading}
      />
    </div>
  );
};

export default ChatWindow;
