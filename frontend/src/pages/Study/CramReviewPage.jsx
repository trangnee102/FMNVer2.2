// frontend/src/pages/CramReviewPage.jsx
import React, { useState, useEffect } from "react";
import useCramMode from "../../hooks/useCramMode";
import {
  isOptionCorrect,
  resolveCorrectIndexes,
  isFillBlankCorrect,
  getFillBlankAnswerLabel,
  maskFillBlankQuestion,
} from "../../utils/examAnswers";
import "./ReviewPage.css";

const CramReviewPage = ({ deckId, onFinish }) => {
  // 👉 ĐÃ FIX: Lọc sạch ID ngay từ cửa để tránh dính đuôi ?cram=true gây lỗi 404
  const cleanDeckId = deckId ? String(deckId).split("?")[0] : "";

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
  } = useCramMode(cleanDeckId, onFinish);

  // States hỗ trợ Tự động chấm điểm (Auto-grading)
  const [evaluating, setEvaluating] = useState(false);
  // 👉 Chọn theo VỊ TRÍ (index) chứ không theo text lựa chọn — text có thể trùng nhau
  // giữa 2 lựa chọn khác nhau (vd "có" xuất hiện 2 lần), tra theo text sẽ nhầm lựa chọn.
  const [selectedIndexes, setSelectedIndexes] = useState([]);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState(null);
  const [fillText, setFillText] = useState("");

  const currentCard = cramQueue[0];

  // Reset state mỗi khi chuyển thẻ mới
  useEffect(() => {
    setEvaluating(false);
    setSelectedIndexes([]);
    setLastAnswerCorrect(null);
    setFillText("");
    setIsFlipped(false);
  }, [currentCard]);

  // Nút bấm chấm Trắc nghiệm dạng CHỌN 1 (SINGLE_CHOICE / TRUE_FALSE) — bấm phát chấm luôn
  const handleSingleSelectClick = (idx, options) => {
    if (evaluating) return;
    const isCorrect = isOptionCorrect(idx, currentCard.correct_answers, options);

    setSelectedIndexes([idx]);
    setLastAnswerCorrect(isCorrect);
    setEvaluating(true);

    setTimeout(() => {
      handleCramRating(isCorrect);
    }, 1200);
  };

  // Tích/bỏ tích 1 ô cho dạng CHỌN NHIỀU (MULTIPLE_CHOICE) — chưa chấm ngay, chờ bấm "Kiểm tra"
  const handleToggleMultiSelect = (idx) => {
    if (evaluating) return;
    setSelectedIndexes((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx],
    );
  };

  // Nút "Kiểm tra" cho dạng CHỌN NHIỀU — chỉ đúng khi chọn ĐỦ và ĐÚNG hết các đáp án đúng
  const handleMultiSelectSubmit = (options) => {
    if (evaluating || selectedIndexes.length === 0) return;
    const correctIndexes = resolveCorrectIndexes(currentCard.correct_answers, options);
    const isCorrect =
      selectedIndexes.length === correctIndexes.length &&
      selectedIndexes.every((i) => correctIndexes.includes(i));

    setLastAnswerCorrect(isCorrect);
    setEvaluating(true);

    setTimeout(() => {
      handleCramRating(isCorrect);
    }, 1200);
  };

  // Nút chấm Điền khuyết
  const handleFillSubmit = () => {
    if (evaluating || !fillText.trim()) return;
    setEvaluating(true);

    const isCorrect = isFillBlankCorrect(fillText, currentCard.correct_answers);

    setTimeout(() => {
      handleCramRating(isCorrect);
    }, 1500);
  };

  // ==========================================
  // MÀN HÌNH CHỜ & TỔNG KẾT
  // ==========================================
  if (isLoading)
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "80vh",
          color: "var(--text-gray)",
        }}
      >
        <i
          className="fa-solid fa-fire fa-bounce"
          style={{ fontSize: "3rem", color: "#f59e0b", marginBottom: "15px" }}
        ></i>
        <div style={{ fontSize: "1.2rem", fontWeight: "600" }}>
          Đang nung nóng lò luyện... 🔥
        </div>
      </div>
    );

  if (fullBatch.length === 0)
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "80vh",
        }}
      >
        <div
          style={{
            background: "white",
            padding: "40px",
            borderRadius: "16px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
            textAlign: "center",
            maxWidth: "500px",
            width: "100%",
            border: "1px dashed var(--border)",
          }}
        >
          <div
            style={{
              fontSize: "4rem",
              marginBottom: "15px",
              color: "var(--border)",
            }}
          >
            📭
          </div>
          <h2
            style={{
              color: "#1e293b",
              fontSize: "1.5rem",
              marginBottom: "15px",
              fontWeight: "800",
            }}
          >
            Dữ liệu trống!
          </h2>
          <p
            style={{
              color: "#475569",
              fontSize: "1rem",
              lineHeight: "1.5",
              marginBottom: "30px",
            }}
          >
            Không tìm thấy thẻ ghi nhớ hoặc câu hỏi nào để luyện tập.
          </p>
          <button
            onClick={onFinish}
            style={{
              padding: "12px 24px",
              cursor: "pointer",
              background: "var(--primary)",
              color: "white",
              border: "none",
              borderRadius: "10px",
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
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "80vh",
        }}
      >
        <div
          style={{
            background: "white",
            padding: "40px",
            borderRadius: "16px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
            textAlign: "center",
            maxWidth: "450px",
            width: "100%",
            borderTop: "5px solid #10b981",
          }}
        >
          <div style={{ fontSize: "4rem", marginBottom: "10px" }}>🏆</div>
          <h2
            style={{
              color: "#10b981",
              fontSize: "1.8rem",
              marginBottom: "10px",
              fontWeight: "800",
            }}
          >
            Tốt nghiệp Lò Luyện!
          </h2>
          <p
            style={{
              color: "#475569",
              fontSize: "1rem",
              marginBottom: "30px",
              lineHeight: "1.5",
            }}
          >
            Đã đúng trọn vẹn{" "}
            <strong style={{ color: "var(--text-dark)" }}>
              {fullBatch.length}/{fullBatch.length} câu
            </strong>
            !
          </p>
          <button
            onClick={onFinish}
            style={{
              width: "100%",
              padding: "14px",
              background: "#10b981",
              color: "white",
              border: "none",
              borderRadius: "10px",
              fontWeight: "bold",
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
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "80vh",
        }}
      >
        <div
          style={{
            background: "white",
            padding: "40px",
            borderRadius: "16px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
            textAlign: "center",
            maxWidth: "500px",
            width: "100%",
            borderTop: "5px solid #f59e0b",
          }}
        >
          <h2
            style={{
              color: "#f59e0b",
              fontSize: "1.8rem",
              marginBottom: "10px",
              fontWeight: "800",
            }}
          >
            Tổng kết Lượt {cycleCount}
          </h2>
          <div
            style={{
              display: "flex",
              justifyContent: "space-around",
              margin: "30px 0",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: "2.5rem",
                  fontWeight: "900",
                  color: "#10b981",
                }}
              >
                {correctCount}
              </div>
              <div style={{ color: "#475569", fontWeight: "600" }}>
                Câu Đúng
              </div>
            </div>
            <div style={{ width: "2px", backgroundColor: "#e2e8f0" }}></div>
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: "2.5rem",
                  fontWeight: "900",
                  color: "#ef4444",
                }}
              >
                {wrongCount}
              </div>
              <div style={{ color: "#475569", fontWeight: "600" }}>Câu Sai</div>
            </div>
          </div>
          {wrongCount > 0 ? (
            <p
              style={{
                color: "#475569",
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
              Kích hoạt vòng làm lại toàn bộ để tốt nghiệp...
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
  // GIAO DIỆN 3: LEARNING (HIỂN THỊ CÂU HỎI)
  // ==========================================
  if (!currentCard) return null;

  // 👉 ĐÃ FIX: Bóc tách mảng Options an toàn trước
  let optionsList = [];
  try {
    if (currentCard.options) {
      optionsList =
        typeof currentCard.options === "string"
          ? JSON.parse(currentCard.options)
          : currentCard.options;
    }
  } catch (e) {
    optionsList = [];
  }

  // 👉 ĐÃ FIX: Nhận diện loại thẻ thông minh hơn. Cứ có mảng đáp án là auto chuyển thành Trắc nghiệm!
  const rawType = String(
    currentCard.question_type || currentCard.type || "FLASHCARD",
  ).toUpperCase();

  let isFillBlank = rawType === "FILL_BLANK";
  // 👉 Dạng CHỌN NHIỀU đáp án đúng thật sự — cần tích chọn + bấm "Kiểm tra", không chấm
  // ngay khi bấm 1 ô như dạng chọn 1 (khác TRUE_FALSE/SINGLE_CHOICE luôn chỉ có 1 đáp án đúng)
  let isMultiSelect =
    rawType === "MULTIPLE_CHOICE" || rawType === "MULTIPLE_ANSWER";
  let isChoiceBased =
    isMultiSelect ||
    rawType === "TRUE_FALSE" ||
    (!isFillBlank && Array.isArray(optionsList) && optionsList.length > 0);

  let isFlashcard = !isChoiceBased && !isFillBlank;

  return (
    <div
      className="review-page-container"
      style={{ maxWidth: "800px", margin: "0 auto", padding: "20px" }}
    >
      <div
        style={{
          marginBottom: "20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <button
          onClick={onFinish}
          style={{
            background: "white",
            border: "1px solid var(--border)",
            padding: "10px 15px",
            borderRadius: "10px",
            fontWeight: "600",
            cursor: "pointer",
            color: "var(--text-dark)",
          }}
        >
          <i className="fa-solid fa-arrow-left"></i> Rút lui
        </button>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px",
          marginBottom: "25px",
          background: "#fffbeb",
          padding: "16px 24px",
          borderRadius: "14px",
          border: "1px solid #fde68a",
        }}
      >
        <div
          style={{ fontWeight: "800", color: "#d97706", fontSize: "1.1rem" }}
        >
          <i className="fa-solid fa-rotate-right"></i> VÒNG LẶP SỐ {cycleCount}
        </div>
        <div style={{ color: "#475569", fontWeight: "700" }}>
          Tiến độ:{" "}
          <span style={{ color: "#ef4444", fontSize: "1.1rem" }}>
            {totalThisRound - cramQueue.length + 1}
          </span>{" "}
          / {totalThisRound} câu
        </div>
      </div>

      <div
        style={{
          minHeight: "450px",
          border: "3px solid #f59e0b",
          boxShadow: "0 15px 35px rgba(245, 158, 11, 0.15)",
          borderRadius: "16px",
          background: "white",
          display: "flex",
          flexDirection: "column",
          padding: "40px",
        }}
      >
        <h3
          style={{
            fontSize: "1.6rem",
            lineHeight: "1.5",
            color: "var(--text-dark)",
            textAlign: "center",
            marginBottom: "40px",
          }}
        >
          {isFillBlank
            ? maskFillBlankQuestion(
                currentCard.question ||
                  currentCard.front_content ||
                  currentCard.content,
              )
            : currentCard.question ||
              currentCard.front_content ||
              currentCard.content}
        </h3>

        {/* TRẮC NGHIỆM */}
        {isChoiceBased && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              width: "100%",
            }}
          >
            {isMultiSelect && (
              <p
                style={{
                  margin: "0 0 4px 0",
                  color: "var(--text-gray)",
                  fontSize: "0.9rem",
                  textAlign: "center",
                }}
              >
                <i className="fa-solid fa-list-check"></i> Câu hỏi có thể có nhiều
                đáp án đúng — tích chọn rồi bấm "Kiểm tra"
              </p>
            )}

            {evaluating && lastAnswerCorrect !== null && (
              <div
                style={{
                  padding: "12px 16px",
                  borderRadius: "10px",
                  fontWeight: "800",
                  textAlign: "center",
                  marginBottom: "4px",
                  background: lastAnswerCorrect ? "#dcfce7" : "#fee2e2",
                  color: lastAnswerCorrect ? "#065f46" : "#991b1b",
                }}
              >
                {lastAnswerCorrect ? (
                  <>
                    <i className="fa-solid fa-circle-check"></i> Chính xác!
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-circle-xmark"></i> Chưa đúng — đáp
                    án đúng đang được tô xanh bên dưới
                  </>
                )}
              </div>
            )}

            {optionsList.map((opt, idx) => {
              const isThisCorrect = isOptionCorrect(
                idx,
                currentCard.correct_answers,
                optionsList,
              );
              const isThisSelected = selectedIndexes.includes(idx);

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
                  onClick={() =>
                    isMultiSelect
                      ? handleToggleMultiSelect(idx)
                      : handleSingleSelectClick(idx, optionsList)
                  }
                  disabled={evaluating}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "16px",
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
                  {isMultiSelect && !evaluating && (
                    <i
                      className={`fa-regular ${
                        isThisSelected ? "fa-square-check" : "fa-square"
                      }`}
                      style={{
                        fontSize: "1.2rem",
                        color: isThisSelected ? "#f59e0b" : "var(--text-gray)",
                      }}
                    ></i>
                  )}
                  <span>{opt}</span>
                </button>
              );
            })}

            {isMultiSelect && !evaluating && (
              <button
                onClick={() => handleMultiSelectSubmit(optionsList)}
                disabled={selectedIndexes.length === 0}
                style={{
                  marginTop: "8px",
                  padding: "14px",
                  borderRadius: "10px",
                  border: "none",
                  background:
                    selectedIndexes.length === 0
                      ? "var(--text-gray)"
                      : "var(--primary)",
                  color: "white",
                  fontWeight: "bold",
                  fontSize: "1.05rem",
                  cursor: selectedIndexes.length === 0 ? "default" : "pointer",
                }}
              >
                Kiểm tra
              </button>
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
              }}
            />
            {evaluating && (
              <div
                style={{
                  color: "#10b981",
                  fontSize: "1.2rem",
                  fontWeight: "bold",
                }}
              >
                Đáp án đúng: {getFillBlankAnswerLabel(currentCard.correct_answers)}
              </div>
            )}
            <button
              onClick={handleFillSubmit}
              disabled={evaluating || !fillText.trim()}
              style={{
                padding: "12px 30px",
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
        {isFlashcard && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              flex: 1,
            }}
          >
            {!isFlipped ? (
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  width: "100%",
                }}
              >
                <button
                  onClick={() => setIsFlipped(true)}
                  style={{
                    width: "100%",
                    padding: "20px",
                    background: "#f8fafc",
                    border: "2px dashed #cbd5e1",
                    borderRadius: "12px",
                    fontSize: "1.1rem",
                    color: "#64748b",
                    cursor: "pointer",
                    fontWeight: "bold",
                  }}
                >
                  Chạm để xem đáp án
                </button>
              </div>
            ) : (
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  width: "100%",
                }}
              >
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderTop: "1px solid #e2e8f0",
                    paddingTop: "20px",
                  }}
                >
                  <p
                    style={{
                      fontSize: "1.4rem",
                      color: "var(--primary)",
                      fontWeight: "700",
                      textAlign: "center",
                    }}
                  >
                    {currentCard.answer ||
                      currentCard.back_content ||
                      currentCard.correct_answers}
                  </p>
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: "20px",
                    marginTop: "30px",
                    width: "100%",
                  }}
                >
                  <button
                    onClick={() => handleCramRating(false)}
                    style={{
                      flex: 1,
                      padding: "16px",
                      background: "#ef4444",
                      color: "white",
                      border: "none",
                      borderRadius: "12px",
                      fontWeight: "bold",
                      fontSize: "1.1rem",
                      cursor: "pointer",
                    }}
                  >
                    Làm Sai
                  </button>
                  <button
                    onClick={() => handleCramRating(true)}
                    style={{
                      flex: 1,
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
                    Làm Đúng
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CramReviewPage;