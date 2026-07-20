import React, { useState, useEffect } from "react";

const CramModeModal = ({ isOpen, onClose, selectedDeck, onNavigate }) => {
  const [tempExamDate, setTempExamDate] = useState("");
  const [bossModePercent, setBossModePercent] = useState(30);

  useEffect(() => {
    if (isOpen && selectedDeck) {
      const savedSettings =
        JSON.parse(localStorage.getItem(`cram_settings_${selectedDeck.id}`)) ||
        {};
      setBossModePercent(savedSettings.bossModePercent || 30);
      setTempExamDate(savedSettings.examDate || selectedDeck.exam_date || "");
    }
  }, [isOpen, selectedDeck]);

  const calculateDaysLeft = (examDateStr) => {
    if (!examDateStr) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exam = new Date(examDateStr);
    exam.setHours(0, 0, 0, 0);
    const diff = Math.ceil((exam - today) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  const handleStartCramMode = () => {
    if (!tempExamDate) {
      alert(
        "⚠️ Cậu phải chọn Ngày thi thì hệ thống mới tính chu kỳ Cram Mode được!",
      );
      return;
    }
    const cramSettings = {
      examDate: tempExamDate,
      bossModePercent: bossModePercent,
    };
    localStorage.setItem(
      `cram_settings_${selectedDeck.id}`,
      JSON.stringify(cramSettings),
    );
    onClose();
    onNavigate("cram-review", selectedDeck.id);
  };

  if (!isOpen || !selectedDeck) return null;

  return (
    <div className="cram-modal-overlay" onClick={onClose}>
      <div className="cram-modal" onClick={(e) => e.stopPropagation()}>
        <h2 style={{ margin: "0 0 10px 0", color: "#b45309" }}>
          ⚡ Lò Luyện Cấp Tốc
        </h2>
        <h3 style={{ margin: "0 0 20px 0", color: "#2d3748" }}>
          {selectedDeck.title || selectedDeck.name}
        </h3>

        <div
          style={{
            background: "#f3f4f6",
            padding: "15px",
            borderRadius: "8px",
            marginBottom: "15px",
          }}
        >
          <label
            style={{
              display: "block",
              fontWeight: "bold",
              color: "#374151",
              marginBottom: "8px",
            }}
          >
            Ngày thi của cậu là bao giờ? <span style={{ color: "red" }}>*</span>
          </label>
          <input
            type="date"
            value={tempExamDate}
            min={new Date().toISOString().split("T")[0]}
            onChange={(e) => setTempExamDate(e.target.value)}
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: "6px",
              border: "1px solid #d1d5db",
              fontFamily: "inherit",
            }}
            required
          />
          {tempExamDate && (
            <p
              style={{
                marginTop: "10px",
                color: "#b91c1c",
                fontWeight: "bold",
                fontSize: "0.9rem",
                margin: "10px 0 0 0",
              }}
            >
              🚨 Chỉ còn {calculateDaysLeft(tempExamDate)} ngày nữa là lên thớt!
            </p>
          )}
        </div>

        <div className="cram-slider-container">
          <label
            style={{
              display: "block",
              fontWeight: "bold",
              color: "#92400e",
              marginBottom: "10px",
            }}
          >
            Tỷ lệ thẻ khó ngày cuối:{" "}
            <span style={{ fontSize: "1.2rem", color: "#d97706" }}>
              {bossModePercent}%
            </span>
          </label>
          <input
            type="range"
            min="10"
            max="100"
            step="5"
            value={bossModePercent}
            onChange={(e) => setBossModePercent(e.target.value)}
            style={{ width: "100%", cursor: "pointer", accentColor: "#f59e0b" }}
          />
        </div>

        <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: "12px",
              background: "#e2e8f0",
              border: "none",
              borderRadius: "8px",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            Hủy bỏ
          </button>
          <button
            onClick={handleStartCramMode}
            style={{
              flex: 1,
              padding: "12px",
              background: "#f59e0b",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            🔥 Bắt đầu cháy!
          </button>
        </div>
      </div>
    </div>
  );
};

export default CramModeModal;
