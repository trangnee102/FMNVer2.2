// frontend/src/pages/ReviewPage.jsx
import React, { useState, useEffect, useRef } from "react";
import api from "../services/api";
import ReviewDashboard from "../components/Study/ReviewDashboard";
import "./ReviewPage.css";

// 👉 ĐÂY LÀ CHẾ ĐỘ HỌC THƯỜNG (Có lưu thành tích, giãn cách SM-2)
const StandardStudySession = ({ deckId, forceReview, onFinish }) => {
  const [cards, setCards] = useState([]);
  const [initialTotal, setInitialTotal] = useState(0);
  const [sessionStats, setSessionStats] = useState({ passed: 0, forgotten: 0 });
  const [isSessionFinished, setIsSessionFinished] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const actualDeckId = String(deckId).split("?")[0];
  const isForce = String(deckId).includes("force=true") || forceReview;

  const pendingRequests = useRef([]);

  const [currentIndex, setCurrentIndex] = useState(() => {
    const savedIndex = localStorage.getItem(`review_progress_${actualDeckId}`);
    return savedIndex ? parseInt(savedIndex, 10) : 0;
  });

  const [isFlipped, setIsFlipped] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [startTime, setStartTime] = useState(Date.now());

  const handleReviewAllAgain = async () => {
    setIsLoading(true);
    setIsSessionFinished(false);
    setErrorMsg(null);
    setCards([]);
    setCurrentIndex(0);
    setSessionStats({ passed: 0, forgotten: 0 });
    localStorage.removeItem(`review_progress_${actualDeckId}`);

    try {
      const todayString = new Date().toISOString();
      const t = new Date().getTime();
      const response = await api.get(
        `/study/deck/${actualDeckId}/due-cards?force=true&currentDate=${encodeURIComponent(todayString)}&t=${t}`,
      );

      const loadedCards = response.data || [];
      setCards(loadedCards);
      setInitialTotal(loadedCards.length);
    } catch (err) {
      console.error("Lỗi khi tải lại danh sách thẻ:", err);
      setErrorMsg("Đã xảy ra sự cố trong quá trình tải dữ liệu.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const fetchDueCards = async () => {
      try {
        const todayString = new Date().toISOString();
        const t = new Date().getTime();
        const endpoint = isForce
          ? `/study/deck/${actualDeckId}/due-cards?force=true&currentDate=${encodeURIComponent(todayString)}&t=${t}`
          : `/study/deck/${actualDeckId}/due-cards?currentDate=${encodeURIComponent(todayString)}&t=${t}`;

        const response = await api.get(endpoint);
        const loadedCards = response.data || [];

        setCards(loadedCards);
        setInitialTotal(loadedCards.length);

        const savedIndex = localStorage.getItem(
          `review_progress_${actualDeckId}`,
        );
        if (savedIndex) {
          setSessionStats({ passed: parseInt(savedIndex, 10), forgotten: 0 });
        }
      } catch (error) {
        console.error("Lỗi khi tải dữ liệu:", error);
        setErrorMsg("Mất kết nối với máy chủ. Vui lòng thử lại sau.");
      } finally {
        setIsLoading(false);
      }
    };

    if (actualDeckId) fetchDueCards();
  }, [actualDeckId, isForce]);

  useEffect(() => {
    if (actualDeckId && cards.length > 0 && !isSessionFinished) {
      localStorage.setItem(`review_progress_${actualDeckId}`, currentIndex);
    }
  }, [currentIndex, actualDeckId, cards.length, isSessionFinished]);

  useEffect(() => {
    setIsFlipped(false);
    setStartTime(Date.now());
  }, [currentIndex]);

  const handleRating = async (rating) => {
    const currentCard = cards[currentIndex];
    const durationMs = Date.now() - startTime;

    const req = api
      .post("/study/review", {
        flashcard_id: currentCard.id,
        rating: rating,
        duration_ms: durationMs > 500 ? durationMs : 500,
      })
      .catch((err) => console.error("Lỗi đồng bộ dữ liệu ngầm:", err));

    pendingRequests.current.push(req);

    if (rating === 1) {
      setSessionStats((prev) => ({ ...prev, forgotten: prev.forgotten + 1 }));
      setCards((prevCards) => [...prevCards, currentCard]);
    } else {
      setSessionStats((prev) => ({ ...prev, passed: prev.passed + 1 }));
    }

    if (currentIndex < cards.length - 1) {
      setIsFlipped(false);
      setTimeout(() => {
        setCurrentIndex((prev) => prev + 1);
      }, 150);
    } else {
      localStorage.removeItem(`review_progress_${actualDeckId}`);
      setIsSessionFinished(true);
    }
  };

  const handleFinishSession = async () => {
    setIsSyncing(true);
    await Promise.allSettled(pendingRequests.current);
    setIsSyncing(false);
    if (onFinish) onFinish();
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isSessionFinished || isSyncing) return;
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
  }, [isFlipped, currentIndex, cards, startTime, isSessionFinished, isSyncing]);

  if (isLoading)
    return (
      <div
        style={{
          padding: "50px",
          textAlign: "center",
          color: "var(--text-gray)",
        }}
      >
        Đang tải dữ liệu...
      </div>
    );

  if (errorMsg || cards.length === 0) {
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
            background: "var(--bg-card)",
            padding: "40px",
            borderRadius: "16px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
            textAlign: "center",
            maxWidth: "500px",
            width: "100%",
            border: "1px solid var(--border)",
          }}
        >
          {errorMsg ? (
            <>
              <h2
                style={{
                  color: "#ef4444",
                  fontSize: "1.5rem",
                  marginBottom: "15px",
                }}
              >
                Đã xảy ra sự cố
              </h2>
              <p
                style={{
                  color: "var(--text-gray)",
                  fontSize: "1rem",
                  lineHeight: "1.5",
                  marginBottom: "30px",
                }}
              >
                {errorMsg}
              </p>
              <button
                onClick={onFinish}
                style={{
                  padding: "12px 24px",
                  cursor: "pointer",
                  background: "var(--primary)",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: "bold",
                }}
              >
                Trở về Trang chủ
              </button>
            </>
          ) : (
            <>
              <div style={{ fontSize: "3rem", marginBottom: "20px" }}>🏆</div>
              <h2
                style={{
                  color: "var(--text-dark)",
                  fontSize: "1.5rem",
                  marginBottom: "15px",
                  fontWeight: "bold",
                }}
              >
                Đã hoàn thành mục tiêu
              </h2>
              <p
                style={{
                  color: "var(--text-gray)",
                  fontSize: "1rem",
                  lineHeight: "1.5",
                  marginBottom: "30px",
                }}
              >
                Hiện tại không còn thẻ nào đến hạn ôn tập trong hôm nay. Bạn có
                muốn tiếp tục ôn tập lại toàn bộ danh sách thẻ không?
              </p>
              <div
                style={{
                  display: "flex",
                  gap: "15px",
                  justifyContent: "center",
                }}
              >
                <button
                  onClick={onFinish}
                  style={{
                    flex: 1,
                    padding: "12px",
                    cursor: "pointer",
                    background: "var(--bg-main)",
                    color: "var(--text-gray)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    fontWeight: "bold",
                    transition: "all 0.2s",
                  }}
                >
                  Trở về Ôn tập
                </button>
                <button
                  onClick={handleReviewAllAgain}
                  style={{
                    flex: 1,
                    padding: "12px",
                    cursor: "pointer",
                    background: "var(--primary)",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    fontWeight: "bold",
                    transition: "all 0.2s",
                  }}
                >
                  Tiếp tục học
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  if (isSessionFinished) {
    return (
      <div
        className="review-page-container"
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "80vh",
        }}
      >
        <div
          style={{
            background: "var(--bg-card)",
            padding: "40px",
            borderRadius: "20px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
            textAlign: "center",
            maxWidth: "450px",
            width: "100%",
            border: "1px solid var(--border)",
          }}
        >
          <h2
            style={{
              color: "#10b981",
              fontSize: "2rem",
              marginBottom: "15px",
              fontWeight: "bold",
            }}
          >
            Hoàn thành phiên học
          </h2>
          <p
            style={{
              color: "var(--text-gray)",
              fontSize: "1.1rem",
              marginBottom: "30px",
            }}
          >
            Bạn đã xem xét xong {initialTotal} thẻ độc lập.
          </p>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "20px",
              marginBottom: "35px",
            }}
          >
            <div
              style={{
                flex: 1,
                background: "rgba(16, 185, 129, 0.1)",
                padding: "20px",
                borderRadius: "16px",
                border: "1px solid rgba(16, 185, 129, 0.2)",
              }}
            >
              <div
                style={{
                  fontSize: "2.5rem",
                  fontWeight: "900",
                  color: "#10b981",
                }}
              >
                {sessionStats.passed}
              </div>
              <div
                style={{
                  color: "#059669",
                  fontSize: "0.95rem",
                  fontWeight: "700",
                  marginTop: "5px",
                }}
              >
                Đánh giá Tốt/Dễ
              </div>
            </div>
            <div
              style={{
                flex: 1,
                background: "rgba(239, 68, 68, 0.1)",
                padding: "20px",
                borderRadius: "16px",
                border: "1px solid rgba(239, 68, 68, 0.2)",
              }}
            >
              <div
                style={{
                  fontSize: "2.5rem",
                  fontWeight: "900",
                  color: "#ef4444",
                }}
              >
                {sessionStats.forgotten}
              </div>
              <div
                style={{
                  color: "#b91c1c",
                  fontSize: "0.95rem",
                  fontWeight: "700",
                  marginTop: "5px",
                }}
              >
                Lần bấm Quên
              </div>
            </div>
          </div>
          <button
            onClick={handleFinishSession}
            disabled={isSyncing}
            style={{
              width: "100%",
              padding: "16px",
              background: "#3b82f6",
              color: "white",
              border: "none",
              borderRadius: "12px",
              fontWeight: "bold",
              fontSize: "1.1rem",
              cursor: isSyncing ? "wait" : "pointer",
              transition: "all 0.2s",
              opacity: isSyncing ? 0.7 : 1,
            }}
          >
            {isSyncing ? "Đang đồng bộ..." : "Tiếp tục Ôn tập"}
          </button>
        </div>
      </div>
    );
  }

  if (currentIndex >= cards.length) return null;

  const currentCard = cards[currentIndex];
  const displayProgress = Math.min(currentIndex + 1, initialTotal);
  const realTimePercent =
    initialTotal > 0
      ? Math.min(100, Math.round((displayProgress / initialTotal) * 100))
      : 0;

  return (
    <div className="review-page-container">
      <div className="review-header">
        <button className="btn-back" onClick={onFinish}>
          ← Quay lại
        </button>
        <div className="progress-bar">
          Tiến độ: {displayProgress} / {initialTotal} ({realTimePercent}%)
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
            <div className="rating-title">Đánh giá mức độ ghi nhớ</div>
            <div className="rating-buttons">
              <button
                className="btn-rating btn-again"
                onClick={() => handleRating(1)}
              >
                Quên <span className="key-hint">[Phím 1]</span>
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
              color: "var(--text-gray)",
              fontStyle: "italic",
              textAlign: "center",
            }}
          >
            Lật thẻ để hiển thị lựa chọn...
          </div>
        )}
      </div>
    </div>
  );
};

const ReviewPage = ({ deckId, forceReview = false, onFinish, onNavigate }) => {
  // Nếu chưa chọn bài -> Hiện Bảng điều khiển
  if (!deckId) {
    return <ReviewDashboard onNavigate={onNavigate} />;
  }
  // Nếu đã chọn bài -> Hiện SM-2 học thường
  return (
    <StandardStudySession
      deckId={deckId}
      forceReview={forceReview}
      onFinish={onFinish}
    />
  );
};

export default ReviewPage;