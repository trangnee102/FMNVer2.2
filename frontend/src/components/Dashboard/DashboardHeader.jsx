// frontend/src/components/Dashboard/DashboardHeader.jsx
import React from "react";

const DashboardHeader = ({ userName }) => {
  // Logic lấy ngày tháng hiện tại tự động theo format DD/MM/YYYY
  const today = new Date();
  const formattedDate = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;

  // Mảng các câu chào ngẫu nhiên (Bonus thêm sự thân thiện)
  const greetings = [
    "Hôm nay là một ngày tuyệt vời để học tập!",
    "Sẵn sàng chinh phục các mục tiêu mới chưa?",
    "Học tập chăm chỉ, thành công hết ý!",
    "Kiên trì mỗi ngày, kiến thức đong đầy!"
  ];
  // Chọn ngẫu nhiên 1 câu chào mỗi khi render để giao diện không bị nhàm chán
  const randomGreeting = greetings[today.getDate() % greetings.length];

  return (
    <header 
      className="dashboard-header-new"
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center", // Căn giữa theo chiều dọc cho đẹp
        marginBottom: "35px", 
        flexWrap: "wrap",
        gap: "20px"
      }}
    >
      {/* CỘT TRÁI: Lời chào */}
      <div className="header-text-group" style={{ flex: 1, minWidth: "250px" }}>
        <h1 style={{ 
          fontSize: "2rem", 
          color: "var(--text-dark, #1e293b)", 
          marginBottom: "8px",
          fontWeight: "800",
          lineHeight: "1.3",
          marginTop: 0,
          letterSpacing: "-0.5px"
        }}>
          Xin chào, <span style={{ 
            background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)", 
            WebkitBackgroundClip: "text", 
            WebkitTextFillColor: "transparent",
            display: "inline-block"
          }}>{userName}</span>! 👋
        </h1>
        <p style={{ 
          color: "var(--text-gray, #64748b)", 
          fontSize: "1rem", 
          margin: 0,
          fontWeight: "500"
        }}>
          {randomGreeting}
        </p>
      </div>

      {/* CỘT PHẢI: Widget Hiển thị Ngày tháng (Tận dụng logic đã có) */}
      <div className="header-date-widget" style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        background: "linear-gradient(145deg, rgba(99, 102, 241, 0.08) 0%, rgba(168, 85, 247, 0.08) 100%)",
        padding: "12px 20px",
        borderRadius: "14px",
        border: "1px solid rgba(99, 102, 241, 0.15)",
        boxShadow: "0 4px 15px rgba(99, 102, 241, 0.05)",
        color: "#4f46e5",
        fontWeight: "700",
        fontSize: "0.95rem"
      }}>
        <div style={{
          background: "white",
          width: "36px",
          height: "36px",
          borderRadius: "10px",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
        }}>
          <i className="fa-regular fa-calendar-check" style={{ fontSize: "1.1rem", color: "#6366f1" }}></i>
        </div>
        <span style={{ letterSpacing: "0.5px" }}>Hôm nay, {formattedDate}</span>
      </div>
    </header>
  );
};

export default DashboardHeader;