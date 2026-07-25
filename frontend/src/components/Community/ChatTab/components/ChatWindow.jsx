import React from "react";
import { useAuth } from "../../../../context/AuthContext"; // 👉 ĐÃ THÊM: Chìa khóa mở Két sắt
import "./ChatWindow.css";

const ChatWindow = ({ logic }) => {
  const { user } = useAuth(); // 👉 ĐÃ THÊM: Thò tay vào Két sắt lấy cục dữ liệu người dùng ra

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
    isChatMuted,
    isAutoDeleteEnabled,
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
    handleFileChange,
    handleSendMessage,
  } = logic;

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
    <div className="chat-main">
      {selectedChat.isGroup ? (
        <>
          <div className="chat-header group-chat-header">
            <div className="chat-header-info">
              <div
                className="header-avatar"
                style={{ backgroundColor: "#8b5cf6" }}
              >
                <i className="fa-solid fa-users"></i>
              </div>
              <div>
                <h4>{selectedChat.name}</h4>
                <span className="status">
                  {selectedChat.description || "Nhóm học tập"}
                </span>
                <p className="group-meta">
                  <strong>{selectedChat.member_count || 0}</strong> thành viên •
                  Vai trò:{" "}
                  <strong>
                    {selectedChat.my_role === "admin"
                      ? "Trưởng nhóm"
                      : "Thành viên"}
                  </strong>
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
                <span className="invite-code-text">
                  {selectedChat.invite_code}
                </span>
                <button
                  className="copy-btn"
                  onClick={() => {
                    navigator.clipboard.writeText(selectedChat.invite_code);
                    alert("Đã copy!");
                  }}
                >
                  <i className="fa-regular fa-copy"></i>
                </button>
              </div>
            </div>
          </div>
        </>
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
                <button className="chat-options-item" onClick={handleHideChat}>
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
        {messages.map((msg) => {
          // Lấy chữ cái đầu làm Avatar
          const avatarChar =
            msg.Sender?.avatar_text ||
            msg.Sender?.full_name?.charAt(0)?.toUpperCase() ||
            msg.Sender?.email?.charAt(0)?.toUpperCase() ||
            "U";

          // 👉 ĐÃ SỬA: Sức mạnh của Single Source of Truth
          // Không thèm tin tưởng biến isMine cũ nữa. Tự đối chiếu ID trong cơ sở dữ liệu với ID đang nằm trong Két sắt!
          const isMyMessage = user && msg.sender_id === user.id;

          return (
            <div
              key={msg.id}
              className={`message-wrapper ${isMyMessage ? "mine" : "theirs"}`}
            >
              {/* Avatar người gửi (Chỉ hiển thị cho tin nhắn của người khác) */}
              {!isMyMessage && (
                <div
                  className="message-sender-avatar"
                  style={{
                    backgroundColor: msg.Sender?.avatar_color || "#94a3b8",
                  }}
                  title={msg.Sender?.full_name || msg.Sender?.email}
                >
                  {avatarChar}
                </div>
              )}

              {/* Khối chứa tên và nội dung chat */}
              <div className="message-content-col">
                {/* Tên người gửi (Chỉ hiển thị trong Nhóm học và của người khác) */}
                {!isMyMessage && selectedChat.isGroup && (
                  <span className="sender-name">
                    {msg.Sender?.full_name ||
                      msg.Sender?.email?.split("@")[0] ||
                      "Thành viên"}
                  </span>
                )}

                <div className="message-bubble">
                  {msg.message_type === "image" && msg.file_url && (
                    <img
                      className="msg-image"
                      src={getFullUrl(msg.file_url)}
                      alt="Đính kèm"
                      onClick={() =>
                        window.open(getFullUrl(msg.file_url), "_blank")
                      }
                    />
                  )}
                  {msg.message_type === "file" && msg.file_url && (
                    <a
                      className="msg-file-link"
                      href={`${BACKEND_URL}/api/community/download/${msg.file_url.split("/").pop()}`}
                      download={msg.file_name || ""}
                      target="_blank"
                      rel="noopener noreferrer"
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
                  )}
                  {msg.content && <div>{msg.content}</div>}
                  <span className="message-time">
                    {new Date(msg.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
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
          <input
            type="text"
            placeholder={attachedFile ? "Thêm lời nhắn..." : "Nhập tin nhắn..."}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
          />
          <button className="send-btn" onClick={handleSendMessage}>
            <i className="fa-solid fa-paper-plane"></i>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
