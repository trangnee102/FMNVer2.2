// frontend/src/components/Modals/ForceStudyModal.jsx
import React from "react";

const ForceStudyModal = ({ isOpen, onClose, deckId, onStudy, onNavigate }) => {
  if (!isOpen) return null;

  const handleForceStudy = () => {
    onClose();
    if (onStudy) {
      onStudy(deckId, true);
    } else if (onNavigate) {
      onNavigate("review", `${deckId}?force=true`);
    }
  };

  return (
    <div className="cram-modal-overlay" style={{ zIndex: 1000 }}>
      <div
        className="cram-modal"
        style={{
          textAlign: "center",
          padding: "40px 30px",
          maxWidth: "420px",
          animation: "fadeIn 0.2s ease-out",
        }}
      >
        <div
          style={{
            fontSize: "3.5rem",
            margin: "0 auto 20px auto",
            display: "inline-block",
            background: "rgba(16, 185, 129, 0.1)",
            padding: "15px",
            borderRadius: "50%",
          }}
        >
          ✨
        </div>
        <h3
          style={{
            color: "var(--text-dark)",
            fontSize: "1.5rem",
            margin: "0 0 15px 0",
            fontWeight: "800",
          }}
        >
          Tuyệt vời!
        </h3>
        <p
          style={{
            color: "var(--text-gray)",
            lineHeight: "1.6",
            margin: "0 0 30px 0",
            fontSize: "1.05rem",
          }}
        >
          Cậu đã học xong bài môn này rồi!
          <br />
          Cậu có muốn <strong>'vượt rào'</strong> ôn trước các thẻ chưa đến hạn
          không?
        </p>
        <div style={{ display: "flex", gap: "15px", justifyContent: "center" }}>
          <button
            style={{
              flex: 1,
              padding: "14px",
              background: "var(--bg-main)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              color: "var(--text-dark)",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onClick={onClose}
          >
            Để sau
          </button>
          <button
            style={{
              flex: 1,
              padding: "14px",
              background: "var(--primary)",
              border: "none",
              borderRadius: "12px",
              color: "white",
              fontWeight: "700",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onClick={handleForceStudy}
          >
            Vượt rào ngay
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForceStudyModal;