import React, { useState, useEffect } from "react";

const TimeMachineWidget = () => {
  const [mockDate, setMockDate] = useState(
    localStorage.getItem("TIME_MACHINE") || ""
  );

  const WIDGET_WIDTH = 260;
  const WIDGET_HEIGHT = 150;

  const getDefaultPosition = () => ({
    x: window.innerWidth - WIDGET_WIDTH - 20,
    y: window.innerHeight - WIDGET_HEIGHT - 20,
  });

  const clampPosition = (pos) => ({
    x: Math.min(
      Math.max(0, pos.x),
      window.innerWidth - WIDGET_WIDTH
    ),
    y: Math.min(
      Math.max(0, pos.y),
      window.innerHeight - WIDGET_HEIGHT
    ),
  });

  const [position, setPosition] = useState(() => {
    const saved = localStorage.getItem("TIME_MACHINE_POSITION");

    if (!saved) return getDefaultPosition();

    try {
      return clampPosition(JSON.parse(saved));
    } catch {
      return getDefaultPosition();
    }
  });

  const [dragging, setDragging] = useState(false);

  const [offset, setOffset] = useState({
    x: 0,
    y: 0,
  });

  useEffect(() => {
    localStorage.setItem(
      "TIME_MACHINE_POSITION",
      JSON.stringify(position)
    );
  }, [position]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!dragging) return;

      const newPosition = clampPosition({
        x: e.clientX - offset.x,
        y: e.clientY - offset.y,
      });

      setPosition(newPosition);
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

  // Nếu resize cửa sổ thì widget cũng không bị văng khỏi màn hình
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => clampPosition(prev));
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

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

    window.location.reload();
  };

  return (
    <div
      style={{
        position: "fixed",
        left: position.x,
        top: position.y,
        background: "#1e293b",
        color: "white",
        padding: "10px 15px",
        borderRadius: "8px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        width: `${WIDGET_WIDTH}px`,
        userSelect: "none",
      }}
    >
      {/* Thanh kéo */}
      <div
        onMouseDown={handleMouseDown}
        style={{
          cursor: dragging ? "grabbing" : "grab",
          fontSize: "0.85rem",
          fontWeight: "bold",
          color: "#f59e0b",
          paddingBottom: "4px",
          borderBottom: "1px solid rgba(255,255,255,0.15)",
        }}
      >
        ⏱️ Cỗ máy thời gian (Chỉ để Test)
      </div>

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