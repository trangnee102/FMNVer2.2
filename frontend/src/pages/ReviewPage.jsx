import React, { useState, useEffect } from "react";
import "./ReviewPage.css";

const ReviewPage = ({ deckId, forceReview = false, onFinish }) => {
  const [cards, setCards] = useState([]);

  // Tự động lấy vị trí thẻ đang học dở từ bộ nhớ trình duyệt
  const [currentIndex, setCurrentIndex] = useState(() => {
    const savedIndex = localStorage.getItem(`review_progress_${deckId}`);
    return savedIndex ? parseInt(savedIndex, 10) : 0;
  });

  const [isFlipped, setIsFlipped] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  // Đồng hồ bấm giờ tính thời gian học
  const [startTime, setStartTime] = useState(Date.now());

  useEffect(() => {
    const fetchDueCards = async () => {
      try {
        const token = localStorage.getItem("token") || "";
        const todayString = new Date().toISOString();

        const url = forceReview
          ? `http://localhost:5000/api/study/due/${deckId}?force=true&currentDate=${encodeURIComponent(todayString)}`
          : `http://localhost:5000/api/study/due/${deckId}?currentDate=${encodeURIComponent(todayString)}`;

        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          setCards(data.data || []);
        } else {
          const errData = await response.json().catch(() => ({}));
          setErrorMsg(
            `Bị Backend chặn lại! Lỗi ${response.status}: ${errData.message || response.statusText}`,
          );
        }
      } catch (error) {
        console.error("Lỗi khi tải thẻ ôn tập:", error);
        setErrorMsg("Đứt cáp! Không kết nối được với Backend.");
      } finally {
        setIsLoading(false);
      }
    };

    if (deckId) fetchDueCards();
    else setErrorMsg("Không nhận được ID của môn học (deckId bị rỗng).");
  }, [deckId, forceReview]);

  // Tự động lưu số thứ tự vào bộ nhớ
  useEffect(() => {
    if (deckId && cards.length > 0) {
      localStorage.setItem(`review_progress_${deckId}`, currentIndex);
    }
  }, [currentIndex, deckId, cards.length]);

  // Reset lại trạng thái lật và đồng hồ
  useEffect(() => {
    setIsFlipped(false);
    setStartTime(Date.now());
  }, [currentIndex]);

  const handleRating = async (rating) => {
    const currentCard = cards[currentIndex];
    const token = localStorage.getItem("token") || "";
    const durationMs = Date.now() - startTime;

    try {
      await fetch("http://localhost:5000/api/study/review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          flashcard_id: currentCard.id,
          rating: rating,
          duration_ms: durationMs,
        }),
      });

      let updatedCards = [...cards];

      if (rating === 1) {
        updatedCards.push(currentCard);
        setCards(updatedCards);
      }

      if (currentIndex < updatedCards.length - 1) {
        setIsFlipped(false);
        setTimeout(() => {
          setCurrentIndex((prev) => prev + 1);
        }, 150);
      } else {
        localStorage.removeItem(`review_progress_${deckId}`);
        alert("🎉 Chúc mừng! Cậu đã hoàn thành phiên ôn tập này!");
        if (onFinish) onFinish();
      }
    } catch (error) {
      console.error("Lỗi khi cập nhật tiến độ học:", error);
      alert("Lỗi khi gửi điểm! Vui lòng kiểm tra lại kết nối.");
    }
  };

  // Phím tắt bàn phím
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === "Space") {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      }

      if (isFlipped) {
        switch (e.key) {
          case "1":
            handleRating(1);
            break;
          case "2":
            handleRating(2);
            break;
          case "3":
            handleRating(3);
            break;
          case "4":
            handleRating(4);
            break;
          default:
            break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFlipped, currentIndex, cards, startTime]);

  if (isLoading) {
    return (
      <div style={{ padding: "50px", textAlign: "center", fontSize: "1.2rem" }}>
        Đang tải bộ bài... ⏳
      </div>
    );
  }

  if (errorMsg || cards.length === 0) {
    return (
      <div style={{ padding: "50px", textAlign: "center" }}>
        <h2 style={{ color: errorMsg ? "#ef4444" : "#4361ee" }}>
          {errorMsg
            ? "Ối, có lỗi rồi! 🚨"
            : "Tuyệt vời! Hôm nay không còn thẻ nào cần ôn cả! 🥳"}
        </h2>
        {errorMsg && <p style={{ fontSize: "1.1rem" }}>{errorMsg}</p>}
        <button
          onClick={onFinish}
          style={{
            padding: "10px 20px",
            marginTop: "20px",
            cursor: "pointer",
            background: "#4361ee",
            color: "white",
            border: "none",
            borderRadius: "8px",
          }}
        >
          Quay lại Trang chủ
        </button>
      </div>
    );
  }

  if (currentIndex >= cards.length) {
    setCurrentIndex(0);
    return null;
  }

  const currentCard = cards[currentIndex];

  return (
    <div className="review-page-container">
      <div className="review-header">
        <button className="btn-back" onClick={onFinish}>
          ← Quay lại
        </button>
        <div className="progress-bar">
          Thẻ {currentIndex + 1} / {cards.length}
        </div>
      </div>

      <div
        className={`flashcard-container ${isFlipped ? "flipped" : ""}`}
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <div className="card-face card-front">
          <h3>{currentCard.question || currentCard.front_content}</h3>
          {!isFlipped && (
            <p className="hint-text">
              (Nhấn Phím Cách hoặc Click để xem đáp án)
            </p>
          )}
        </div>

        <div className="card-face card-back">
          <p className="answer-text">
            {currentCard.answer || currentCard.back_content}
          </p>
        </div>
      </div>

      <div className="rating-section">
        {isFlipped ? (
          <>
            <div className="rating-title">Mức độ ghi nhớ của cậu?</div>
            <div className="rating-buttons">
              <button
                className="btn-rating btn-again"
                onClick={() => handleRating(1)}
              >
                Quên (Lại) <span className="key-hint">[Phím 1]</span>
              </button>
              <button
                className="btn-rating btn-hard"
                onClick={() => handleRating(2)}
              >
                Khó <span className="key-hint">[Phím 2]</span>
              </button>
              <button
                className="btn-rating btn-good"
                onClick={() => handleRating(3)}
              >
                Tốt <span className="key-hint">[Phím 3]</span>
              </button>
              <button
                className="btn-rating btn-easy"
                onClick={() => handleRating(4)}
              >
                Dễ <span className="key-hint">[Phím 4]</span>
              </button>
            </div>
          </>
        ) : (
          <div
            style={{
              color: "#cbd5e0",
              fontStyle: "italic",
              textAlign: "center",
            }}
          >
            Lật thẻ để hiển thị nút đánh giá...
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewPage;
