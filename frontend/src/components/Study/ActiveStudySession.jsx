// frontend/src/components/Study/ActiveStudySession.jsx
import React, { useState, useEffect } from "react";
import useCramMode from "../../hooks/useCramMode"; // 👉 Bơm lõi thuật toán Cram Mode vào đây
import "../../pages/ReviewPage.css";
import "./ActiveStudySession.css";

const ActiveStudySession = ({ deckId, onFinish }) => {
  // Lấy toàn bộ bộ đồ nghề từ hook useCramMode (Đã lo hết việc gọi API và vòng lặp)
  const {
    cramQueue,
    fullBatch,
    cycleCount,
    stage,
    countdown,
    correctCount,
    wrongCount,
    totalThisRound,
    isFlipped,
    setIsFlipped,
    isLoading,
    handleCramRating,
  } = useCramMode(deckId, onFinish);

  // States hỗ trợ Tự động chấm điểm (Auto-grading)
  const [evaluating, setEvaluating] = useState(false);
  const [selectedOpt, setSelectedOpt] = useState(null);
  const [fillText, setFillText] = useState("");

  const currentCard = cramQueue[0];

  // Reset state mỗi khi lướt sang thẻ mới
  useEffect(() => {
    setEvaluating(false);
    setSelectedOpt(null);
    setFillText("");
    setIsFlipped(false);
  }, [currentCard]);

  // ==========================================
  // BỘ CÔNG CỤ CHẤM ĐIỂM TỰ ĐỘNG
  // ==========================================
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

  const handleMCQClick = (opt) => {
    if (evaluating) return;
    setSelectedOpt(opt);
    setEvaluating(true);

    const correctLetters = getCorrectLetters(currentCard.correct_answers);
    const userLetter = getLetterFromOption(opt);
    const isCorrect = correctLetters.includes(userLetter);

    // Đợi 2s để người dùng xem màu Đỏ/Xanh rồi tự động chuyển câu
    setTimeout(() => {
      handleCramRating(isCorrect);
    }, 2000);
  };

  const handleFillSubmit = () => {
    if (evaluating || !fillText.trim()) return;
    setEvaluating(true);

    const correct = String(currentCard.correct_answers || "")
      .trim()
      .toLowerCase();
    const user = fillText.trim().toLowerCase();
    const isCorrect = correct === user;

    setTimeout(() => {
      handleCramRating(isCorrect);
    }, 2000);
  };

  // Bắt phím Space cho thẻ Flashcard cơ bản
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (stage !== "learning" || evaluating || !currentCard) return;

      const rawType = (
        currentCard.question_type ||
        currentCard.type ||
        "FLASHCARD"
      ).toUpperCase();
      const isFlashcard = ![
        "MULTIPLE_CHOICE",
        "SINGLE_CHOICE",
        "TRUE_FALSE",
        "FILL_BLANK",
      ].includes(rawType);

      if (isFlashcard) {
        if (e.code === "Space") {
          e.preventDefault();
          setIsFlipped(true);
        }
        if (isFlipped) {
          if (e.key === "1") handleCramRating(false); // 1 = Sai
          if (e.key === "2") handleCramRating(true); // 2 = Đúng
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFlipped, stage, currentCard, evaluating, handleCramRating]);

  // ==========================================
  // CÁC MÀN HÌNH ĐIỀU HƯỚNG VÀ TỔNG KẾT
  // ==========================================
  if (isLoading)
    return (
      <div
        className="ass-loading-state"
        style={{
          textAlign: "center",
          padding: "50px",
          color: "var(--text-gray)",
        }}
      >
        <i
          className="fa-solid fa-fire fa-bounce"
          style={{ fontSize: "3rem", color: "#f59e0b", marginBottom: "15px" }}
        ></i>
        <br />
        Đang nung nóng lò luyện...
      </div>
    );

  if (fullBatch.length === 0)
    return (
      <div
        className="ass-modal-overlay"
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "80vh",
        }}
      >
        <div
          className="ass-modal-card"
          style={{
            background: "var(--bg-card)",
            padding: "40px",
            borderRadius: "16px",
            textAlign: "center",
            maxWidth: "500px",
            width: "100%",
            border: "1px dashed var(--border)",
          }}
        >
          <div style={{ fontSize: "4rem", marginBottom: "15px", opacity: 0.5 }}>
            📭
          </div>
          <h2 style={{ color: "var(--text-dark)", marginBottom: "15px" }}>
            Dữ liệu trống
          </h2>
          <p style={{ color: "var(--text-gray)", marginBottom: "30px" }}>
            Không tìm thấy câu hỏi hoặc thẻ ghi nhớ nào để luyện tập.
          </p>
          <button
            onClick={onFinish}
            style={{
              padding: "12px 24px",
              background: "var(--primary)",
              color: "white",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            Trở về
          </button>
        </div>
      </div>
    );

  if (stage === "finished")
    return (
      <div
        className="review-page-container ass-modal-overlay"
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "80vh",
        }}
      >
        <div
          className="ass-modal-card"
          style={{
            background: "var(--bg-card)",
            padding: "40px",
            borderRadius: "20px",
            textAlign: "center",
            maxWidth: "450px",
            width: "100%",
            borderTop: "5px solid #10b981",
            boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
          }}
        >
          <div style={{ fontSize: "4rem", marginBottom: "10px" }}>🏆</div>
          <h2
            style={{
              color: "#10b981",
              fontSize: "2rem",
              marginBottom: "15px",
              fontWeight: "bold",
            }}
          >
            Tốt nghiệp Lò Luyện!
          </h2>
          <p
            style={{
              color: "var(--text-gray)",
              fontSize: "1.1rem",
              marginBottom: "30px",
            }}
          >
            Tuyệt vời! Bạn đã trả lời đúng trọn vẹn {fullBatch.length}/
            {fullBatch.length} câu hỏi.
          </p>
          <button
            onClick={onFinish}
            style={{
              width: "100%",
              padding: "16px",
              background: "#10b981",
              color: "white",
              border: "none",
              borderRadius: "12px",
              fontWeight: "bold",
              fontSize: "1.1rem",
              cursor: "pointer",
            }}
          >
            Kết thúc phiên học
          </button>
        </div>
      </div>
    );

  if (stage === "summary")
    return (
      <div
        className="review-page-container ass-modal-overlay"
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "80vh",
        }}
      >
        <div
          className="ass-modal-card"
          style={{
            background: "var(--bg-card)",
            padding: "40px",
            borderRadius: "20px",
            textAlign: "center",
            maxWidth: "450px",
            width: "100%",
            borderTop: "5px solid #f59e0b",
            boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
          }}
        >
          <h2
            style={{
              color: "#f59e0b",
              fontSize: "1.8rem",
              marginBottom: "15px",
              fontWeight: "bold",
            }}
          >
            Tổng kết Vòng {cycleCount}
          </h2>
          <div
            style={{
              display: "flex",
              justifyContent: "space-around",
              margin: "30px 0",
            }}
          >
            <div
              style={{
                flex: 1,
                background: "rgba(16, 185, 129, 0.1)",
                padding: "20px",
                borderRadius: "16px",
                border: "1px solid rgba(16, 185, 129, 0.2)",
                margin: "0 10px",
              }}
            >
              <div
                style={{
                  fontSize: "2.5rem",
                  fontWeight: "900",
                  color: "#10b981",
                }}
              >
                {correctCount}
              </div>
              <div
                style={{
                  color: "#059669",
                  fontSize: "0.95rem",
                  fontWeight: "700",
                  marginTop: "5px",
                }}
              >
                Câu Đúng
              </div>
            </div>
            <div
              style={{
                flex: 1,
                background: "rgba(239, 68, 68, 0.1)",
                padding: "20px",
                borderRadius: "16px",
                border: "1px solid rgba(239, 68, 68, 0.2)",
                margin: "0 10px",
              }}
            >
              <div
                style={{
                  fontSize: "2.5rem",
                  fontWeight: "900",
                  color: "#ef4444",
                }}
              >
                {wrongCount}
              </div>
              <div
                style={{
                  color: "#b91c1c",
                  fontSize: "0.95rem",
                  fontWeight: "700",
                  marginTop: "5px",
                }}
              >
                Câu Sai
              </div>
            </div>
          </div>
          {wrongCount > 0 ? (
            <p
              style={{
                color: "var(--text-gray)",
                fontSize: "1.1rem",
                marginBottom: "20px",
              }}
            >
              Vòng tiếp theo tập trung vào <strong>{wrongCount} câu sai</strong>
              ...
            </p>
          ) : (
            <p
              style={{
                color: "#10b981",
                fontSize: "1.1rem",
                marginBottom: "20px",
                fontWeight: "bold",
              }}
            >
              Kích hoạt vòng làm lại toàn bộ...
            </p>
          )}
          <div
            style={{
              fontSize: "5rem",
              fontWeight: "900",
              color: "#8b5cf6",
              animation: "pulse 1s infinite",
            }}
          >
            {countdown}
          </div>
        </div>
      </div>
    );

  // ==========================================
  // GIAO DIỆN HỌC CHÍNH (LEARNING)
  // ==========================================
  if (!currentCard) return null;

  const rawType = (
    currentCard.question_type ||
    currentCard.type ||
    "FLASHCARD"
  ).toUpperCase();
  const isMCQ = [
    "MULTIPLE_CHOICE",
    "SINGLE_CHOICE",
    "TRUE_FALSE",
    "MULTIPLE_ANSWER",
  ].includes(rawType);
  const isFillBlank = rawType === "FILL_BLANK";
  const isFlashcard = !isMCQ && !isFillBlank;

  let optionsList = [];
  if (isMCQ) {
    try {
      optionsList =
        typeof currentCard.options === "string"
          ? JSON.parse(currentCard.options)
          : currentCard.options || [];
    } catch (e) {
      optionsList = [];
    }
  }

  const correctLetters = getCorrectLetters(currentCard.correct_answers);
  const displayProgress = Math.min(
    totalThisRound - cramQueue.length + 1,
    totalThisRound,
  );
  const realTimePercent =
    totalThisRound > 0
      ? Math.round((displayProgress / totalThisRound) * 100)
      : 0;

  return (
    <div className="review-page-container">
      {/* HEADER */}
      <div className="review-header">
        <button className="btn-back" onClick={onFinish}>
          ← Rút lui
        </button>
        <div
          style={{
            fontWeight: "800",
            color: "#d97706",
            fontSize: "1rem",
            background: "#fffbeb",
            padding: "8px 16px",
            borderRadius: "10px",
            border: "1px solid #fde68a",
          }}
        >
          <i className="fa-solid fa-rotate-right"></i> VÒNG {cycleCount}
        </div>
        <div className="progress-bar">
          Câu {displayProgress} / {totalThisRound} ({realTimePercent}%)
        </div>
      </div>

      {/* KHUNG THỂ HIỆN CÂU HỎI (Tái sử dụng flashcard-container của bạn sếp nhưng không flip 3D đối với trắc nghiệm) */}
      <div
        className="flashcard-container"
        style={{
          cursor: isFlashcard ? "pointer" : "default",
          height: "auto",
          minHeight: "420px",
        }}
        onClick={() => {
          if (isFlashcard && !isFlipped) setIsFlipped(true);
        }}
      >
        {/* MẶT TRƯỚC (CHỨA CÂU HỎI & CHỖ CHỌN ĐÁP ÁN) */}
        <div
          className="card-face card-front"
          style={{
            position: isFlashcard && isFlipped ? "absolute" : "relative",
            transform: "none",
            backfaceVisibility: "visible",
            padding: "40px 30px",
          }}
        >
          <h3
            style={{
              fontSize: "1.6rem",
              color: "var(--text-dark)",
              lineHeight: "1.5",
              marginBottom: "30px",
              textAlign: "center",
            }}
          >
            {currentCard.question ||
              currentCard.front_content ||
              currentCard.content}
          </h3>

          {/* TRẮC NGHIỆM */}
          {isMCQ && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                width: "100%",
              }}
            >
              {optionsList.map((opt, idx) => {
                const optionLetter = getLetterFromOption(opt);
                const isThisCorrect = correctLetters.includes(optionLetter);
                const isThisSelected = selectedOpt === opt;

                let bg = "var(--bg-main)";
                let border = "1px solid var(--border)";
                let color = "var(--text-dark)";

                if (evaluating) {
                  if (isThisCorrect) {
                    bg = "#dcfce7";
                    border = "2px solid #10b981";
                    color = "#065f46";
                  } else if (isThisSelected) {
                    bg = "#fee2e2";
                    border = "2px solid #ef4444";
                    color = "#991b1b";
                  }
                } else if (isThisSelected) {
                  border = "2px solid #f59e0b";
                }

                return (
                  <button
                    key={idx}
                    onClick={() => handleMCQClick(opt)}
                    disabled={evaluating}
                    style={{
                      padding: "16px 20px",
                      borderRadius: "12px",
                      background: bg,
                      border: border,
                      color: color,
                      fontSize: "1.1rem",
                      fontWeight: "600",
                      textAlign: "left",
                      cursor: evaluating ? "default" : "pointer",
                      transition: "all 0.2s",
                    }}
                  >
                    {opt}
                  </button>
                );
              })}
              {evaluating && (
                <div
                  style={{
                    textAlign: "center",
                    marginTop: "15px",
                    color: correctLetters.includes(
                      getLetterFromOption(selectedOpt),
                    )
                      ? "#10b981"
                      : "#ef4444",
                    fontWeight: "bold",
                    fontSize: "1.2rem",
                    animation: "fadeIn 0.3s",
                  }}
                >
                  {correctLetters.includes(getLetterFromOption(selectedOpt))
                    ? "🎉 Chính xác!"
                    : "❌ Sai rồi!"}
                </div>
              )}
            </div>
          )}

          {/* ĐIỀN KHUYẾT */}
          {isFillBlank && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "20px",
                width: "100%",
              }}
            >
              <input
                type="text"
                value={fillText}
                onChange={(e) => setFillText(e.target.value)}
                disabled={evaluating}
                placeholder="Nhập đáp án của bạn..."
                style={{
                  width: "80%",
                  padding: "15px",
                  borderRadius: "10px",
                  border: "2px solid var(--border)",
                  fontSize: "1.2rem",
                  textAlign: "center",
                  outline: "none",
                }}
              />
              {evaluating && (
                <div
                  style={{
                    color: "#10b981",
                    fontSize: "1.2rem",
                    fontWeight: "bold",
                    animation: "fadeIn 0.3s",
                  }}
                >
                  Đáp án đúng: {currentCard.correct_answers}
                </div>
              )}
              <button
                onClick={handleFillSubmit}
                disabled={evaluating || !fillText.trim()}
                style={{
                  padding: "12px 40px",
                  background: "var(--primary)",
                  color: "white",
                  borderRadius: "10px",
                  fontSize: "1.1rem",
                  fontWeight: "bold",
                  border: "none",
                  cursor: evaluating ? "default" : "pointer",
                }}
              >
                Kiểm tra
              </button>
            </div>
          )}

          {/* FLASHCARD CƠ BẢN */}
          {isFlashcard && !isFlipped && (
            <p
              className="hint-text"
              style={{
                marginTop: "30px",
                color: "var(--primary)",
                fontWeight: "600",
              }}
            >
              (Nhấn Phím Cách hoặc Chạm để lật thẻ)
            </p>
          )}
        </div>

        {/* MẶT SAU (CHỈ DÀNH CHO FLASHCARD) */}
        {isFlashcard && isFlipped && (
          <div
            className="card-face card-back"
            style={{ position: "relative", transform: "none" }}
          >
            <p className="answer-text">
              {currentCard.answer ||
                currentCard.back_content ||
                currentCard.correct_answers}
            </p>
            {currentCard.explanation && (
              <div
                style={{
                  marginTop: "20px",
                  padding: "15px",
                  background: "rgba(245, 158, 11, 0.1)",
                  borderRadius: "10px",
                  fontSize: "0.95rem",
                  color: "#b45309",
                  textAlign: "left",
                }}
              >
                <strong>
                  <i className="fa-solid fa-lightbulb"></i> Giải thích:{" "}
                </strong>{" "}
                {currentCard.explanation}
              </div>
            )}
          </div>
        )}
      </div>

      {/* KHU VỰC NÚT ĐÁNH GIÁ (CHỈ DÀNH CHO FLASHCARD KHI ĐÃ LẬT) */}
      {isFlashcard && (
        <div
          className="rating-section"
          style={{
            visibility: isFlipped ? "visible" : "hidden",
            opacity: isFlipped ? 1 : 0,
            transition: "opacity 0.3s",
          }}
        >
          <div className="rating-title">Bạn có nhớ đáp án này không?</div>
          <div
            className="rating-buttons"
            style={{ display: "flex", gap: "20px", justifyContent: "center" }}
          >
            <button
              className="btn-rating btn-again"
              onClick={() => handleCramRating(false)}
              style={{ maxWidth: "200px" }}
            >
              Làm Sai <span className="key-hint">[Phím 1]</span>
            </button>
            <button
              className="btn-rating btn-good"
              onClick={() => handleCramRating(true)}
              style={{ maxWidth: "200px" }}
            >
              Làm Đúng <span className="key-hint">[Phím 2]</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActiveStudySession;