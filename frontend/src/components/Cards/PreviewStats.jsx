// frontend/src/components/Cards/PreviewStats.jsx
import React from "react";

const PreviewStats = ({ totalQ, stats }) => {
  return (
    <div style={{ marginBottom: "25px" }}>
      <h2 style={{ color: "var(--text-dark)", margin: "0 0 15px 0" }}>
        Bản xem trước Đề thi ({totalQ} câu)
      </h2>

      <div
        style={{
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
          marginBottom: "10px",
        }}
      >
        {stats.SINGLE > 0 && (
          <span
            className="exam-badge"
            style={{
              backgroundColor: "rgba(139, 92, 246, 0.1)",
              color: "#8b5cf6",
              border: "1px solid #8b5cf6",
              padding: "5px 12px",
              borderRadius: "20px",
              fontWeight: "bold",
              fontSize: "0.9rem",
            }}
          >
            🔘 1 Đáp án: {stats.SINGLE}
          </span>
        )}
        {stats.MULTIPLE > 0 && (
          <span
            className="exam-badge"
            style={{
              backgroundColor: "rgba(59, 130, 246, 0.1)",
              color: "#3b82f6",
              border: "1px solid #3b82f6",
              padding: "5px 12px",
              borderRadius: "20px",
              fontWeight: "bold",
              fontSize: "0.9rem",
            }}
          >
            ☑️ Nhiều đáp án: {stats.MULTIPLE}
          </span>
        )}
        {stats.TRUE_FALSE > 0 && (
          <span
            className="exam-badge"
            style={{
              backgroundColor: "rgba(236, 72, 153, 0.1)",
              color: "#ec4899",
              border: "1px solid #ec4899",
              padding: "5px 12px",
              borderRadius: "20px",
              fontWeight: "bold",
              fontSize: "0.9rem",
            }}
          >
            ⚖️ Đúng/Sai: {stats.TRUE_FALSE}
          </span>
        )}
        {stats.FILL_BLANK > 0 && (
          <span
            className="exam-badge"
            style={{
              backgroundColor: "rgba(16, 185, 129, 0.1)",
              color: "#10b981",
              border: "1px solid #10b981",
              padding: "5px 12px",
              borderRadius: "20px",
              fontWeight: "bold",
              fontSize: "0.9rem",
            }}
          >
            ✍️ Điền khuyết: {stats.FILL_BLANK}
          </span>
        )}
      </div>
    </div>
  );
};

export default PreviewStats;