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

    // Các state và hàm quản lý sự kiện "Đang gõ..."
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

  // HÀM PHỤ TRỢ: Kiểm tra xem 2 ngày có cùng nhau không
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

  // HÀM PHỤ TRỢ: Định dạng ngày hiển thị (VD: "Hôm nay", "T3 21/07/2026")
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

  // 👉 ĐÃ FIX: Khung chờ (Empty State) được bọc đầy đủ flex wrapper để lấp đầy toàn bộ diện tích bên phải
  if (!selectedChat) {
    return (
      <div className="chat-main-wrapper" style={{ display: "flex", flex: 1, height: "100%", overflow: "hidden", background: "#fff" }}>
        <div style={{
          flex: 1,
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#ffffff",
          borderLeft: "1px solid #f1f5f9"
        }}>
          <div style={{
            width: "90px",
            height: "90px",
            backgroundColor: "#eff6ff",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "20px",
            border: "1px solid #dbeafe"
          }}>
            <i className="fa-solid fa-comments" style={{ fontSize: "3rem", color: "#3b82f6" }}></i>
          </div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: "700", color: "#1e293b", marginBottom: "10px", marginTop: "0", letterSpacing: "-0.025em" }}>
            Bắt đầu cuộc trò chuyện
          </h2>
          <p style={{ color: "#64748b", textAlign: "center", maxWidth: "320px", fontSize: "0.9rem", lineHeight: "1.5", margin: "0" }}>
            Chọn một người bạn hoặc nhóm từ danh sách bên trái để kết nối nhé!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-main-wrapper" style={{ display: "flex", flex: 1, height: "100%", overflow: "hidden", background: "var(--bg-card, #fff)" }}>
      <div className="chat-conversation-area" style={{ display: "flex", flexDirection: "column", flex: 1, height: "100%", overflow: "hidden" }}>
        {selectedChat.isGroup ? (
          <div
            className="chat-header group-chat-header"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "15px 25px",
              borderBottom: "1px solid var(--border, #e2e8f0)",
              background: "var(--bg-card, #fff)"
            }}
          >
            <div className="chat-header-info" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                className="header-avatar"
                style={{ 
                  backgroundColor: "#8b5cf6", 
                  width: "45px", 
                  height: "45px", 
                  borderRadius: "50%", 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center", 
                  color: "#fff", 
                  fontSize: "1.2rem",
                  boxShadow: "0 4px 10px rgba(139, 92, 246, 0.25)"
                }}
              >
                <i className="fa-solid fa-users"></i>
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "700", color: "var(--text-dark, #1e293b)" }}>{selectedChat.name}</h4>
                <p
                  className="group-meta"
                  style={{
                    margin: "2px 0 0 0",
                    color: "var(--text-gray, #64748b)",
                    fontSize: "0.85rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px"
                  }}
                >
                  <i className="fa-solid fa-user-group"></i>
                  {selectedChat.member_count || 1} thành viên
                </p>
              </div>
            </div>

            <div style={{ marginLeft: "auto" }}>
              <button
                className={`group-info-toggle-btn ${showGroupInfo ? "active" : ""}`}
                onClick={() => setShowGroupInfo(!showGroupInfo)}
                title="Thông tin nhóm"
                style={{ background: "transparent", border: "none", cursor: "pointer", padding: "8px", borderRadius: "50%", transition: "background 0.2s" }}
              >
                <i
                  className="fa-solid fa-circle-info"
                  style={{
                    fontSize: "1.5rem",
                    color: showGroupInfo ? "var(--primary, #4f46e5)" : "var(--text-gray, #64748b)",
                  }}
                ></i>
              </button>
            </div>
          </div>
        ) : (
          <div className="chat-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "15px 25px", borderBottom: "1px solid var(--border, #e2e8f0)", background: "var(--bg-card, #fff)" }}>
            <div className="chat-header-info" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                className="header-avatar"
                style={{
                  backgroundColor: selectedChat.avatar_color || "#10b981",
                  width: "45px",
                  height: "45px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontWeight: "700",
                  fontSize: "1.1rem",
                  boxShadow: "0 4px 10px rgba(16, 185, 129, 0.2)"
                }}
              >
                {selectedChat.avatar_text || "U"}
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "700", color: "var(--text-dark, #1e293b)" }}>
                  {selectedChat.full_name || selectedChat.email || "Người dùng"}
                </h4>
                <span className="status" style={{ fontSize: "0.85rem", color: selectedChat.is_online ? "#10b981" : "var(--text-gray, #64748b)", display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: selectedChat.is_online ? "#10b981" : "#94a3b8", display: "inline-block" }}></span>
                  {selectedChat.is_online ? "Đang hoạt động" : "Ngoại tuyến"}
                </span>
              </div>
            </div>
            <div className="chat-options-container" ref={chatOptionsRef} style={{ position: "relative" }}>
              <button
                className="chat-options-btn"
                onClick={toggleChatOptionsMenu}
                style={{ background: "transparent", border: "none", cursor: "pointer", padding: "8px 12px", borderRadius: "8px", color: "var(--text-gray, #64748b)" }}
              >
                <i className="fa-solid fa-ellipsis-vertical" style={{ fontSize: "1.2rem" }}></i>
              </button>
              {showChatOptionsMenu && (
                <div className="chat-options-menu" style={{ position: "absolute", right: 0, top: "100%", background: "#fff", border: "1px solid var(--border, #e2e8f0)", borderRadius: "12px", boxShadow: "0 10px 25px rgba(0,0,0,0.1)", zIndex: 10, minWidth: "160px", padding: "6px" }}>
                  <button
                    className="chat-options-item"
                    onClick={handleTogglePinChat}
                    style={{ width: "100%", textAlign: "left", padding: "10px 14px", background: "none", border: "none", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", gap: "10px", fontWeight: "600", fontSize: "0.9rem", color: "var(--text-dark, #1e293b)" }}
                  >
                    <i className="fa-solid fa-thumbtack"></i>{" "}
                    {isChatPinned ? "Bỏ ghim" : "Ghim"}
                  </button>
                  <button
                    className="chat-options-item"
                    onClick={handleHideChat}
                    style={{ width: "100%", textAlign: "left", padding: "10px 14px", background: "none", border: "none", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", gap: "10px", fontWeight: "600", fontSize: "0.9rem", color: "var(--text-dark, #1e293b)" }}
                  >
                    <i className="fa-solid fa-eye-slash"></i> Ẩn trò chuyện
                  </button>
                  <div className="chat-options-divider" style={{ height: "1px", background: "var(--border, #e2e8f0)", margin: "4px 0" }} />
                  <button
                    className="chat-options-item"
                    onClick={handleDeleteConversation}
                    style={{ width: "100%", textAlign: "left", padding: "10px 14px", background: "none", border: "none", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", gap: "10px", fontWeight: "600", fontSize: "0.9rem", color: "#ef4444" }}
                  >
                    <i className="fa-solid fa-trash"></i> Xóa hội thoại
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="chat-messages" ref={messagesContainerRef} style={{ flex: 1, overflowY: "auto", padding: "20px 25px", display: "flex", flexDirection: "column", gap: "4px", background: "var(--bg-main, #f8fafc)" }}>
          {messages.map((msg, index) => {
            const avatarChar =
              msg.Sender?.avatar_text ||
              msg.Sender?.full_name?.charAt(0)?.toUpperCase() ||
              msg.Sender?.email?.charAt(0)?.toUpperCase() ||
              "U";

            const isMyMessage =
              msg.isMine || (user && msg.sender_id === user.id);

            // THUẬT TOÁN 1: XÁC ĐỊNH VÁCH NGĂN NGÀY
            const prevMsg = messages[index - 1];
            const showDateDivider =
              !prevMsg || !isSameDay(prevMsg.created_at, msg.created_at);

            // THUẬT TOÁN 2: XÁC ĐỊNH GỘP TIN NHẮN (Nhìn xuống người kế tiếp)
            const nextMsg = messages[index + 1];
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
                    display: "flex",
                    alignItems: "flex-end",
                    gap: "10px",
                    margin: isGroupedWithNext ? "2px 0" : "8px 0",
                    opacity: msg.isSending ? 0.6 : 1,
                  }}
                >
                  {!isMyMessage && (
                    <div
                      className="message-sender-avatar"
                      style={{
                        backgroundColor: msg.Sender?.avatar_color || "#94a3b8",
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#fff",
                        fontSize: "0.85rem",
                        fontWeight: "700",
                        flexShrink: 0,
                        opacity: isGroupedWithNext ? 0 : 1, // Giấu Avatar nếu tin nhắn chưa phải là chốt sổ
                      }}
                      title={msg.Sender?.full_name || msg.Sender?.email}
                    >
                      {avatarChar}
                    </div>
                  )}

                  <div className="message-content-col" style={{ maxWidth: "65%", display: "flex", flexDirection: "column", alignItems: isMyMessage ? "flex-end" : "flex-start" }}>
                    {!isMyMessage && selectedChat.isGroup && !isGroupedWithNext && (
                      <span className="sender-name" style={{ fontSize: "0.75rem", fontWeight: "600", color: "var(--text-gray, #64748b)", marginBottom: "3px", marginLeft: "4px" }}>
                        {msg.Sender?.full_name ||
                          msg.Sender?.email?.split("@")[0] ||
                          "Thành viên"}
                      </span>
                    )}

                    <div
                      className="message-bubble"
                      style={{
                        padding: "10px 14px",
                        borderRadius: "16px",
                        background: isMyMessage ? "var(--primary, #4f46e5)" : "#fff",
                        color: isMyMessage ? "#fff" : "var(--text-dark, #1e293b)",
                        boxShadow: "0 2px 5px rgba(0,0,0,0.02)",
                        wordBreak: "break-word",
                        fontSize: "0.95rem",
                        lineHeight: "1.4",
                        borderBottomRightRadius: isMyMessage && isGroupedWithNext ? "16px" : undefined,
                        borderBottomLeftRadius: !isMyMessage && isGroupedWithNext ? "16px" : undefined,
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
                          style={{ maxWidth: "220px", borderRadius: "10px", display: "block", marginBottom: msg.content ? "8px" : "0", cursor: "pointer" }}
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
                          style={{ display: "flex", alignItems: "center", gap: "10px", color: isMyMessage ? "#fff" : "var(--primary, #4f46e5)", textDecoration: "none" }}
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

                    {/* CHỈ HIỆN THỜI GIAN/TRẠNG THÁI Ở TIN NHẮN CUỐI CÙNG CỦA KHỐI */}
                    {!isGroupedWithNext && (
                      <div className="message-meta-footer" style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px", fontSize: "0.7rem", color: "#94a3b8" }}>
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
                                <i className="fa-solid fa-paper-plane"></i> Đang gửi...
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

        {/* KHU VỰC HIỂN THỊ "ĐANG GÕ..." BÊN TRONG KHUNG CHAT */}
        {typingUsers && typingUsers.length > 0 && (
          <div
            className="typing-indicator-wrapper"
            style={{
              padding: "8px 25px",
              fontSize: "0.85rem",
              color: "#64748b",
              fontStyle: "italic",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "var(--bg-main, #f8fafc)",
              borderTop: "1px solid var(--border, #e2e8f0)"
            }}
          >
            <div className="typing-dots" style={{ display: "flex", gap: "2px" }}>
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

        <div className="chat-input-container" style={{ padding: "15px 25px", background: "var(--bg-card, #fff)", borderTop: "1px solid var(--border, #e2e8f0)" }}>
          {attachedFile && (
            <div className="file-preview-box" style={{ display: "flex", alignItems: "center", gap: "10px", background: "#f1f5f9", padding: "8px 12px", borderRadius: "10px", marginBottom: "10px" }}>
              {attachedFile.type.startsWith("image/") ? (
                <img
                  className="file-preview-img"
                  src={URL.createObjectURL(attachedFile)}
                  alt="Preview"
                  style={{ width: "40px", height: "40px", objectFit: "cover", borderRadius: "6px" }}
                />
              ) : (
                <i
                  className="fa-solid fa-file-zipper"
                  style={{ fontSize: "1.5rem", color: "#64748b" }}
                ></i>
              )}
              <div className="file-preview-info" style={{ flex: 1, fontSize: "0.85rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                <b>{attachedFile.name}</b>
              </div>
              <button
                className="remove-file-btn"
                onClick={() => setAttachedFile(null)}
                style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "1.1rem" }}
              >
                <i className="fa-solid fa-circle-xmark"></i>
              </button>
            </div>
          )}
          <div className="chat-input-row" style={{ display: "flex", alignItems: "center", gap: "12px", background: "var(--bg-main, #f8fafc)", border: "1px solid var(--border, #e2e8f0)", borderRadius: "14px", padding: "8px 15px" }}>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
            <button
              className="attach-btn"
              onClick={() => fileInputRef.current.click()}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.2rem", color: attachedFile ? "#3b82f6" : "#64748b" }}
            >
              <i className="fa-solid fa-paperclip"></i>
            </button>

            {/* Bắt sự kiện onChange để phát tín hiệu Typing */}
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
              style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: "0.95rem", color: "var(--text-dark, #1e293b)" }}
            />
            <button className="send-btn" onClick={handleSendMessage} style={{ background: "var(--primary, #4f46e5)", color: "#fff", border: "none", width: "38px", height: "38px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 4px 10px rgba(79, 70, 229, 0.25)" }}>
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
