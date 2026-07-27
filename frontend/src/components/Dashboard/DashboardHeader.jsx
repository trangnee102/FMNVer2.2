// frontend/src/components/Dashboard/DashboardHeader.jsx
import React from "react";

const DashboardHeader = ({ userName }) => {
  return (
    <header 
      className="dashboard-banner"
      style={{
        background: "linear-gradient(135deg, #e0f2fe 0%, #dbeafe 100%)", /* Nền xanh pastel gradient */
        borderRadius: "20px",
        padding: "25px 35px", /* 👉 ĐÃ SỬA: Thu nhỏ padding để giảm chiều cao banner */
        display: "flex",
        alignItems: "center",
        position: "relative",
        overflow: "hidden",
        marginBottom: "25px",
        boxShadow: "0 4px 15px rgba(59, 130, 246, 0.05)",
        border: "1px solid #eff6ff"
      }}
    >
      {/* Họa tiết trang trí phát sáng phía sau */}
      <div style={{
        position: "absolute",
        top: "-50px",
        left: "-30px",
        width: "180px",
        height: "180px",
        background: "radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0) 70%)",
        borderRadius: "50%",
        zIndex: 1
      }}></div>

      {/* Cột chữ: Trải dài toàn bộ, xóa bỏ hoàn toàn hình ảnh */}
      <div className="banner-text" style={{ position: "relative", zIndex: 2, width: "100%" }}>
        <h1 style={{ 
          fontSize: "1.8rem", /* 👉 ĐÃ SỬA: Thu nhỏ font chữ một chút cho tinh tế */
          color: "#1e293b", 
          marginBottom: "8px",
          fontWeight: "800",
          lineHeight: "1.2"
        }}>
          Xin chào, {userName}! 👋
        </h1>
        <p style={{ 
          color: "#475569", 
          fontSize: "1rem", 
          lineHeight: "1.5",
          margin: 0,
          fontWeight: "500"
        }}>
          Hôm nay là một ngày tuyệt vời để học tập và chinh phục mục tiêu của bạn!
        </p>
      </div>
    </header>
  );
};

export default DashboardHeader;