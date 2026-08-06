// frontend/src/components/Study/ExamResult.jsx
import React from "react";
import "./ExamResult.css";

const ExamResult = ({ questions, selectedAnswers, score, onFinish }) => {
  // --- Các hàm Helper nội bộ ---
  const parseSafeJSON = (str, fallback = []) => {
    if (!str) return fallback;
    try {
      return JSON.parse(str);
    } catch {
      return fallback;
    }
  };

  const getCorrectLetters = (ansStr) => {
    if (!ansStr) return [];
    try {
      const parsed = JSON.parse(ansStr);
      if (Array.isArray(parsed))
        return parsed.map((s) => String(s).trim().toUpperCase());
      return [String(parsed).trim().toUpperCase()];
    } catch {
      return ansStr.split(",").map((s) => s.trim().toUpperCase());
    }
  };

  const getLetterFromOption = (opt) => {
    if (!opt) return "";
    const match = opt.match(/^([A-D])/i);
    return match ? match[1].toUpperCase() : opt.charAt(0).toUpperCase();
  };

  const scorePercentage = questions.length > 0 ? score / questions.length : 0;
  const borderColor = scorePercentage >= 0.5 ? "#10b981" : "#ef4444";
  const scoreOn10 = (scorePercentage * 10).toFixed(1);

  return (
    <div className="exam-result-container">
      {/* BẢNG TỔNG KẾT ĐIỂM */}
      <div className="result-summary-card">
        <h2 className="result-summary-title">Kết Quả Tổng Kết</h2>
        <div className="score-display-wrapper">
          <div
            className="score-circle"
            style={{ border: `8px solid ${borderColor}` }}
          >
            <span className="score-percentage">
              {Math.round(scorePercentage * 100)}%
            </span>
          </div>
          <div className="score-text-group">
            <p className="score-label">Số câu đúng:</p>
            <p className="score-value">
              <span className="score-value-correct">{score}</span> /{" "}
              {questions.length}
            </p>
            <p className="score-scaled">
              Điểm quy đổi (thang 10):{" "}
              <span className="score-scaled-value">{scoreOn10}</span>
            </p>
          </div>
        </div>
        <p className="result-message">
          {scorePercentage >= 0.8
            ? "🎉 Cậu đỉnh quá, giữ vững phong độ nhé!"
            : scorePercentage >= 0.5
              ? "👍 Cố gắng thêm chút nữa là hoàn hảo!"
              : "💪 Sai sót là mẹ thành công, xem lại phần giải thích bên dưới nhé!"}
        </p>
      </div>

      {/* DANH SÁCH CHỮA BÀI TỪNG CÂU */}
      {questions.map((q, idx) => {
        const qOptions = parseSafeJSON(q.options);
        const correctLetters = getCorrectLetters(q.correct_answers);
        const qIsMultiple = q.question_type === "MULTIPLE_CHOICE";
        const qIsFillBlank = q.question_type === "FILL_BLANK";
        const userAns = selectedAnswers[idx];

        // 👉 NÂNG CẤP UX: Kiểm tra xem người dùng có bỏ trống câu này không?
        const isBlank = qIsMultiple
          ? !userAns || userAns.length === 0
          : !userAns || String(userAns).trim() === "";

        let isFillBlankCorrect = false;
        if (qIsFillBlank && !isBlank) {
          isFillBlankCorrect =
            String(userAns).trim().toLowerCase() ===
            String(q.correct_answers).trim().toLowerCase();
        }

        return (
          <div
            key={idx}
            className="review-card"
            style={{
              // Nếu bỏ trống, làm mờ card đi một chút để người dùng dễ phân biệt
              opacity: isBlank ? 0.85 : 1,
              border: isBlank
                ? "1px dashed #f59e0b"
                : "1px solid var(--border)",
            }}
          >
            <div className="review-card-header">
              <span className="review-q-number">
                Câu {idx + 1} / {questions.length}
              </span>
              <div
                style={{ display: "flex", gap: "10px", alignItems: "center" }}
              >
                {/* HIỂN THỊ TAG NẾU BỎ TRỐNG */}
                {isBlank && (
                  <span
                    style={{
                      backgroundColor: "rgba(245, 158, 11, 0.1)",
                      color: "#b45309",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      fontSize: "0.8rem",
                      fontWeight: "bold",
                      border: "1px solid #fcd34d",
                    }}
                  >
                    <i className="fa-solid fa-triangle-exclamation"></i> Bỏ
                    trống
                  </span>
                )}
                <span className="review-difficulty">
                  {q.difficulty || "Mặc định"}
                </span>
              </div>
            </div>

            <h3 className="review-question-text">{q.question}</h3>

            {/* UI CHỮA BÀI CHO CÂU ĐIỀN KHUYẾT */}
            {qIsFillBlank ? (
              <div className="review-fill-blank-group">
                <div
                  className="review-fill-user"
                  style={{
                    border: `2px solid ${
                      isBlank
                        ? "#f59e0b" // Màu cam nếu bỏ trống
                        : isFillBlankCorrect
                          ? "#10b981"
                          : "#ef4444"
                    }`,
                    backgroundColor: isBlank
                      ? "rgba(245, 158, 11, 0.05)"
                      : "transparent",
                  }}
                >
                  <span style={{ color: "var(--text-gray)" }}>
                    Bạn điền:{" "}
                    <strong
                      style={{ color: "var(--text-dark)", fontSize: "1.1rem" }}
                    >
                      {userAns || "(Trống)"}
                    </strong>
                  </span>
                  {!isBlank && (
                    <i
                      className={`fa-solid ${
                        isFillBlankCorrect ? "fa-check" : "fa-xmark"
                      }`}
                      style={{
                        color: isFillBlankCorrect ? "#10b981" : "#ef4444",
                        fontSize: "1.2rem",
                      }}
                    ></i>
                  )}
                </div>

                {(!isFillBlankCorrect || isBlank) && (
                  <div className="review-fill-correct">
                    <span style={{ color: "#10b981", fontWeight: "bold" }}>
                      Đáp án đúng: {q.correct_answers}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              /* UI CHỮA BÀI CHO TRẮC NGHIỆM */
              <div className="review-options-group">
                {qOptions.map((opt, oIdx) => {
                  const optLetter = getLetterFromOption(opt);
                  const isSelected = qIsMultiple
                    ? (userAns || []).includes(opt)
                    : userAns === opt;
                  const isCorrect = correctLetters.includes(optLetter);

                  let bg = "var(--bg-main)";
                  let border = "2px solid var(--border)";
                  let color = "var(--text-dark)";

                  // Logic ưu tiên: Đánh dấu đáp án Đúng lên trước
                  if (isCorrect) {
                    bg = "rgba(16, 185, 129, 0.1)";
                    border = "2px solid #10b981";
                    color = "#10b981";
                  }
                  // Chỉ hiển thị màu Sai nếu câu đó không bị bỏ trống
                  else if (isSelected && !isCorrect && !isBlank) {
                    bg = "rgba(239, 68, 68, 0.1)";
                    border = "2px solid #ef4444";
                    color = "#ef4444";
                  }
                  // Các đáp án sai mà không chọn thì để xám nhạt (nhất là khi bỏ trống)
                  else if (isBlank && !isCorrect) {
                    bg = "rgba(156, 163, 175, 0.05)";
                    border = "1px solid #d1d5db";
                    color = "#9ca3af";
                  }

                  return (
                    <div
                      key={oIdx}
                      className="review-option-item"
                      style={{
                        backgroundColor: bg,
                        border: border,
                        color: color,
                        opacity: isBlank && !isCorrect ? 0.6 : 1, // Làm mờ nhẹ đi nếu bỏ trống
                      }}
                    >
                      <div className="review-option-content">
                        <span>{opt}</span>
                      </div>
                      {isCorrect && (
                        <i
                          className="fa-solid fa-check"
                          style={{ color: "#10b981", fontSize: "1.2rem" }}
                        ></i>
                      )}
                      {isSelected && !isCorrect && !isBlank && (
                        <i
                          className="fa-solid fa-xmark"
                          style={{ color: "#ef4444", fontSize: "1.2rem" }}
                        ></i>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* KHU VỰC HIỂN THỊ DỮ LIỆU HỌC THUẬT AI TẠO */}
            {(q.explanation || q.source_reference || q.keywords) && (
              <div className="review-academic-box">
                {q.explanation && (
                  <div>
                    <strong className="academic-title explanation">
                      <i className="fa-solid fa-lightbulb"></i> Giải thích:
                    </strong>
                    <span
                      style={{
                        color: "var(--text-dark)",
                        lineHeight: "1.6",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {q.explanation}
                    </span>
                  </div>
                )}
                {q.source_reference && (
                  <div>
                    <strong className="academic-title source">
                      <i className="fa-solid fa-book-open"></i> Trích dẫn nguồn:
                    </strong>
                    <span
                      style={{
                        color: "var(--text-gray)",
                        fontStyle: "italic",
                        lineHeight: "1.6",
                      }}
                    >
                      "{q.source_reference}"
                    </span>
                  </div>
                )}
                {q.keywords && (
                  <div style={{ marginTop: "10px" }}>
                    <strong className="academic-title keywords">
                      <i className="fa-solid fa-tags"></i> Từ khóa trọng tâm:
                    </strong>
                    <div
                      style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}
                    >
                      {q.keywords.split(",").map((kw, kIdx) => (
                        <span key={kIdx} className="keyword-tag">
                          {kw.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      <button onClick={onFinish} className="exit-exam-btn">
        Thoát Phòng Thi <i className="fa-solid fa-right-from-bracket"></i>
      </button>
    </div>
  );
};

export default ExamResult;