import React, { useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

const CalendarWidget = ({ examDates = [], streak = 0 }) => {
  const [date, setDate] = useState(new Date());

  const tileClassName = ({ date, view }) => {
    if (view === "month") {
      const localDate = new Date(
        date.getTime() - date.getTimezoneOffset() * 60000,
      )
        .toISOString()
        .split("T")[0];

      // Nếu ngày trên lịch trùng với ngày thi -> Bật còi báo động!
      if (examDates.includes(localDate)) {
        return "exam-day-highlight";
      }
    }
    return null;
  };

  // Hàm mô phỏng điểm danh
  const handleCheckin = () => {
    alert("Tính năng điểm danh đang được cật lực xây dựng! 🔥 Cậu đợi chút nhé!");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      
      {/* 1. KHỐI TÍCH LŨY STREAK MÀU CAM */}
      <div className="streak-card-orange">
        <h3>Tích Lũy Streak 🔥</h3>
        <p>Bấm điểm danh mỗi ngày để duy trì chuỗi học tập.</p>
        <div className="streak-val">
          🔥 Streak: {streak} ngày
        </div>
        <button className="btn-checkin" onClick={handleCheckin}>
          <i className="fa-solid fa-bullseye"></i> Điểm danh hôm nay
        </button>
      </div>

      {/* 2. LỊCH HỌC TẬP & THI CỬ (Đã được bọc vào Card bo góc xịn xò) */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "16px", padding: "20px", boxShadow: "0 4px 15px rgba(0,0,0,0.02)" }}>
        <h4 style={{ color: "var(--text-dark)", fontSize: "1.1rem", marginBottom: "15px", textAlign: "center", fontWeight: "bold" }}>
          Lịch học tập & Thi cử
        </h4>
        <Calendar
          onChange={setDate}
          value={date}
          tileClassName={tileClassName}
          locale="vi-VN"
        />
        <div
          style={{
            marginTop: "15px",
            fontSize: "0.85rem",
            color: "var(--text-gray)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
          }}
        >
          <span
            style={{
              display: "inline-block",
              width: "10px",
              height: "10px",
              backgroundColor: "#f59e0b",
              borderRadius: "50%",
            }}
          ></span>
          Ngày thi dự kiến (Cram Mode)
        </div>
      </div>

    </div>
  );
};

export default CalendarWidget;