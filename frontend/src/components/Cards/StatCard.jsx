import React from "react";

const StatCard = ({ icon, label, value, colorClass }) => {
  return (
    <div
      className="stat-card"
      style={{
        background: "var(--bg-card)", // 👉 ĐÃ SỬA: Thay "white" bằng biến hệ thống
        border: "1px solid var(--border)", // 👉 ĐÃ THÊM: Viền nhẹ giúp thẻ tách biệt khỏi nền
        padding: "20px",
        borderRadius: "var(--radius-lg)",
        display: "flex",
        alignItems: "center",
        gap: "15px",
        boxShadow: "var(--shadow-card)",
        transition: "all 0.3s ease", // 👉 ĐÃ THÊM: Hiệu ứng chuyển màu mượt mà
      }}
    >
      <div
        className={`stat-icon ${colorClass}`}
        style={{
          width: "50px",
          height: "50px",
          borderRadius: "12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "1.4rem",
        }}
      >
        <i className={`fa-solid ${icon}`}></i>
      </div>
      <div>
        <p
          style={{
            color: "var(--text-gray)",
            fontSize: "0.9rem",
            marginBottom: "5px",
            marginTop: "0",
            transition: "color 0.3s ease",
          }}
        >
          {label}
        </p>
        <h3 
          style={{ 
            color: "var(--text-dark)", 
            fontSize: "1.4rem", 
            margin: "0",
            transition: "color 0.3s ease",
          }}
        >
          {value}
        </h3>
      </div>
    </div>
  );
};

export default StatCard;