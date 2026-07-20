import { useState } from "react";

function Flashcard({ card, onReview }) {
  const [showAnswer, setShowAnswer] = useState(false);

  // Khi bấm nút chấm điểm
  const handleScore = (grade) => {
    onReview(grade); // Bắn điểm về cho StudyBoard xử lý
    setShowAnswer(false); // Tự động úp thẻ xuống chuẩn bị cho thẻ tiếp theo
  };

  return (
    <div
      style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
    >
      {/* KHUNG TẤM THẺ */}
      <div
        onClick={() => setShowAnswer(true)}
        style={{
          border: "2px solid #646cff",
          padding: "40px",
          borderRadius: "15px",
          backgroundColor: "#1a1a1a",
          width: "300px",
          minHeight: "200px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          cursor: !showAnswer ? "pointer" : "default",
          transition: "all 0.3s ease",
          boxShadow: "0 4px 8px rgba(0,0,0,0.5)",
        }}
      >
        <h3 style={{ margin: 0, fontSize: "24px", color: "#fff" }}>
          📌 {card.question}
        </h3>

        {showAnswer ? (
          <div
            style={{
              marginTop: "20px",
              borderTop: "1px solid #444",
              paddingTop: "20px",
              width: "100%",
              textAlign: "center",
            }}
          >
            <p style={{ fontSize: "18px", color: "#4caf50", margin: 0 }}>
              💡 {card.answer}
            </p>
          </div>
        ) : (
          <p
            style={{
              marginTop: "20px",
              color: "#888",
              fontStyle: "italic",
              fontSize: "14px",
            }}
          >
            (Bấm vào thẻ để xem đáp án)
          </p>
        )}
      </div>

      {/* 4 NÚT ĐÁNH GIÁ */}
      {showAnswer && (
        <div style={{ display: "flex", gap: "10px", marginTop: "25px" }}>
          <button
            onClick={() => handleScore(1)}
            style={{
              backgroundColor: "#ff4d4d",
              color: "white",
              border: "none",
              padding: "10px 15px",
              borderRadius: "5px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            Quên (1)
          </button>
          <button
            onClick={() => handleScore(2)}
            style={{
              backgroundColor: "#ffaa00",
              color: "white",
              border: "none",
              padding: "10px 15px",
              borderRadius: "5px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            Khó (2)
          </button>
          <button
            onClick={() => handleScore(3)}
            style={{
              backgroundColor: "#4caf50",
              color: "white",
              border: "none",
              padding: "10px 15px",
              borderRadius: "5px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            Tốt (3)
          </button>
          <button
            onClick={() => handleScore(4)}
            style={{
              backgroundColor: "#008cba",
              color: "white",
              border: "none",
              padding: "10px 15px",
              borderRadius: "5px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            Dễ (4)
          </button>
        </div>
      )}
    </div>
  );
}

export default Flashcard;
