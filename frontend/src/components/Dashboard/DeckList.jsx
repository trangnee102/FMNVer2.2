import React from "react";
import Button from "../common/Button";

const DeckList = ({ decks, onStudy, onNavigate }) => {
  return (
    <section className="decks-section">
      <h3 style={{ marginBottom: "15px", color: "var(--text-dark)" }}>Bộ thẻ cần ôn hôm nay</h3>

      {decks.map((deck) => {
        // Biến này xác định bộ thẻ có đang bật Cram Mode (vùng đỏ) hay không
        const isRedZone = deck.daysLeft !== null;

        return (
          <div
            className="deck-item"
            key={deck.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "15px",
              borderBottom: "1px solid var(--border)",
              // 👉 ĐÃ SỬA: Loại bỏ #fff và #fffbeb, dùng biến màu Dark Mode chuẩn
              background: isRedZone ? "rgba(245, 158, 11, 0.05)" : "var(--bg-card)",
              borderLeft: isRedZone ? "4px solid #f59e0b" : "4px solid transparent",
              borderRadius: "8px",
              marginBottom: "10px",
              transition: "all 0.3s ease",
            }}
          >
            {/* 1. Phần Tên và Icon (Bên trái) */}
            <div style={{ display: "flex", gap: "15px", alignItems: "center", flex: 1 }}>
              <div
                className="deck-icon"
                style={{
                  background: isRedZone ? "rgba(245, 158, 11, 0.15)" : "var(--bg-main)",
                  color: isRedZone ? "#d97706" : "var(--primary)",
                  width: "40px",
                  height: "40px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "10px",
                }}
              >
                <i className="fa-solid fa-layer-group"></i>
              </div>
              <div>
                <h4 style={{ margin: 0, color: "var(--text-dark)" }}>
                  {deck.title || deck.name}
                </h4>
                <span style={{ fontSize: "0.85rem", color: "var(--text-gray)" }}>
                  {deck.totalCards || 0} thẻ
                </span>
              </div>
            </div>

            {/* 2. Phần báo trạng thái & Đếm ngược (Ở giữa) */}
            <div style={{ flex: 1, textAlign: "center", display: "flex", flexDirection: "column", gap: "4px" }}>
              {!isRedZone && (
                <div
                  style={{
                    color: deck.dueCards > 0 ? "#10b981" : "var(--text-gray)",
                    fontWeight: "600",
                    fontSize: "0.95rem",
                  }}
                >
                  {deck.dueCards > 0
                    ? `🌱 ${deck.dueCards} thẻ đến hạn`
                    : "✨ Đã học xong!"}
                </div>
              )}

              {isRedZone && (
                <div
                  style={{
                    color: "#ea580c",
                    fontSize: "0.95rem",
                    fontWeight: "bold",
                  }}
                >
                  {deck.daysLeft > 0
                    ? `🚨 Cháy máy: Còn ${deck.daysLeft} ngày thi!`
                    : "🔥 Thi ngay hôm nay!"}
                </div>
              )}
            </div>

            {/* 3. Nút bấm (Bên phải) */}
            <div style={{ flex: 1, textAlign: "right" }}>
              <Button
                text={isRedZone ? "Vào lò luyện ⚡" : "Ôn tập"}
                variant={deck.dueCards > 0 || isRedZone ? "primary" : "outline"}
                onClick={() => {
                  if (isRedZone) {
                    onNavigate("cram-review", deck.id);
                  } else {
                    onStudy(deck.id);
                  }
                }}
              />
            </div>
          </div>
        );
      })}

      <div style={{ marginTop: "20px" }}>
        {/* 👉 ĐÃ SỬA: Biến thẻ a thành một thẻ span có chức năng onClick thật sự */}
        <span
          onClick={() => onNavigate("my-decks")}
          style={{
            color: "var(--primary)",
            textDecoration: "none",
            fontWeight: "600",
            fontSize: "0.9rem",
            cursor: "pointer",
          }}
        >
          Xem tất cả bộ thẻ →
        </span>
      </div>
    </section>
  );
};

export default DeckList;