import React, { useState } from "react";
import "./GroupModals.css";

const MembersGroupModal = ({
  isOpen,
  onClose,
  members = [],
  onAddMember,
  isLoading,
}) => {
  const [newEmail, setNewEmail] = useState("");

  if (!isOpen) return null;

  const handleAdd = () => {
    if (!newEmail.trim())
      return alert("Vui lòng nhập Email của người muốn thêm!");
    onAddMember(newEmail);
    setNewEmail(""); // Reset ô nhập sau khi bấm
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Thành viên nhóm ({members.length})</h3>
          <button className="modal-close-btn" onClick={onClose}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="member-list">
          {isLoading ? (
            <p
              style={{ textAlign: "center", color: "#64748b", padding: "20px" }}
            >
              Đang tải danh sách... ⏳
            </p>
          ) : members.length > 0 ? (
            members.map((member) => (
              <div key={member.id} className="member-item">
                <div
                  className="member-avatar"
                  style={{ backgroundColor: member.avatar_color || "#3b82f6" }}
                >
                  {member.avatar_text || "U"}
                </div>
                <div>
                  <div style={{ fontWeight: "bold", color: "#1e293b" }}>
                    {member.full_name || member.email}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
                    {member.role === "admin" ? "Trưởng nhóm" : "Thành viên"}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p
              style={{ textAlign: "center", color: "#64748b", padding: "20px" }}
            >
              Chưa có thông tin thành viên.
            </p>
          )}
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <input
            type="email"
            className="modal-input"
            style={{ marginBottom: 0 }}
            placeholder="Nhập Email để thêm bạn..."
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
          />
          <button className="btn-submit" onClick={handleAdd}>
            Thêm
          </button>
        </div>
      </div>
    </div>
  );
};

export default MembersGroupModal;
