import React from "react";
import useCramMode from "../hooks/useCramMode";
import "./ReviewPage.css";

const CramReviewPage = ({ deckId, onFinish }) => {
  const {
    cramQueue,
    fullBatch,
    cycleCount,
    isFlipped,
    setIsFlipped,
    isLoading,
    isBossMode,
    handleCramRating,
  } = useCramMode(deckId, onFinish);

  if (isLoading)
    return (
      <div style={{ padding: "50px", textAlign: "center", fontSize: "1.2rem" }}>
        Đang tải dữ liệu...
      </div>
    );

  if (fullBatch.length === 0)
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <div style={{ background: "white", padding: "40px", borderRadius: "16px", boxShadow: "0 10px 25px rgba(0,0,0,0.1)", textAlign: "center", maxWidth: "500px", width: "100%" }}>
          <h2 style={{ color: "#1e293b", fontSize: "1.5rem", marginBottom: "15px" }}>Không có dữ liệu phù hợp</h2>
          <p style={{ color: "#475569", fontSize: "1rem", lineHeight: "1.5", marginBottom: "30px" }}>
            Bộ thẻ này hiện tại không có dữ liệu phù hợp để ôn tập cấp tốc.
          </p>
          <button
            onClick={onFinish}
            style={{ padding: "12px 24px", cursor: "pointer", background: "#3b82f6", color: "white", border: "none", borderRadius: "8px", fontWeight: "bold" }}
          >
            Trở về Trang chủ
          </button>
        </div>
      </div>
    );

  if (cramQueue.length === 0)
    return (
      <div className="review-page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <div style={{ background: "white", padding: "40px", borderRadius: "16px", boxShadow: "0 10px 25px rgba(0,0,0,0.1)", textAlign: "center", maxWidth: "400px", width: "100%" }}>
          <h2 style={{ color: "#10b981", fontSize: "1.8rem", marginBottom: "10px" }}>Hoàn thành phiên học</h2>
          <p style={{ color: "#475569", fontSize: "1rem", marginBottom: "30px" }}>
            Bạn đã xuất sắc ghi nhớ toàn bộ danh sách trong vòng lặp số {cycleCount}.
          </p>
          
          <div style={{ display: "flex", justifyContent: "space-around", marginBottom: "30px" }}>
            <div style={{ background: "#ecfdf5", padding: "15px", borderRadius: "12px", width: "100%" }}>
              <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#059669" }}>{fullBatch.length}</div>
              <div style={{ color: "#047857", fontSize: "0.9rem", fontWeight: "bold" }}>Tổng số thẻ đã hoàn thành</div>
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

  const currentCard = cramQueue[0];

  return (
    <div className="review-page-container">
      <div className="review-header" style={{ marginBottom: "10px" }}>
        <button className="btn-back" onClick={onFinish}>
          ← Hủy ôn tập
        </button>
        {isBossMode && (
          <div
            style={{
              background: "#ef4444",
              color: "white",
              padding: "4px 12px",
              borderRadius: "12px",
              fontSize: "0.85rem",
              fontWeight: "bold",
            }}
          >
            CHẾ ĐỘ CẤP TỐC: ĐÊM TRƯỚC NGÀY THI
          </div>
        )}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
          background: "#fffbeb",
          padding: "12px 20px",
          borderRadius: "8px",
          border: "1px solid #fde68a",
        }}
      >
        <div
          style={{ fontWeight: "bold", color: "#d97706", fontSize: "1.1rem" }}
        >
          VÒNG LẶP SỐ {cycleCount}
        </div>
        <div style={{ color: "#4b5563", fontWeight: "600" }}>
          Lượt chạy hiện tại:{" "}
          <span style={{ color: "#ef4444" }}>{cramQueue.length} thẻ</span>
          <span style={{ margin: "0 8px", color: "#cbd5e1" }}>|</span>
          Tổng bài: {fullBatch.length} thẻ
        </div>
      </div>

      <div
        className={`flashcard-container ${isFlipped ? "flipped" : ""}`}
        onClick={() => !isFlipped && setIsFlipped(true)}
        style={{
          border: isBossMode ? "2.5px solid #ef4444" : "2.5px solid #f59e0b",
        }}
      >
        <div className="card-face card-front">
          <h3>{currentCard.question || currentCard.front_content}</h3>
          {!isFlipped && (
            <p className="hint-text">(Click vào thẻ để xem đáp án)</p>
          )}
        </div>

        <div className="card-face card-back">
          <p className="answer-text">
            {currentCard.answer || currentCard.back_content}
          </p>

          <div className="rating-section" onClick={(e) => e.stopPropagation()}>
            <div
              className="rating-buttons"
              style={{ display: "flex", gap: "20px", width: "100%" }}
            >
              <button
                className="btn-rating btn-again"
                onClick={() => handleCramRating(false)}
                style={{
                  padding: "16px",
                  fontSize: "1.1rem",
                  background: "#ef4444",
                }}
              >
                Quên (Làm lại sau)
              </button>
              <button
                className="btn-rating btn-easy"
                onClick={() => handleCramRating(true)}
                style={{
                  padding: "16px",
                  fontSize: "1.1rem",
                  background: "#10b981",
                }}
              >
                Nhớ (Loại khỏi lượt)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CramReviewPage;