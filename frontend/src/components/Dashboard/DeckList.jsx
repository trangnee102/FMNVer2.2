import React, { useState } from "react";
import Button from "../common/Button";

const DeckList = ({ decks, onStudy, onNavigate }) => {
  // 👉 THÊM: State quản lý thanh tìm kiếm
  const [searchTerm, setSearchTerm] = useState("");

  // 👉 THÊM: Logic lọc danh sách thẻ theo từ khóa
  const filteredDecks = decks.filter(deck => 
    (deck.title || deck.name).toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <section className="decks-section">
      <div className="deck-list-header" style={{ marginBottom: "15px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ margin: 0, color: "var(--text-dark)" }}>Bộ thẻ cần ôn hôm nay</h3>
        <span
          onClick={() => onNavigate("my-decks")}
          style={{
            color: "var(--primary)",
            fontWeight: "600",
            fontSize: "0.9rem",
            cursor: "pointer",
          }}
        >
          Xem tất cả →
        </span>
      </div>

      {/* 👉 THÊM: Thanh tìm kiếm hiện đại */}
      <div className="deck-search-box">
        <i className="fa-solid fa-magnifying-glass"></i>
        <input 
          type="text" 
          placeholder="Tìm bộ thẻ nhanh..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* 👉 THÊM: Bọc danh sách vào khu vực Scroll với giới hạn chiều cao (max-height) */}
      <div className="deck-list-scroll" style={{ marginTop: "15px" }}>
        {filteredDecks.length > 0 ? (
          filteredDecks.map((deck) => {
            // Biến này xác định bộ thẻ có đang bật Cram Mode thật sự hay không
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
                  background: isRedZone ? "rgba(245, 158, 11, 0.05)" : "var(--bg-card)",
                  borderLeft: isRedZone ? "4px solid #f59e0b" : "4px solid transparent",
                  border: isRedZone ? "1px solid rgba(245, 158, 11, 0.2)" : "1px solid var(--border)",
                  borderLeftWidth: "4px",
                  borderRadius: "12px",
                  marginBottom: "12px",
                  transition: "all 0.3s ease",
                }}
              >
                {/* 1. Phần Tên và Icon (Bên trái) */}
                <div style={{ display: "flex", gap: "15px", alignItems: "center", flex: 1.2 }}>
                  <div
                    className="deck-icon"
                    style={{
                      background: isRedZone ? "rgba(245, 158, 11, 0.15)" : "rgba(59, 130, 246, 0.1)",
                      color: isRedZone ? "#d97706" : "var(--primary)",
                      width: "45px",
                      height: "45px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "10px",
                      fontSize: "1.2rem"
                    }}
                  >
                    <i className="fa-solid fa-layer-group"></i>
                  </div>
                  <div>
                    <h4 style={{ margin: 0, color: "var(--text-dark)", fontSize: "1.05rem" }}>
                      {deck.title || deck.name}
                    </h4>
                    <span style={{ fontSize: "0.85rem", color: "var(--text-gray)" }}>
                      {deck.calculatedTotal || deck.totalCards || 0} thẻ
                    </span>
                  </div>
                </div>

                {/* 2. Phần báo trạng thái & Đếm ngược (Ở giữa) */}
                <div style={{ flex: 1.5, textAlign: "center", display: "flex", flexDirection: "column", gap: "4px" }}>
                  {!isRedZone && (
                    <div
                      style={{
                        color: deck.calculatedDue > 0 ? "#10b981" : "var(--text-gray)",
                        fontWeight: "600",
                        fontSize: "0.95rem",
                      }}
                    >
                      {deck.calculatedDue > 0
                        ? `🌱 ${deck.calculatedDue} thẻ đến hạn`
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
                <div style={{ flex: 0.8, textAlign: "right" }}>
                  <Button
                    text={isRedZone ? "Vào lò ⚡" : "Ôn tập"}
                    variant={deck.calculatedDue > 0 || isRedZone ? "primary" : "outline"}
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
          })
        ) : (
          <div style={{ textAlign: "center", padding: "30px 0", color: "var(--text-gray)" }}>
            <i className="fa-solid fa-box-open" style={{ fontSize: "2rem", marginBottom: "10px", opacity: 0.5 }}></i>
            <p>Không tìm thấy bộ thẻ nào phù hợp.</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default DeckList;