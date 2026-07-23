import React from "react";
import Button from "../common/Button"; // 👉 Vẫn giữ nguyên component Button xịn xò của bạn

// 👉 ĐÃ SỬA: Bổ sung thêm prop `onClick` để nhận lệnh từ DashboardActions truyền xuống
const ActionCard = ({ title, desc, btnText, bgColor, btnVariant, onClick }) => {
  return (
    <div
      className="action-card" // 👉 Thêm class này để ăn hiệu ứng hover nảy lên trong file CSS
      style={{
        backgroundColor: bgColor || "var(--bg-card)",
        padding: "25px",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--border)", // Thêm viền tinh tế cho Dark Mode
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        transition: "all 0.3s ease", // Chuyển đổi màu nền mượt mà khi đổi chế độ Sáng/Tối
      }}
    >
      <h4
        style={{
          color: "var(--text-dark)", // Ăn theo màu chữ hệ thống
          marginBottom: "10px",
          fontSize: "1.1rem",
          transition: "color 0.3s ease",
        }}
      >
        {title}
      </h4>
      <p
        style={{
          color: "var(--text-gray)", // Chữ mô tả dịu mắt
          fontSize: "0.85rem",
          marginBottom: "20px",
          flex: 1,
          lineHeight: "1.5",
          transition: "color 0.3s ease",
        }}
      >
        {desc}
      </p>
      
      {/* 👉 CHÌA KHÓA ĐÂY: Truyền `onClick` vào component Button để nó hết bị "liệt" */}
      <Button 
        text={btnText} 
        variant={btnVariant} 
        fullWidth={true} 
        onClick={onClick} 
      />
    </div>
  );
};

export default ActionCard;