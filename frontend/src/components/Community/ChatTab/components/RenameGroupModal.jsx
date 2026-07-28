import React, { useState, useEffect } from "react";
import "./GroupModals.css";

const RenameGroupModal = ({ isOpen, onClose, currentName, onRename }) => {
  const [newName, setNewName] = useState("");

  // Tự động điền tên cũ khi mở Modal
  useEffect(() => {
    if (isOpen) setNewName(currentName || "");
  }, [isOpen, currentName]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!newName.trim()) return alert("Tên nhóm không được để trống!");
    onRename(newName);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Đổi tên nhóm</h3>
          <button className="modal-close-btn" onClick={onClose}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
        <input
          type="text"
          className="modal-input"
          placeholder="Nhập tên nhóm mới..."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>
            Hủy
          </button>
          <button className="btn-submit" onClick={handleSubmit}>
            Lưu thay đổi
          </button>
        </div>
      </div>
    </div>
  );
};

export default RenameGroupModal;
