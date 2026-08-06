// frontend/src/components/Study/ExamQuestion.jsx
import React from "react";
import "./ExamQuestion.css";
import {
  isOptionCorrect,
  isFillBlankCorrect,
  getFillBlankAnswerLabel,
  maskFillBlankQuestion,
} from "../../utils/examAnswers";

const ExamQuestion = ({
  currentQ,
  currentIndex,
  totalQuestions,
  examMode,
  selectedAnswer, // Đáp án người dùng chọn cho câu này
  isCurrentQChecked, // Trạng thái đã bấm "Kiểm tra" (Practice mode)
  handleSelectOption,
  handleCheckCurrentQuestion,
  handlePrev,
  handleNext,
  handleSubmit,
  isQuestionAnswered,
}) => {
  // --- Các hàm Helper nội bộ ---
  const parseSafeJSON = (str, fallback = []) => {
    if (!str) return fallback;
    try {
      return JSON.parse(str);
    } catch {
      return fallback;
    }
  };

  // Khởi tạo các biến kiểm tra dạng câu hỏi
  const options = parseSafeJSON(currentQ.options);
  const isMultiple = currentQ.question_type === "MULTIPLE_CHOICE";
  const isFillBlank = currentQ.question_type === "FILL_BLANK";

  // Xác định màu viền cho ô điền khuyết (nếu đã kiểm tra)
  const getFillBlankBorder = () => {
    if (!isCurrentQChecked) return "#3b82f6";
    return isFillBlankCorrect(selectedAnswer, currentQ.correct_answers)
      ? "#10b981"
      : "#ef4444";
  };

  return (
    <div className="exam-question-container">
      <div className="exam-question-card">
        <div className="eq-header">
          <span className="eq-number">
            Câu {currentIndex + 1} / {totalQuestions}
          </span>
          <span className="eq-difficulty">
            {currentQ.difficulty || "Mặc định"}
          </span>
        </div>

        <h3 className="eq-text">
          {isFillBlank
            ? maskFillBlankQuestion(
                currentQ.question ||
                  currentQ.front ||
                  currentQ.front_text ||
                  "Không có nội dung câu hỏi",
              )
            : currentQ.question ||
              currentQ.front ||
              currentQ.front_text ||
              "Không có nội dung câu hỏi"}
        </h3>

        {isMultiple && (
          <p className="eq-multiple-note">
            <i className="fa-solid fa-list-check"></i> Câu hỏi chọn Nhiều đáp án
            (Có thể chọn hơn 1 lựa chọn)
          </p>
        )}

        {/* --- Ô NHẬP LIỆU CHO CÂU ĐIỀN KHUYẾT --- */}
        {isFillBlank ? (
          <div className="eq-fill-container">
            <label className="eq-fill-label">
              <i className="fa-solid fa-keyboard"></i> Gõ câu trả lời của bạn
              vào ô trống dưới đây:
            </label>
            <input
              type="text"
              placeholder="Nhập đáp án của bạn..."
              value={selectedAnswer || ""}
              onChange={(e) => handleSelectOption(e.target.value)}
              disabled={isCurrentQChecked}
              className="eq-fill-input"
              style={{
                border: `2px solid ${getFillBlankBorder()}`,
              }}
            />
          </div>
        ) : (
          /* --- NÚT BẤM CHO CÂU TRẮC NGHIỆM --- */
          <div
            className="eq-options-list"
            style={{ marginTop: isMultiple ? "0" : "25px" }}
          >
            {options.map((opt, idx) => {
              const isSelected = isMultiple
                ? (selectedAnswer || []).includes(opt)
                : selectedAnswer === opt;

              const isCorrectAnswer = isOptionCorrect(
                idx,
                currentQ.correct_answers,
                options,
              );

              let bg = "var(--bg-main)";
              let border = "2px solid var(--border)";
              let color = "var(--text-dark)";

              // Logic tô màu khi đã kiểm tra hoặc khi đang chọn
              if (isCurrentQChecked) {
                if (isCorrectAnswer) {
                  bg = "rgba(16, 185, 129, 0.1)";
                  border = "2px solid #10b981";
                  color = "#10b981";
                } else if (isSelected && !isCorrectAnswer) {
                  bg = "rgba(239, 68, 68, 0.1)";
                  border = "2px solid #ef4444";
                  color = "#ef4444";
                }
              } else if (isSelected) {
                bg = "rgba(139, 92, 246, 0.1)";
                border = "2px solid #8b5cf6";
                color = "#8b5cf6";
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleSelectOption(opt)}
                  disabled={isCurrentQChecked}
                  className={`eq-option-btn ${!isCurrentQChecked ? "hover-active" : ""}`}
                  style={{
                    backgroundColor: bg,
                    border: border,
                    color: color,
                    cursor: isCurrentQChecked ? "default" : "pointer",
                    opacity:
                      isCurrentQChecked && !isCorrectAnswer && !isSelected
                        ? 0.6
                        : 1,
                  }}
                >
                  <div className="eq-option-content">
                    {!isCurrentQChecked && (
                      <i
                        className={`fa-regular ${
                          isMultiple
                            ? isSelected
                              ? "fa-square-check"
                              : "fa-square"
                            : isSelected
                              ? "fa-circle-dot"
                              : "fa-circle"
                        }`}
                        style={{
                          fontSize: "1.2rem",
                          color: isSelected ? "#8b5cf6" : "var(--text-gray)",
                        }}
                      ></i>
                    )}
                    <span>{opt}</span>
                  </div>

                  {isCurrentQChecked && isCorrectAnswer && (
                    <i
                      className="fa-solid fa-check"
                      style={{ color: "#10b981", fontSize: "1.2rem" }}
                    ></i>
                  )}
                  {isCurrentQChecked && isSelected && !isCorrectAnswer && (
                    <i
                      className="fa-solid fa-xmark"
                      style={{ color: "#ef4444", fontSize: "1.2rem" }}
                    ></i>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* --- KHU VỰC GIẢI THÍCH (Chỉ hiện trong Practice mode khi đã check) --- */}
        {isCurrentQChecked &&
          (currentQ.explanation ||
            currentQ.source_reference ||
            currentQ.keywords) && (
            <div className="eq-academic-box">
              {isFillBlank && (
                <div style={{ marginBottom: "10px" }}>
                  <strong
                    style={{
                      color: "#10b981",
                      display: "block",
                      fontSize: "1.1rem",
                    }}
                  >
                    <i className="fa-solid fa-check-double"></i> Đáp án đúng:{" "}
                    {getFillBlankAnswerLabel(currentQ.correct_answers)}
                  </strong>
                </div>
              )}
              {currentQ.explanation && (
                <div>
                  <strong
                    style={{
                      color: "#3b82f6",
                      display: "block",
                      marginBottom: "5px",
                    }}
                  >
                    <i className="fa-solid fa-lightbulb"></i> Giải thích chi
                    tiết:
                  </strong>
                  <span
                    style={{
                      color: "var(--text-dark)",
                      lineHeight: "1.6",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {currentQ.explanation}
                  </span>
                </div>
              )}
              {currentQ.source_reference && (
                <div>
                  <strong
                    style={{
                      color: "#f59e0b",
                      display: "block",
                      marginBottom: "5px",
                      marginTop: "8px",
                    }}
                  >
                    <i className="fa-solid fa-book-open"></i> Nguồn tham chiếu:
                  </strong>
                  <span
                    style={{
                      color: "var(--text-gray)",
                      fontStyle: "italic",
                      lineHeight: "1.6",
                    }}
                  >
                    "{currentQ.source_reference}"
                  </span>
                </div>
              )}
              {currentQ.keywords && (
                <div style={{ marginTop: "5px" }}>
                  <strong
                    style={{
                      color: "#8b5cf6",
                      display: "block",
                      marginBottom: "8px",
                    }}
                  >
                    <i className="fa-solid fa-tags"></i> Từ khóa:
                  </strong>
                  <div
                    style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}
                  >
                    {currentQ.keywords.split(",").map((kw, i) => (
                      <span
                        key={i}
                        style={{
                          padding: "4px 10px",
                          border: "1px solid var(--border)",
                          borderRadius: "12px",
                          backgroundColor: "white",
                          fontSize: "0.85rem",
                          fontWeight: "bold",
                        }}
                      >
                        {kw.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
      </div>

      {/* --- CÁC NÚT ĐIỀU HƯỚNG --- */}
      <div className="eq-nav-container">
        <button
          className="eq-btn eq-btn-prev"
          onClick={handlePrev}
          disabled={currentIndex === 0}
          style={{
            color: currentIndex === 0 ? "var(--text-gray)" : "var(--text-dark)",
          }}
        >
          <i className="fa-solid fa-chevron-left"></i> Câu Trước
        </button>

        <div style={{ display: "flex", gap: "15px" }}>
          {examMode === "practice" && !isCurrentQChecked && (
            <button
              className="eq-btn eq-btn-check"
              onClick={handleCheckCurrentQuestion}
              disabled={!isQuestionAnswered}
              style={{
                backgroundColor: isQuestionAnswered
                  ? "#f59e0b"
                  : "var(--text-gray)",
                boxShadow: isQuestionAnswered
                  ? "0 4px 12px rgba(245, 158, 11, 0.3)"
                  : "none",
              }}
            >
              Kiểm tra ngay <i className="fa-solid fa-magnifying-glass"></i>
            </button>
          )}

          {currentIndex === totalQuestions - 1 ? (
            <button
              className="eq-btn eq-btn-submit"
              onClick={handleSubmit}
              disabled={examMode === "exam" ? !isQuestionAnswered : false}
              style={{
                backgroundColor:
                  examMode === "exam" && !isQuestionAnswered
                    ? "var(--text-gray)"
                    : "#10b981",
                boxShadow:
                  examMode === "exam" && !isQuestionAnswered
                    ? "none"
                    : "0 4px 12px rgba(16,185,129,0.3)",
              }}
            >
              {examMode === "exam" ? "Nộp Bài Thi" : "Xem Tổng Kết"}{" "}
              <i className="fa-solid fa-flag-checkered"></i>
            </button>
          ) : (
            <button className="eq-btn eq-btn-next" onClick={handleNext}>
              Câu Tiếp <i className="fa-solid fa-chevron-right"></i>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExamQuestion;
