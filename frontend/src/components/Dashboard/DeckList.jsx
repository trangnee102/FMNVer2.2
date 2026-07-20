import React from "react";
import Button from "../common/Button";

// 👉 ĐÃ NHẬN THÊM onNavigate TỪ DASHBOARD TRUYỀN XUỐNG
const DeckList = ({ decks, onStudy, onNavigate }) => {
  return (
    <section className="decks-section">
      <h3 style={{ marginBottom: "15px" }}>Bộ thẻ cần ôn hôm nay</h3>

      {decks.map((deck) => {
        // 👉 ĐÃ THÊM: Biến này xác định bộ thẻ có đang bật Cram Mode (vùng đỏ) hay không
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
              borderBottom: "1px solid #f0f0f0",
              // 👉 ĐỔI MÀU GIAO DIỆN KHI VÀO VÙNG ĐỎ
              background: isRedZone ? "#fffbeb" : "#fff",
              borderLeft: isRedZone ? "4px solid #f59e0b" : "none",
            }}
          >
            {/* 1. Phần Tên và Icon (Bên trái) */}
            <div
              style={{
                display: "flex",
                gap: "15px",
                alignItems: "center",
                flex: 1,
              }}
            >
              <div
                className="deck-icon"
                style={{
                  background: isRedZone ? "#fef3c7" : "",
                  color: isRedZone ? "#d97706" : "",
                }}
              >
                <i className="fa-solid fa-layer-group"></i>
              </div>
              <div>
                <h4 style={{ margin: 0, color: "var(--text-dark)" }}>
                  {deck.title || deck.name}
                </h4>
                <span
                  style={{ fontSize: "0.85rem", color: "var(--text-gray)" }}
                >
                  {deck.totalCards || 0} thẻ
                </span>
              </div>
            </div>

            {/* 2. Phần báo trạng thái & Đếm ngược (Ở giữa) */}
            <div
              style={{
                flex: 1,
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                gap: "4px",
              }}
            >
              {/* NẾU KHÔNG CÓ CRAM MODE -> Hiện trạng thái học bình thường */}
              {!isRedZone && (
                <div
                  style={{
                    color:
                      deck.dueCards > 0 ? "var(--green)" : "var(--text-gray)",
                    fontWeight: "600",
                    fontSize: "0.95rem",
                  }}
                >
                  {deck.dueCards > 0
                    ? `🌱 ${deck.dueCards} thẻ đến hạn`
                    : "✨ Đã học xong!"}
                </div>
              )}

              {/* NẾU CÓ CRAM MODE -> Chiếm sóng, báo động ngày thi */}
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
                // 👉 ĐÃ SỬA: Nút sẽ luôn sáng màu nếu có bài đến hạn HOẶC đang trong vùng đỏ Cram Mode
                variant={deck.dueCards > 0 || isRedZone ? "primary" : "outline"}
                onClick={() => {
                  // 👉 LÕI HACK UX CỦA TRANG:
                  if (isRedZone) {
                    // Nếu đang Cram Mode, ấn vào là bay thẳng vào Lò luyện
                    onNavigate("cram-review", deck.id);
                  } else {
                    // Nếu ngày thường thì học theo chế độ Spaced Repetition như cũ
                    onStudy(deck.id);
                  }
                }}
              />
            </div>
          </div>
        );
      })}

      <div style={{ marginTop: "20px" }}>
        <a
          href="#"
          style={{
            color: "var(--primary)",
            textDecoration: "none",
            fontWeight: "600",
            fontSize: "0.9rem",
          }}
        >
          Xem tất cả bộ thẻ →
        </a>
      </div>
    </section>
  );
};

export default DeckList;
