import React, { useState,useEffect } from "react";

const TimeMachineWidget = () => {
  const [mockDate, setMockDate] = useState(
    localStorage.getItem("TIME_MACHINE") || "",
  );

  const [position, setPosition] = useState(() => {
  const saved = localStorage.getItem("TIME_MACHINE_POSITION");
  return saved
    ? JSON.parse(saved)
    : {
        x: window.innerWidth - 280,
        y: window.innerHeight - 180,
      };
});

const [dragging, setDragging] = useState(false);
const [offset, setOffset] = useState({ x: 0, y: 0 });

useEffect(() => {
  localStorage.setItem(
    "TIME_MACHINE_POSITION",
    JSON.stringify(position)
  );
}, [position]);

useEffect(() => {
  const handleMouseMove = (e) => {
    if (!dragging) return;

    setPosition({
      x: e.clientX - offset.x,
      y: e.clientY - offset.y,
    });
  };

  const handleMouseUp = () => {
    setDragging(false);
  };

  window.addEventListener("mousemove", handleMouseMove);
  window.addEventListener("mouseup", handleMouseUp);

  return () => {
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseup", handleMouseUp);
  };
}, [dragging, offset]);

const handleMouseDown = (e) => {
  setDragging(true);

  setOffset({
    x: e.clientX - position.x,
    y: e.clientY - position.y,
  });
};



  const handleDateChange = (e) => {
    const val = e.target.value;
    setMockDate(val);
    if (val) {
      localStorage.setItem("TIME_MACHINE", val);
    } else {
      localStorage.removeItem("TIME_MACHINE");
    }
    // Tải lại trang để "du hành thời gian"
    window.location.reload();
  };

  return (
    <div
      onMouseDown={handleMouseDown}
      style={{
        position: "fixed",
        left: `${position.x}px`,
        top: `${position.y}px`,
        cursor: dragging ? "grabbing" : "grab",
        userSelect: "none",
        background: "#1e293b",
        color: "white",
        padding: "10px 15px",
        borderRadius: "8px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: "8px",
      }}
    >
      <label
        style={{ fontSize: "0.85rem", fontWeight: "bold", color: "#f59e0b" }}
      >
        ⏱️ Cỗ máy thời gian (Chỉ để Test)
      </label>
      <input
        type="date"
        value={mockDate}
        onChange={handleDateChange}
        style={{
          padding: "5px",
          borderRadius: "4px",
          border: "none",
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      />
      {mockDate && (
        <button
          onClick={() => handleDateChange({ target: { value: "" } })}
          style={{
            fontSize: "0.75rem",
            padding: "5px",
            background: "#ef4444",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          Tắt giả lập (Về hiện tại)
        </button>
      )}
    </div>
  );
};

export default TimeMachineWidget;
