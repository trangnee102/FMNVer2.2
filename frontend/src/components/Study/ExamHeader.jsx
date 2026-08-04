// frontend/src/components/Study/ExamHeader.jsx
import React from "react";
import "./ExamHeader.css";

const ExamHeader = ({
  isSubmitted,
  examMode,
  timeLeft,
  answeredCount,
  totalQuestions,
  progressPercent,
  onFinish,
}) => {
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const handleBackClick = () => {
    if (
      !isSubmitted &&
      !window.confirm("Thoát bây giờ sẽ mất toàn bộ tiến trình. Vẫn thoát?")
    ) {
      return;
    }
    onFinish();
  };

  return (
    <>
      <header className="exam-header-container">
        <div className="exam-header-left">
          <button
            onClick={handleBackClick}
            className="exam-back-btn"
            title="Quay lại"
          >
            <i className="fa-solid fa-arrow-left"></i>
          </button>
          <h2 className="exam-header-title">
            {isSubmitted
              ? "Bảng Điểm & Chi Tiết"
              : examMode === "exam"
                ? "Kiểm Tra Trắc Nghiệm ⏳"
                : "Ôn Luyện Trắc Nghiệm 🧠"}
          </h2>
        </div>

        {!isSubmitted && (
          <div className="exam-header-right">
            {examMode === "exam" && (
              <div
                className={`exam-timer ${timeLeft <= 60 ? "warning" : "normal"}`}
              >
                <i className="fa-solid fa-stopwatch"></i>
                <span className="exam-timer-text">{formatTime(timeLeft)}</span>
              </div>
            )}
            <div className="exam-answered-badge">
              Đã trả lời: {answeredCount} / {totalQuestions}
            </div>
          </div>
        )}
      </header>

      {/* THANH TIẾN ĐỘ */}
      <div className="exam-progress-bar-bg">
        <div
          className="exam-progress-bar-fill"
          style={{
            width: `${progressPercent}%`,
            backgroundColor: isSubmitted ? "#10b981" : "#8b5cf6",
          }}
        ></div>
      </div>
    </>
  );
};

export default ExamHeader;
