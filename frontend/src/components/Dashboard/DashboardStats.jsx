import React from "react";

const DashboardStats = ({
  totalDueCards,
  totalDecks,
}) => {
  const safeDue =
    typeof totalDueCards === "number" && totalDueCards > 0 ? totalDueCards : 0;
  const safeDecks =
    typeof totalDecks === "number" && totalDecks > 0 ? totalDecks : 0;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: "12px",
        paddingTop: "5px",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "12px",
          background: "var(--bg-main, #f8fafc)",
          padding: "16px 5px",
          borderRadius: "16px",
          border: "1px solid var(--border, #e2e8f0)",
          transition: "all 0.3s ease",
          boxShadow: "0 2px 10px rgba(0,0,0,0.02)",
          cursor: "default",
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = "translateY(-4px)";
          e.currentTarget.style.borderColor = "#10b981";
          e.currentTarget.style.boxShadow =
            "0 6px 15px rgba(16, 185, 129, 0.15)";
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.borderColor = "var(--border, #e2e8f0)";
          e.currentTarget.style.boxShadow = "0 2px 10px rgba(0,0,0,0.02)";
        }}
      >
        <div
          style={{
            width: "42px",
            height: "42px",
            borderRadius: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(16, 185, 129, 0.15)",
            color: "#10b981",
            fontSize: "1.2rem",
          }}
        >
          <i className="fa-solid fa-book-open-reader"></i>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <span
            style={{
              fontSize: "1.4rem",
              fontWeight: "800",
              color: "var(--text-dark, #1e293b)",
              lineHeight: "1",
            }}
          >
            {safeDue}
          </span>
          <span
            style={{
              fontSize: "0.7rem",
              color: "var(--text-gray, #64748b)",
              fontWeight: "700",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            Thẻ cần ôn
          </span>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "12px",
          background: "var(--bg-main, #f8fafc)",
          padding: "16px 5px",
          borderRadius: "16px",
          border: "1px solid var(--border, #e2e8f0)",
          transition: "all 0.3s ease",
          boxShadow: "0 2px 10px rgba(0,0,0,0.02)",
          cursor: "default",
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = "translateY(-4px)";
          e.currentTarget.style.borderColor = "#a855f7";
          e.currentTarget.style.boxShadow =
            "0 6px 15px rgba(168, 85, 247, 0.15)";
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.borderColor = "var(--border, #e2e8f0)";
          e.currentTarget.style.boxShadow = "0 2px 10px rgba(0,0,0,0.02)";
        }}
      >
        <div
          style={{
            width: "42px",
            height: "42px",
            borderRadius: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(168, 85, 247, 0.15)",
            color: "#a855f7",
            fontSize: "1.2rem",
          }}
        >
          <i className="fa-solid fa-file-contract"></i>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <span
            style={{
              fontSize: "1.4rem",
              fontWeight: "800",
              color: "var(--text-dark, #1e293b)",
              lineHeight: "1",
            }}
          >
            {safeDecks}
          </span>
          <span
            style={{
              fontSize: "0.7rem",
              color: "var(--text-gray, #64748b)",
              fontWeight: "700",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            Đề thi
          </span>
        </div>
      </div>
    </div>
  );
};

export default DashboardStats;