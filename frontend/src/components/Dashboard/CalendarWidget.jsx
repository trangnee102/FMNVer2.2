import React, { useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

// 👉 ĐÃ THÊM: examDates = [] để an toàn tuyệt đối khi chưa có dữ liệu
const CalendarWidget = ({ examDates = [] }) => {
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

  return (
    <div className="calendar-card">
      <h4 style={{ marginBottom: "15px", color: "var(--text-dark)" }}>
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
            width: "12px",
            height: "12px",
            backgroundColor: "#f59e0b",
            borderRadius: "50%",
          }}
        ></span>
        Ngày thi dự kiến (Cram Mode)
      </div>
    </div>
  );
};

export default CalendarWidget;
