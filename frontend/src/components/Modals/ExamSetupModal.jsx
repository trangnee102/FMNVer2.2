// frontend/src/components/Modals/ExamSetupModal.jsx
import React, { useState, useEffect } from "react";
import BaseSetupModal from "./BaseSetupModal"; // 👉 Nhúng Component Cha
import "./ExamSetupModal.css";

const ExamSetupModal = ({ isOpen, onClose, selectedExam, onNavigate }) => {
  const [selectedMode, setSelectedMode] = useState("NORMAL");
  const [examDate, setExamDate] = useState("");
  const [bossModePercent, setBossModePercent] = useState(30);

  useEffect(() => {
    if (isOpen && selectedExam) {
      setSelectedMode("NORMAL");
      const savedSettings =
        JSON.parse(localStorage.getItem(`cram_settings_${selectedExam.id}`)) ||
        {};
      setBossModePercent(savedSettings.bossModePercent || 30);
      setExamDate(savedSettings.examDate || selectedExam.exam_date || "");
    }
  }, [isOpen, selectedExam]);

  const handleStart = () => {
    if (!selectedExam) return;

    if (selectedMode === "CRAM") {
      if (!examDate) {
        alert(
          "⚠️ Bạn phải chọn Ngày thi để hệ thống kích hoạt thuật toán ép xung!",
        );
        return;
      }
      const cramSettings = { examDate, bossModePercent };
      localStorage.setItem(
        `cram_settings_${selectedExam.id}`,
        JSON.stringify(cramSettings),
      );
      onNavigate("cram-review", selectedExam.id);
    } else if (selectedMode === "SPACED") {
      onNavigate("spaced-review", selectedExam.id);
    } else {
      onNavigate("exam", selectedExam.id);
    }

    onClose();
  };

  if (!isOpen || !selectedExam) return null;

  const displayTitle = selectedExam?.title || "Đề thi";
  const cleanTitle = displayTitle.replace(/\(ai generated\)/gi, "").trim();

  // 👉 ĐÓNG GÓI SUBTITLE
  const subtitleContent = (
    <span>
      Chọn phương pháp học phù hợp nhất cho: <strong>{cleanTitle}</strong>
    </span>
  );

  // 👉 ĐÓNG GÓI NÚT BẤM DƯỚI CÙNG
  const actionButtons = (
    <>
      <button className="esm-btn-cancel" onClick={onClose}>
        Hủy bỏ
      </button>
      <button
        className={`esm-btn-start ${selectedMode === "NORMAL" ? "btn-normal" : selectedMode === "SPACED" ? "btn-spaced" : "btn-cram"}`}
        onClick={handleStart}
      >
        {selectedMode === "NORMAL" && "Bắt đầu làm bài"}
        {selectedMode === "SPACED" && "Kích hoạt AI Coach"}
        {selectedMode === "CRAM" && "🔥 Bật lò luyện"}
      </button>
    </>
  );

  return (
    // 👉 GỌI COMPONENT CHA VÀ TRUYỀN PROPS VÀO
    <BaseSetupModal
      isOpen={isOpen}
      onClose={onClose}
      icon={<i className="fa-solid fa-sliders"></i>}
      title="Thiết Lập Đề Thi"
      subtitle={subtitleContent}
      actions={actionButtons}
    >
      {/* SECTION CHỌN CHẾ ĐỘ (Được ném vào làm children của BaseSetupModal) */}
      <div className="esm-modes-grid">
        <div
          className={`esm-mode-card ${selectedMode === "NORMAL" ? "active-normal" : ""}`}
          onClick={() => setSelectedMode("NORMAL")}
        >
          <div className="esm-mode-icon" style={{ color: "#3b82f6" }}>
            🎯
          </div>
          <div className="esm-mode-info">
            <h4>Thi Thử (Mặc định)</h4>
            <p>
              Mô phỏng thi thực tế có tính thời gian, xáo trộn câu hỏi và chấm
              điểm tự động.
            </p>
          </div>
        </div>

        <div
          className={`esm-mode-card ${selectedMode === "SPACED" ? "active-spaced" : ""}`}
          onClick={() => setSelectedMode("SPACED")}
        >
          <div className="esm-mode-icon" style={{ color: "#10b981" }}>
            🧠
          </div>
          <div className="esm-mode-info">
            <h4>Ôn Tập Khắc Sâu (AI Coach)</h4>
            <p>
              Học theo thuật toán Spaced Repetition. AI sẽ tính toán thời điểm
              hoàn hảo để nhắc lại kiến thức.
            </p>
          </div>
        </div>

        <div
          className={`esm-mode-card ${selectedMode === "CRAM" ? "active-cram" : ""}`}
          onClick={() => setSelectedMode("CRAM")}
        >
          <div className="esm-mode-icon" style={{ color: "#f59e0b" }}>
            ⚡
          </div>
          <div className="esm-mode-info">
            <h4>Nhồi Nhét Cấp Tốc</h4>
            <p>
              Bật "Lò luyện" trước ngày thi. Ép xung trí nhớ bằng cách xoáy liên
              tục vào các câu hay sai.
            </p>
          </div>
        </div>
      </div>

      {selectedMode === "CRAM" && (
        <div className="esm-cram-settings">
          <label>
            Ngày thi chính thức của bạn là khi nào?{" "}
            <span style={{ color: "red" }}>*</span>
          </label>
          <input
            type="date"
            className="esm-input-date"
            value={examDate}
            min={new Date().toISOString().split("T")[0]}
            onChange={(e) => setExamDate(e.target.value)}
          />

          <label>
            Tỷ lệ câu siêu khó (Boss Mode):{" "}
            <span style={{ color: "#f59e0b" }}>{bossModePercent}%</span>
          </label>
          <input
            type="range"
            className="esm-input-range"
            min="10"
            max="100"
            step="5"
            value={bossModePercent}
            onChange={(e) => setBossModePercent(e.target.value)}
          />
        </div>
      )}
    </BaseSetupModal>
  );
};

export default ExamSetupModal;