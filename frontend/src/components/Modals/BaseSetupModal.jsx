// frontend/src/components/Modals/BaseSetupModal.jsx
import React from "react";
import "./BaseSetupModal.css";

const BaseSetupModal = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  actions,
}) => {
  if (!isOpen) return null;

  return (
    <div className="base-modal-overlay" onClick={onClose}>
      <div className="base-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* KHU VỰC HEADER CHUNG */}
        <div className="base-modal-header">
          <h2 className="base-modal-title">
            {icon && <span style={{ color: "#8b5cf6" }}>{icon}</span>}
            {title}
          </h2>
          {subtitle && <div className="base-modal-subtitle">{subtitle}</div>}
        </div>

        {/* KHU VỰC NỘI DUNG TÙY BIẾN */}
        <div className="base-modal-body">{children}</div>

        {/* KHU VỰC NÚT BẤM */}
        <div className="base-modal-footer">{actions}</div>
      </div>
    </div>
  );
};

export default BaseSetupModal;