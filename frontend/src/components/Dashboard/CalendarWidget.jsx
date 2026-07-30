// frontend/src/components/Dashboard/CalendarWidget.jsx
import React, { useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

const CalendarWidget = ({ examDates = [] }) => {
  const [date, setDate] = useState(new Date());

  const tileClassName = ({ date, view }) => {
    if (view === "month") {
      const localDate = new Date(
        date.getTime() - date.getTimezoneOffset() * 60000,
      )
        .toISOString()
        .split("T")[0];

      // Nếu ngày trên lịch trùng với ngày thi -> Bật highlight ngày thi màu cam
      if (examDates.includes(localDate)) {
        return "exam-day-highlight";
      }
    }
    return null;
  };

  return (
    <div style={{ width: "100%" }}>
      <Calendar
        onChange={setDate}
        value={date}
        tileClassName={tileClassName}
        locale="vi-VN"
      />
      
      <div
        style={{
          marginTop: "18px",
          fontSize: "0.85rem",
          color: "#64748b",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          fontWeight: "500"
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
  );
};

export default CalendarWidget;