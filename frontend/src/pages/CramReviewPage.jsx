import React from "react";
import useCramMode from "../hooks/useCramMode"; // 👉 Gọi bộ não hook đã tách ra
import "./ReviewPage.css";

const CramReviewPage = ({ deckId, onFinish }) => {
  // Bốc toàn bộ dữ liệu sạch và các hàm tương tác từ hook useCramMode
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
        Đang sắp xếp lò luyện thi cấp tốc... ⚡
      </div>
    );

  if (fullBatch.length === 0)
    return (
      <div style={{ padding: "50px", textAlign: "center" }}>
        <h2>Bộ thẻ này hiện tại không có dữ liệu phù hợp để Cram Mode! 🥳</h2>
        <button
          onClick={onFinish}
          style={{ marginTop: "20px", padding: "10px 20px" }}
        >
          Quay lại Trang chủ
        </button>
      </div>
    );

  // Khi mảng cramQueue rỗng, nghĩa là đã vượt qua Vòng Hoàn Hảo 100%!
  if (cramQueue.length === 0)
    return (
      <div style={{ padding: "50px", textAlign: "center" }}>
        <h2 style={{ color: "#10b981", fontSize: "2rem" }}>
          🏆 CHIẾN THẮNG TUYỆT ĐỐI!
        </h2>
        <p style={{ fontSize: "1.1rem", marginTop: "10px" }}>
          Cậu đã xuất sắc ghi nhớ 100% không sai một thẻ nào trong Vòng{" "}
          {cycleCount}!
        </p>
        <button
          onClick={onFinish}
          style={{
            padding: "12px 25px",
            marginTop: "25px",
            background: "#f59e0b",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          Quay lại Bảng điều khiển
        </button>
      </div>
    );

  const currentCard = cramQueue[0]; // Thẻ hiển thị luôn nằm ở đầu hàng đợi

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
            🚨 BOSS MODE: ĐÊM TRƯỚC NGÀY THI
          </div>
        )}
      </div>

      {/* 👉 BẢNG ĐIỀU KHIỂN CHIẾN DỊCH THEO THUẬT TOÁN THÁC NƯỚC */}
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
          🔄 VÒNG LẶP SỐ {cycleCount}
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
        {/* MẶT TRƯỚC */}
        <div className="card-face card-front">
          <h3>{currentCard.question || currentCard.front_content}</h3>
          {!isFlipped && (
            <p className="hint-text">(Click vào thẻ để xem đáp án ẩn)</p>
          )}
        </div>

        {/* MẶT SAU */}
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
                🔴 QUÊN (Làm lại sau)
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
                🟢 NHỚ (Loại khỏi lượt)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CramReviewPage;
