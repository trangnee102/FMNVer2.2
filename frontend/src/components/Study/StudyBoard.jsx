// frontend/src/components/Study/StudyBoard.jsx
import React, { useState, useEffect } from "react";
import api from "../../services/api";
import AIMentorChat from "./AIMentorChat";

const StudyBoard = ({ deckId, onFinish }) => {
  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isFinished, setIsFinished] = useState(false);
  const [error, setError] = useState("");

  // Lấy danh sách thẻ cần ôn tập
  useEffect(() => {
    const fetchDueCards = async () => {
      setIsLoading(true);
      setError("");
      try {
        const res = await api.get(`/study/decks/${deckId}/due`);
        const dueCards = res.data?.data || res.data || [];

        if (dueCards.length === 0) {
          setIsFinished(true);
        } else {
          setCards(dueCards);
        }
      } catch (err) {
        setError(
          err.response?.data?.message || "Không thể tải danh sách thẻ ôn tập.",
        );
      } finally {
        setIsLoading(false);
      }
    };

    if (deckId) fetchDueCards();
  }, [deckId]);

  // Xử lý khi người dùng chọn mức độ nhớ (1: Quên, 2: Khó, 3: Tốt, 4: Dễ)
  const handleRate = async (rating) => {
    const currentCard = cards[currentIndex];

    try {
      // Gửi điểm số xuống Backend để tính toán thuật toán SM-2
      await api.post("/study/review", {
        flashcard_id: currentCard.id,
        rating: rating,
      });

      // Chuyển sang thẻ tiếp theo
      if (currentIndex < cards.length - 1) {
        setIsFlipped(false);
        setCurrentIndex((prev) => prev + 1);
      } else {
        setIsFinished(true);
      }
    } catch (err) {
      alert("Lỗi khi chấm điểm thẻ! Cậu thử lại nhé.");
    }
  };

  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          color: "var(--text-dark)",
        }}
      >
        <i
          className="fa-solid fa-spinner fa-spin"
          style={{ fontSize: "3rem", color: "#8b5cf6", marginBottom: "15px" }}
        ></i>
        <h2>Đang gom thẻ cho cậu ôn...</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          color: "var(--text-dark)",
        }}
      >
        <i
          className="fa-solid fa-triangle-exclamation"
          style={{ fontSize: "3rem", color: "#ef4444", marginBottom: "15px" }}
        ></i>
        <h2>Lỗi rồi!</h2>
        <p>{error}</p>
        <button
          onClick={onFinish}
          style={{
            marginTop: "15px",
            padding: "10px 20px",
            backgroundColor: "#8b5cf6",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          Quay lại
        </button>
      </div>
    );
  }

  if (isFinished) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          color: "var(--text-dark)",
        }}
      >
        <i
          className="fa-solid fa-champagne-glasses"
          style={{ fontSize: "4rem", color: "#10b981", marginBottom: "15px" }}
        ></i>
        <h2 style={{ fontSize: "2rem", marginBottom: "10px" }}>
          Hoàn thành xuất sắc! 🎉
        </h2>
        <p
          style={{
            color: "var(--text-gray)",
            fontSize: "1.1rem",
            marginBottom: "20px",
          }}
        >
          Cậu đã ôn xong toàn bộ thẻ của hôm nay rồi.
        </p>
        <button
          onClick={onFinish}
          style={{
            padding: "12px 25px",
            backgroundColor: "#8b5cf6",
            color: "white",
            border: "none",
            borderRadius: "10px",
            cursor: "pointer",
            fontWeight: "bold",
            fontSize: "1.1rem",
          }}
        >
          Về trang chính
        </button>
      </div>
    );
  }

  const currentCard = cards[currentIndex];
  const progressPercent = (currentIndex / cards.length) * 100;

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--bg-main)",
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}
    >
      {/* Header */}
      <header
        style={{
          backgroundColor: "var(--bg-card)",
          padding: "15px 30px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
          <button
            onClick={onFinish}
            style={{
              background: "none",
              border: "none",
              fontSize: "1.2rem",
              color: "var(--text-gray)",
              cursor: "pointer",
            }}
          >
            <i className="fa-solid fa-arrow-left"></i>
          </button>
          <h2
            style={{ color: "var(--text-dark)", fontSize: "1.2rem", margin: 0 }}
          >
            Học thẻ Flashcard 🧠
          </h2>
        </div>
        <div
          style={{
            fontWeight: "bold",
            color: "#8b5cf6",
            backgroundColor: "rgba(139, 92, 246, 0.1)",
            padding: "8px 15px",
            borderRadius: "20px",
          }}
        >
          {currentIndex + 1} / {cards.length} thẻ
        </div>
      </header>

      {/* Thanh tiến độ */}
      <div
        style={{
          width: "100%",
          height: "4px",
          backgroundColor: "var(--border)",
        }}
      >
        <div
          style={{
            width: `${progressPercent}%`,
            height: "100%",
            backgroundColor: "#8b5cf6",
            transition: "width 0.3s ease",
          }}
        ></div>
      </div>

      {/* Khu vực Flashcard */}
      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "40px 20px",
        }}
      >
        {/* Thẻ Flashcard */}
        <div
          onClick={() => !isFlipped && setIsFlipped(true)}
          style={{
            width: "100%",
            maxWidth: "600px",
            minHeight: "350px",
            backgroundColor: "var(--bg-card)",
            borderRadius: "20px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
            border: "1px solid var(--border)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            padding: "40px",
            cursor: isFlipped ? "default" : "pointer",
            textAlign: "center",
            position: "relative",
            transition: "transform 0.5s ease",
            transform: isFlipped ? "rotateX(0deg)" : "rotateX(0deg)", // Chỗ này có thể CSS 3D lật nếu rành CSS
          }}
        >
          {/* MẶT TRƯỚC (CÂU HỎI) */}
          <h2
            style={{
              fontSize: "1.8rem",
              color: "var(--text-dark)",
              lineHeight: "1.5",
              whiteSpace: "pre-wrap",
              marginBottom: isFlipped ? "20px" : "0",
            }}
          >
            {currentCard.question || currentCard.front}
          </h2>

          {/* MẶT SAU (ĐÁP ÁN) - Chỉ hiện khi đã lật */}
          {isFlipped && (
            <div
              style={{
                width: "100%",
                borderTop: "2px dashed var(--border)",
                paddingTop: "20px",
                marginTop: "10px",
                animation: "fadeIn 0.5s",
              }}
            >
              <p
                style={{
                  fontSize: "1.4rem",
                  color: "#10b981",
                  fontWeight: "bold",
                  whiteSpace: "pre-wrap",
                  margin: "0 0 15px 0",
                }}
              >
                {currentCard.answer || currentCard.back}
              </p>

              {/* Giải thích (nếu có từ AI) */}
              {(currentCard.explanation || currentCard.source_reference) && (
                <div
                  style={{
                    backgroundColor: "rgba(59, 130, 246, 0.05)",
                    padding: "15px",
                    borderRadius: "10px",
                    textAlign: "left",
                    marginTop: "15px",
                  }}
                >
                  {currentCard.explanation && (
                    <p
                      style={{
                        color: "var(--text-dark)",
                        fontSize: "1rem",
                        margin: "0 0 10px 0",
                        lineHeight: "1.5",
                      }}
                    >
                      <strong style={{ color: "#3b82f6" }}>
                        <i className="fa-solid fa-lightbulb"></i> Giải thích:
                      </strong>{" "}
                      {currentCard.explanation}
                    </p>
                  )}
                  {currentCard.source_reference && (
                    <p
                      style={{
                        color: "var(--text-gray)",
                        fontSize: "0.9rem",
                        margin: 0,
                        fontStyle: "italic",
                      }}
                    >
                      <strong style={{ color: "#f59e0b" }}>
                        <i className="fa-solid fa-book-open"></i> Nguồn:
                      </strong>{" "}
                      "{currentCard.source_reference}"
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {!isFlipped && (
            <div
              style={{
                position: "absolute",
                bottom: "20px",
                color: "var(--text-gray)",
                fontSize: "0.9rem",
                animation: "pulse 2s infinite",
              }}
            >
              Bấm vào thẻ để xem đáp án
            </div>
          )}
        </div>

        {/* CÁC NÚT ĐÁNH GIÁ (Chỉ hiện khi đã lật thẻ) */}
        {isFlipped && (
          <div
            style={{
              display: "flex",
              gap: "15px",
              marginTop: "40px",
              flexWrap: "wrap",
              justifyContent: "center",
              animation: "fadeIn 0.5s",
            }}
          >
            <button
              onClick={() => handleRate(1)}
              style={{
                padding: "12px 25px",
                borderRadius: "10px",
                border: "none",
                backgroundColor: "#ef4444",
                color: "white",
                fontWeight: "bold",
                fontSize: "1.1rem",
                cursor: "pointer",
                boxShadow: "0 4px 10px rgba(239, 68, 68, 0.3)",
              }}
            >
              Quên (1)
            </button>
            <button
              onClick={() => handleRate(2)}
              style={{
                padding: "12px 25px",
                borderRadius: "10px",
                border: "none",
                backgroundColor: "#f59e0b",
                color: "white",
                fontWeight: "bold",
                fontSize: "1.1rem",
                cursor: "pointer",
                boxShadow: "0 4px 10px rgba(245, 158, 11, 0.3)",
              }}
            >
              Khó (2)
            </button>
            <button
              onClick={() => handleRate(3)}
              style={{
                padding: "12px 25px",
                borderRadius: "10px",
                border: "none",
                backgroundColor: "#3b82f6",
                color: "white",
                fontWeight: "bold",
                fontSize: "1.1rem",
                cursor: "pointer",
                boxShadow: "0 4px 10px rgba(59, 130, 246, 0.3)",
              }}
            >
              Tốt (3)
            </button>
            <button
              onClick={() => handleRate(4)}
              style={{
                padding: "12px 25px",
                borderRadius: "10px",
                border: "none",
                backgroundColor: "#10b981",
                color: "white",
                fontWeight: "bold",
                fontSize: "1.1rem",
                cursor: "pointer",
                boxShadow: "0 4px 10px rgba(16, 185, 129, 0.3)",
              }}
            >
              Dễ (4)
            </button>
          </div>
        )}
      </main>

      {/* 👉 NHÚNG GIA SƯ AI VÀO MÀN HÌNH NÀY */}
      <AIMentorChat currentQuestion={currentCard} />

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default StudyBoard;