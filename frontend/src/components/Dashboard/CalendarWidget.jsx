// frontend/src/components/Dashboard/CalendarWidget.jsx
import React, { useState, useEffect } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

const CalendarWidget = ({ examDates = [], checkInDates = [] }) => {
  const [date, setDate] = useState(new Date());
  const [localLastCheckIn, setLocalLastCheckIn] = useState(null);

  // Đọc thêm điểm danh từ LocalStorage (Dùng làm phương án dự phòng nếu Backend chưa truyền checkInDates)
  useEffect(() => {
    const lastCheckIn = localStorage.getItem("lastCheckInDate");
    if (lastCheckIn) {
      const d = new Date(lastCheckIn);
      const localStr = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split("T")[0];
      setLocalLastCheckIn(localStr);
    }
  }, []);

  const tileClassName = ({ date, view }) => {
    if (view === "month") {
      const localDate = new Date(
        date.getTime() - date.getTimezoneOffset() * 60000,
      )
        .toISOString()
        .split("T")[0];

      const today = new Date();
      const todayStr = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().split("T")[0];

      let classes = [];

      // 1. LOGIC ĐIỂM DANH (XANH / ĐỎ)
      const isCheckedIn = checkInDates.includes(localDate) || localDate === localLastCheckIn;
      const isPast = localDate < todayStr;

      if (isCheckedIn) {
        classes.push("checked-in-day");
      } else if (isPast) {
        classes.push("missed-day");
      }

      // 2. LOGIC NGÀY THI (Hiển thị chấm cam)
      if (examDates.includes(localDate)) {
        classes.push("exam-day-dot");
      }

      return classes.join(" ");
    }
    return null;
  };

  return (
    <div style={{ width: "100%", position: "relative" }}>
      {/* 
        👉 ĐÃ FIX TOÀN DIỆN LỖI LỆCH CSS & LỖI BAY MÀU KHI CLICK.
        Giữ nguyên cấu trúc lưới mặc định của thư viện để các con số thẳng hàng tuyệt đối.
      */}
      <style>{`
        /* Reset cấu trúc cơ bản */
        .react-calendar {
          border: none !important;
          background: transparent !important;
          font-family: inherit !important;
          width: 100% !important;
        }

        /* Ẩn đường kẻ gạch chân thừa thãi */
        .react-calendar abbr {
          text-decoration: none !important;
        }

        /* Định dạng Header (Tháng / Năm) */
        .react-calendar__navigation {
          margin-bottom: 1.5rem !important;
        }
        .react-calendar__navigation button {
          font-weight: 700 !important;
          font-size: 1.1rem !important;
          color: var(--text-dark, #1e293b) !important;
          background: transparent !important;
          border-radius: 8px !important;
          transition: background-color 0.2s !important;
        }
        .react-calendar__navigation button:hover:not(:disabled) {
          background-color: var(--bg-main, #f8fafc) !important;
        }

        /* Định dạng Tên ngày trong tuần (Thứ 2, Thứ 3...) */
        .react-calendar__month-view__weekdays {
          color: var(--text-gray, #64748b) !important;
          font-weight: 700 !important;
          font-size: 0.75rem !important;
          text-transform: uppercase !important;
          margin-bottom: 0.8rem !important;
        }

        /* 👉 ĐÃ FIX: Tile Container. 
           Chỉ làm nhiệm vụ căn giữa nội dung bên trong, KHÔNG ép kích thước ngang 
           để bảo tồn lưới chia 7 cột hoàn hảo của React-Calendar. */
        .react-calendar__tile {
          height: 48px !important;
          padding: 0 !important;
          display: flex !important;
          justify-content: center !important;
          align-items: center !important;
          background: transparent !important; /* Luôn trong suốt */
          position: relative !important;
          overflow: visible !important;
        }

        /* Triệt tiêu style màu nền/xanh đen khi click hoặc focus vào Tile */
        .react-calendar__tile:enabled:hover,
        .react-calendar__tile:enabled:focus,
        .react-calendar__tile--active {
          background: transparent !important;
          color: inherit !important;
        }

        /* 👉 ĐÃ FIX: Chỉ tô màu và bo tròn vào thẻ <abbr> bọc con số.
           Đảm bảo các vòng tròn đều nhau tăm tắp, độc lập với độ co giãn của lưới. */
        .react-calendar__tile abbr {
          display: flex !important;
          justify-content: center !important;
          align-items: center !important;
          width: 38px !important;
          height: 38px !important;
          border-radius: 50% !important;
          font-weight: 600 !important;
          font-size: 0.95rem !important;
          color: var(--text-dark, #1e293b);
          transition: all 0.2s ease-in-out !important;
        }

        /* Làm mờ các ngày của tháng trước/sau */
        .react-calendar__month-view__days__day--neighboringMonth abbr {
          color: var(--text-gray, #cbd5e1) !important;
          opacity: 0.4 !important;
        }

        /* Hover nhẹ nhàng trên ngày bình thường */
        .react-calendar__tile:not(.checked-in-day):not(.missed-day):enabled:hover abbr {
          background-color: var(--bg-main, #f1f5f9) !important;
        }

        /* Ngày hôm nay (Chỉ viền nhẹ, không đè nền) */
        .react-calendar__tile--now abbr {
          border: 2px solid #e2e8f0 !important;
          color: #4f46e5 !important;
        }

        /* ======================================= */
        /* CUSTOM CLASSES (ĐIỂM DANH & LỊCH THI)   */
        /* ======================================= */

        /* Ngày đã điểm danh -> Nền Xanh */
        .checked-in-day abbr {
          background-color: rgba(16, 185, 129, 0.15) !important;
          color: #10b981 !important;
          font-weight: 800 !important;
        }
        
        /* Khi trỏ chuột vào ngày điểm danh, màu hơi đậm lên một chút */
        .checked-in-day:enabled:hover abbr,
        .checked-in-day:enabled:focus abbr {
          background-color: rgba(16, 185, 129, 0.25) !important;
        }

        /* Ngày chưa điểm danh (trong quá khứ) -> Nền Đỏ */
        .missed-day abbr {
          background-color: rgba(239, 68, 68, 0.08) !important;
          color: #ef4444 !important;
        }

        /* Ngày có lịch thi -> Chấm Cam lơ lửng ngay dưới chân <abbr> */
        .exam-day-dot::after {
          content: "";
          position: absolute;
          bottom: 2px;
          left: 50%;
          transform: translateX(-50%);
          width: 5px;
          height: 5px;
          background-color: #f59e0b;
          border-radius: 50%;
          box-shadow: 0 1px 3px rgba(245, 158, 11, 0.4);
        }
      `}</style>

      <Calendar
        onChange={setDate}
        value={date}
        tileClassName={tileClassName}
        locale="vi-VN"
      />
      
      {/* CHÚ THÍCH (LEGEND) Ở DƯỚI LỊCH */}
      <div
        style={{
          marginTop: "25px",
          fontSize: "0.85rem",
          color: "var(--text-gray, #64748b)",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "center",
          gap: "18px",
          fontWeight: "600"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ display: "inline-block", width: "12px", height: "12px", backgroundColor: "rgba(16, 185, 129, 0.2)", borderRadius: "50%", border: "2px solid #10b981" }}></span>
          Đã điểm danh
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ display: "inline-block", width: "12px", height: "12px", backgroundColor: "rgba(239, 68, 68, 0.15)", borderRadius: "50%", border: "2px solid #ef4444" }}></span>
          Quên điểm danh
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ display: "inline-block", width: "8px", height: "8px", backgroundColor: "#f59e0b", borderRadius: "50%", boxShadow: "0 1px 3px rgba(245, 158, 11, 0.4)" }}></span>
          Có lịch thi
        </div>
      </div>
    </div>
  );
};

export default CalendarWidget;