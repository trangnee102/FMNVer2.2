import React from "react";
import "./GroupInfoSidebar.css";

const GroupInfoSidebar = ({
  selectedChat,
  onClose,
  handleLeaveGroup,
  // 👉 ĐÃ THÊM: Các "cổng kết nối" chờ sẵn để cắm logic thật vào sau
  onViewMembers = () =>
    alert("Đang mở danh sách thành viên... (Sẽ cập nhật Popup sau)"),
  onAddMember = () =>
    alert("Đang mở form thêm người... (Sẽ cập nhật Popup sau)"),
  onRenameGroup = () =>
    alert("Đang mở form đổi tên... (Sẽ cập nhật Popup sau)"),
  onChangeAvatar = () =>
    alert("Đang mở form tải ảnh... (Sẽ cập nhật Popup sau)"),
  onClearHistory = () => {
    if (
      window.confirm(
        "Bạn có chắc chắn muốn xóa toàn bộ lịch sử trò chuyện này?",
      )
    ) {
      alert("Đã xóa lịch sử! (Logic gọi Backend sẽ tích hợp sau)");
    }
  },
}) => {
  return (
    <div className="group-info-sidebar">
      {/* 1. Header của Sidebar */}
      <div className="group-info-header">
        <h3>Thông tin nhóm</h3>
        <button className="close-sidebar-btn" onClick={onClose}>
          <i className="fa-solid fa-xmark"></i>
        </button>
      </div>

      {/* 2. Nội dung cuộn được */}
      <div className="group-info-content">
        {/* Thông tin cơ bản */}
        <div className="group-info-avatar-section">
          <div className="group-large-avatar">
            <i className="fa-solid fa-users"></i>
          </div>
          <h2 className="group-info-name">{selectedChat.name}</h2>
          <p className="group-info-desc">
            {selectedChat.description || "Nhóm học tập"}
          </p>
        </div>

        {/* Bảng Mã Invite */}
        <div className="info-card">
          <p className="info-card-title">
            <i className="fa-solid fa-link"></i> Mã tham gia nhóm
          </p>
          <div className="invite-code-display">
            <div className="invite-code-box">{selectedChat.invite_code}</div>
            <button
              className="copy-invite-btn"
              onClick={() => {
                navigator.clipboard.writeText(selectedChat.invite_code);
                alert("Đã copy mã mời!");
              }}
              title="Copy mã mời"
            >
              <i className="fa-regular fa-copy"></i>
            </button>
          </div>
        </div>

        {/* Quản lý Thành viên */}
        <div className="info-card">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "15px",
            }}
          >
            <p className="info-card-title" style={{ margin: 0 }}>
              <i className="fa-solid fa-user-group"></i> Thành viên (
              {selectedChat.member_count || 1})
            </p>
            {/* 👉 ĐÃ GẮN SỰ KIỆN */}
            <button className="view-all-btn" onClick={onViewMembers}>
              Xem tất cả
            </button>
          </div>

          {/* 👉 ĐÃ GẮN SỰ KIỆN */}
          <button className="add-member-btn" onClick={onAddMember}>
            <i className="fa-solid fa-user-plus"></i> Thêm thành viên
          </button>
        </div>

        {/* Cài đặt chung */}
        <div className="settings-list">
          {/* 👉 ĐÃ GẮN SỰ KIỆN */}
          <button className="setting-item-btn" onClick={onRenameGroup}>
            <i className="fa-solid fa-pen setting-icon"></i> Đổi tên nhóm
          </button>
          {/* 👉 ĐÃ GẮN SỰ KIỆN */}
          <button className="setting-item-btn" onClick={onChangeAvatar}>
            <i className="fa-regular fa-image setting-icon"></i> Đổi ảnh đại
            diện
          </button>
          {/* 👉 ĐÃ GẮN SỰ KIỆN */}
          <button className="setting-item-btn" onClick={onClearHistory}>
            <i className="fa-solid fa-trash-can setting-icon"></i> Xóa lịch sử
            trò chuyện
          </button>
        </div>
      </div>

      {/* 3. Nút Rời Nhóm (Cố định dưới cùng) */}
      <div className="group-info-footer">
        <button className="leave-group-full-btn" onClick={handleLeaveGroup}>
          <i className="fa-solid fa-arrow-right-from-bracket"></i> Rời khỏi nhóm
        </button>
      </div>
    </div>
  );
};

export default GroupInfoSidebar;
