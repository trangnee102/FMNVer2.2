import React from "react";

const StatCard = ({ icon, label, value, colorClass }) => {
  return (
    <div
      style={{
        background: "white",
        padding: "20px",
        borderRadius: "var(--radius-lg)",
        display: "flex",
        alignItems: "center",
        gap: "15px",
        boxShadow: "var(--shadow-card)",
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
          }}
        >
          {label}
        </p>
        <h3 style={{ color: "var(--text-dark)", fontSize: "1.4rem" }}>
          {value}
        </h3>
      </div>
    </div>
  );
};

export default StatCard;
