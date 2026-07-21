import React, { useState, useEffect } from "react";
import "./ReviewPage.css";

const ReviewPage = ({ deckId, forceReview = false, onFinish }) => {
  const [cards, setCards] = useState([]);
  
  // Quản lý thống kê của phiên học
  const [initialTotal, setInitialTotal] = useState(0); 
  const [sessionStats, setSessionStats] = useState({ passed: 0, forgotten: 0 });
  const [isSessionFinished, setIsSessionFinished] = useState(false);

  const [currentIndex, setCurrentIndex] = useState(() => {
    const savedIndex = localStorage.getItem(`review_progress_${deckId}`);
    return savedIndex ? parseInt(savedIndex, 10) : 0;
  });

  const [isFlipped, setIsFlipped] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [startTime, setStartTime] = useState(Date.now());

  // Hàm reload lại toàn bộ thẻ nếu người dùng muốn ôn tập lại toàn bộ
  const handleReviewAllAgain = () => {
    setIsLoading(true);
    setIsSessionFinished(false);
    setErrorMsg(null);
    setCards([]);
    setCurrentIndex(0);
    setSessionStats({ passed: 0, forgotten: 0 });
    localStorage.removeItem(`review_progress_${deckId}`);
    
    const token = localStorage.getItem("token");
    const todayString = new Date().toISOString();
    const forceUrl = `http://localhost:5000/api/study/deck/${deckId}/due-cards?force=true&currentDate=${encodeURIComponent(todayString)}`;

    fetch(forceUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })
      .then(res => res.json())
      .then(data => {
        const loadedCards = data.data || [];
        setCards(loadedCards);
        setInitialTotal(loadedCards.length);
        setIsLoading(false);
      })
      .catch(err => {
        console.error("Lỗi khi tải lại danh sách thẻ:", err);
        setErrorMsg("Đã xảy ra sự cố trong quá trình tải dữ liệu.");
        setIsLoading(false);
      });
  };

  useEffect(() => {
    const fetchDueCards = async () => {
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          setErrorMsg("Không tìm thấy thông tin xác thực. Vui lòng đăng nhập lại.");
          setIsLoading(false);
          return;
        }

        const todayString = new Date().toISOString();
        const url = forceReview
          ? `http://localhost:5000/api/study/deck/${deckId}/due-cards?force=true&currentDate=${encodeURIComponent(todayString)}`
          : `http://localhost:5000/api/study/deck/${deckId}/due-cards?currentDate=${encodeURIComponent(todayString)}`;

        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          const loadedCards = data.data || [];
          setCards(loadedCards);
          setInitialTotal(loadedCards.length);
          
          const savedIndex = localStorage.getItem(`review_progress_${deckId}`);
          if (savedIndex) {
            setSessionStats({ passed: parseInt(savedIndex, 10), forgotten: 0 });
          }
        } else {
          const errData = await response.json().catch(() => ({}));
          if (response.status === 401) {
            setErrorMsg("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
          } else {
            setErrorMsg(`Lỗi máy chủ: ${errData.message || response.statusText}`);
          }
        }
      } catch (error) {
        console.error("Lỗi khi tải dữ liệu:", error);
        setErrorMsg("Mất kết nối với máy chủ. Vui lòng thử lại sau.");
      } finally {
        setIsLoading(false);
      }
    };

    if (deckId) {
      fetchDueCards();
    }
  }, [deckId, forceReview]);

  useEffect(() => {
    if (deckId && cards.length > 0 && !isSessionFinished) {
      localStorage.setItem(`review_progress_${deckId}`, currentIndex);
    }
  }, [currentIndex, deckId, cards.length, isSessionFinished]);

  useEffect(() => {
    setIsFlipped(false);
    setStartTime(Date.now());
  }, [currentIndex]);

  const handleRating = async (rating) => {
    const currentCard = cards[currentIndex];
    const token = localStorage.getItem("token");
    const durationMs = Date.now() - startTime;

    // Gửi dữ liệu lưu trữ ngầm hoàn toàn lên Server
    fetch("http://localhost:5000/api/study/review", {
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
    }).catch((err) => console.error("Lỗi đồng bộ dữ liệu ngầm:", err));

    // Cập nhật thống kê phiên học ngay lập tức
    if (rating === 1) { 
      setSessionStats(prev => ({ ...prev, forgotten: prev.forgotten + 1 }));
    } else {
      setSessionStats(prev => ({ ...prev, passed: prev.passed + 1 }));
    }

    if (currentIndex < cards.length - 1) {
      setIsFlipped(false);
      setTimeout(() => {
        setCurrentIndex((prev) => prev + 1);
      }, 150);
    } else {
      localStorage.removeItem(`review_progress_${deckId}`);
      setIsSessionFinished(true);
      alert("🎉 Chúc mừng! Cậu đã hoàn thành phiên ôn tập này!");
      if (onFinish) onFinish();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isSessionFinished) return;
      if (e.code === "Space") {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      }
      if (isFlipped) {
        switch (e.key) {
          case "1": handleRating(1); break;
          case "2": handleRating(2); break;
          case "3": handleRating(3); break;
          case "4": handleRating(4); break;
          default: break;
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFlipped, currentIndex, cards, startTime, isSessionFinished]);

  if (isLoading) {
    return <div style={{ padding: "50px", textAlign: "center" }}>Đang tải dữ liệu...</div>;
  }

  if (errorMsg || cards.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <div style={{ background: "white", padding: "40px", borderRadius: "16px", boxShadow: "0 10px 25px rgba(0,0,0,0.1)", textAlign: "center", maxWidth: "500px", width: "100%" }}>
          {errorMsg ? (
              <>
                <h2 style={{ color: "#ef4444", fontSize: "1.5rem", marginBottom: "15px" }}>Đã xảy ra sự cố</h2>
                <p style={{ color: "#475569", fontSize: "1rem", lineHeight: "1.5", marginBottom: "30px" }}>{errorMsg}</p>
                <button
                  onClick={onFinish}
                  style={{ padding: "12px 24px", cursor: "pointer", background: "#3b82f6", color: "white", border: "none", borderRadius: "8px", fontWeight: "bold" }}
                >
                  Trở về Trang chủ
                </button>
              </>
          ) : (
              <>
                <div style={{ fontSize: "3rem", marginBottom: "20px" }}>🏆</div>
                <h2 style={{ color: "#1e293b", fontSize: "1.5rem", marginBottom: "15px" }}>Đã hoàn thành mục tiêu học tập</h2>
                <p style={{ color: "#475569", fontSize: "1rem", lineHeight: "1.5", marginBottom: "30px" }}>
                  Hiện tại không còn thẻ nào đến hạn ôn tập trong hôm nay. Bạn có muốn tiếp tục ôn tập lại toàn bộ danh sách thẻ trong bộ này không?
                </p>
                <div style={{ display: "flex", gap: "15px", justifyContent: "center" }}>
                  <button
                    onClick={onFinish}
                    style={{ flex: 1, padding: "12px", cursor: "pointer", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: "8px", fontWeight: "bold" }}
                  >
                    Trở về Trang chủ
                  </button>
                  <button
                    onClick={handleReviewAllAgain}
                    style={{ flex: 1, padding: "12px", cursor: "pointer", background: "#3b82f6", color: "white", border: "none", borderRadius: "8px", fontWeight: "bold" }}
                  >
                    Tiếp tục ôn tập
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
      <div className="review-page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <div style={{ background: "white", padding: "40px", borderRadius: "16px", boxShadow: "0 10px 25px rgba(0,0,0,0.1)", textAlign: "center", maxWidth: "400px", width: "100%" }}>
          <h2 style={{ color: "#10b981", fontSize: "1.8rem", marginBottom: "10px" }}>Hoàn thành phiên học</h2>
          <p style={{ color: "#475569", fontSize: "1rem", marginBottom: "30px" }}>Bạn đã xem xét xong {initialTotal} thẻ.</p>
          
          <div style={{ display: "flex", justifyContent: "space-around", marginBottom: "30px" }}>
            <div style={{ background: "#ecfdf5", padding: "15px", borderRadius: "12px", width: "45%" }}>
              <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#059669" }}>{sessionStats.passed}</div>
              <div style={{ color: "#047857", fontSize: "0.9rem", fontWeight: "bold" }}>Thẻ đã nhớ</div>
            </div>
            <div style={{ background: "#fef2f2", padding: "15px", borderRadius: "12px", width: "45%" }}>
              <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#dc2626" }}>{sessionStats.forgotten}</div>
              <div style={{ color: "#b91c1c", fontSize: "0.9rem", fontWeight: "bold" }}>Thẻ đã quên</div>
            </div>
          </div>

          <button
            onClick={onFinish}
            style={{ width: "100%", padding: "14px", background: "#3b82f6", color: "white", border: "none", borderRadius: "10px", fontWeight: "bold", fontSize: "1rem", cursor: "pointer" }}
          >
            Trở về Trang chủ
          </button>
        </div>
      </div>
    );
  }

  if (currentIndex >= cards.length) return null;

  const currentCard = cards[currentIndex];
  const displayProgress = Math.min(currentIndex + 1, initialTotal);

  return (
    <div className="review-page-container">
      <div className="review-header">
        <button className="btn-back" onClick={onFinish}>
          ← Quay lại
        </button>
        <div className="progress-bar">
          Tiến độ: {displayProgress} / {initialTotal}
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
              <button className="btn-rating btn-again" onClick={() => handleRating(1)}>
                Quên <span className="key-hint">[Phím 1]</span>
              </button>
              <button className="btn-rating btn-hard" onClick={() => handleRating(2)}>
                Khó <span className="key-hint">[Phím 2]</span>
              </button>
              <button className="btn-rating btn-good" onClick={() => handleRating(3)}>
                Tốt <span className="key-hint">[Phím 3]</span>
              </button>
              <button className="btn-rating btn-easy" onClick={() => handleRating(4)}>
                Dễ <span className="key-hint">[Phím 4]</span>
              </button>
            </div>
          </>
        ) : (
          <div style={{ color: "#cbd5e0", fontStyle: "italic", textAlign: "center" }}>
            Lật thẻ để hiển thị lựa chọn...
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewPage;