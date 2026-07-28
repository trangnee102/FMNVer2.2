// frontend/src/pages/CramReviewPage.jsx
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
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', color: "var(--text-gray)" }}>
        <i className="fa-solid fa-fire fa-bounce" style={{ fontSize: "3rem", color: "#f59e0b", marginBottom: "15px" }}></i>
        <div style={{ fontSize: "1.2rem", fontWeight: "600" }}>Đang nung nóng lò luyện... 🔥</div>
      </div>
    );

  // 👉 ĐÃ SỬA: Thông báo chuẩn xác hơn. Khi đã sửa hook ở bước sau, 
  // nó chỉ báo rỗng nếu bộ thẻ THỰC SỰ chưa có cái thẻ nào được tạo.
  if (fullBatch.length === 0)
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <div style={{ background: "white", padding: "40px", borderRadius: "16px", boxShadow: "0 10px 25px rgba(0,0,0,0.1)", textAlign: "center", maxWidth: "500px", width: "100%", border: "1px dashed var(--border)" }}>
          <div style={{ fontSize: "4rem", marginBottom: "15px", color: "var(--border)" }}>📭</div>
          <h2 style={{ color: "#1e293b", fontSize: "1.5rem", marginBottom: "15px", fontWeight: "800" }}>Bộ thẻ này đang trống!</h2>
          <p style={{ color: "#475569", fontSize: "1rem", lineHeight: "1.5", marginBottom: "30px" }}>
            Bạn không thể bật lò luyện cấp tốc cho một bộ thẻ chưa có Flashcard nào. Hãy thêm thẻ mới trước nhé!
          </p>
          <button
            onClick={onFinish}
            style={{ padding: "12px 24px", cursor: "pointer", background: "var(--primary)", color: "white", border: "none", borderRadius: "10px", fontWeight: "bold", transition: "all 0.2s" }}
          >
            Trở về Trang chủ
          </button>
        </div>
      </div>
    );

  if (cramQueue.length === 0)
    return (
      <div className="review-page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <div style={{ background: "white", padding: "40px", borderRadius: "16px", boxShadow: "0 10px 25px rgba(0,0,0,0.1)", textAlign: "center", maxWidth: "450px", width: "100%", borderTop: "5px solid #10b981" }}>
          <div style={{ fontSize: "4rem", marginBottom: "10px" }}>🏆</div>
          <h2 style={{ color: "#10b981", fontSize: "1.8rem", marginBottom: "10px", fontWeight: "800" }}>Sống sót thành công!</h2>
          <p style={{ color: "#475569", fontSize: "1rem", marginBottom: "30px", lineHeight: "1.5" }}>
            Cậu đã xuất sắc nhồi nhét và ghi nhớ toàn bộ <strong style={{color: "var(--text-dark)"}}>{fullBatch.length} thẻ</strong> trong vòng lặp số {cycleCount}. Tự tin đi thi thôi!
          </p>
          
          <button
            onClick={onFinish}
            style={{ width: "100%", padding: "14px", background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", color: "white", border: "none", borderRadius: "10px", fontWeight: "bold", fontSize: "1.05rem", cursor: "pointer", boxShadow: "0 4px 15px rgba(16, 185, 129, 0.3)" }}
          >
            Kết thúc phiên học
          </button>
        </div>
      </div>
    );

  const currentCard = cramQueue[0];

  return (
    <div className="review-page-container" style={{ maxWidth: "800px", margin: "0 auto", padding: "20px" }}>
      <div className="review-header" style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button 
          className="btn-back" 
          onClick={onFinish}
          style={{ background: "white", border: "1px solid var(--border)", padding: "10px 15px", borderRadius: "10px", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", color: "var(--text-dark)" }}
        >
          <i className="fa-solid fa-arrow-left"></i> Rút lui
        </button>
        {isBossMode && (
          <div
            style={{
              background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
              color: "white",
              padding: "6px 16px",
              borderRadius: "20px",
              fontSize: "0.85rem",
              fontWeight: "800",
              boxShadow: "0 2px 10px rgba(239, 68, 68, 0.3)",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <i className="fa-solid fa-skull"></i> CHẾ ĐỘ BOSS: ĐÊM TRƯỚC NGÀY THI
          </div>
        )}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "25px",
          background: isBossMode ? "#fef2f2" : "#fffbeb",
          padding: "16px 24px",
          borderRadius: "14px",
          border: `1px solid ${isBossMode ? "#fca5a5" : "#fde68a"}`,
        }}
      >
        <div style={{ fontWeight: "800", color: isBossMode ? "#dc2626" : "#d97706", fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "8px" }}>
          <i className="fa-solid fa-rotate-right"></i> VÒNG LẶP SỐ {cycleCount}
        </div>
        <div style={{ color: "#475569", fontWeight: "700", fontSize: "0.95rem" }}>
          Lượt chạy hiện tại:{" "}
          <span style={{ color: "#ef4444", fontSize: "1.1rem" }}>{cramQueue.length} thẻ</span>
          <span style={{ margin: "0 12px", color: "#cbd5e1" }}>|</span>
          Tổng: <span style={{ color: "var(--primary)" }}>{fullBatch.length} thẻ</span>
        </div>
      </div>

      <div
        className={`flashcard-container ${isFlipped ? "flipped" : ""}`}
        onClick={() => !isFlipped && setIsFlipped(true)}
        style={{
          minHeight: "400px",
          border: isBossMode ? "3px solid #ef4444" : "3px solid #f59e0b",
          boxShadow: isBossMode ? "0 15px 35px rgba(239, 68, 68, 0.15)" : "0 15px 35px rgba(245, 158, 11, 0.15)",
          cursor: isFlipped ? "default" : "pointer"
        }}
      >
        <div className="card-face card-front" style={{ padding: "40px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <h3 style={{ fontSize: "1.6rem", lineHeight: "1.5", color: "var(--text-dark)", textAlign: "center" }}>
            {currentCard.question || currentCard.front_content}
          </h3>
          {!isFlipped && (
            <p className="hint-text" style={{ marginTop: "40px", color: "#94a3b8", fontWeight: "600", animation: "pulse 2s infinite" }}>
              (Click vào thẻ để lật xem đáp án)
            </p>
          )}
        </div>

        <div className="card-face card-back" style={{ padding: "40px", display: "flex", flexDirection: "column" }}>
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", overflowY: "auto" }}>
            <p className="answer-text" style={{ fontSize: "1.3rem", lineHeight: "1.6", color: "var(--text-dark)", textAlign: "center", margin: 0 }}>
              {currentCard.answer || currentCard.back_content}
            </p>
          </div>

          <div className="rating-section" onClick={(e) => e.stopPropagation()} style={{ marginTop: "30px", paddingTop: "20px", borderTop: "1px dashed var(--border)" }}>
            <div style={{ display: "flex", gap: "20px", width: "100%" }}>
              <button
                className="btn-rating btn-again"
                onClick={() => handleCramRating(false)}
                style={{
                  flex: 1, padding: "18px", fontSize: "1.1rem", background: "#ef4444", color: "white",
                  border: "none", borderRadius: "12px", fontWeight: "bold", cursor: "pointer", transition: "all 0.2s",
                  boxShadow: "0 4px 10px rgba(239, 68, 68, 0.3)"
                }}
              >
                <i className="fa-solid fa-xmark" style={{marginRight: "8px"}}></i> Quên (Bỏ vào cuối hàng)
              </button>
              <button
                className="btn-rating btn-easy"
                onClick={() => handleCramRating(true)}
                style={{
                  flex: 1, padding: "18px", fontSize: "1.1rem", background: "#10b981", color: "white",
                  border: "none", borderRadius: "12px", fontWeight: "bold", cursor: "pointer", transition: "all 0.2s",
                  boxShadow: "0 4px 10px rgba(16, 185, 129, 0.3)"
                }}
              >
                <i className="fa-solid fa-check" style={{marginRight: "8px"}}></i> Nhớ (Loại khỏi lượt)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CramReviewPage;