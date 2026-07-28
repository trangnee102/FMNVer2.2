// frontend/src/components/Dashboard/DeckList.jsx
import React, { useState } from "react";

// Không cần dùng Button cũ nữa vì ta đã thiết kế class .btn-deck-action chuyên dụng trong CSS
// import Button from "../common/Button"; 

const DeckList = ({ decks, onStudy, onNavigate }) => {
  // State quản lý thanh tìm kiếm
  const [searchTerm, setSearchTerm] = useState("");

  // Logic lọc danh sách thẻ theo từ khóa
  const filteredDecks = decks.filter(deck => 
    (deck.title || deck.name).toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <section className="deck-list-container">
      <div className="deck-list-header">
        <h3 style={{ color: "var(--text-dark)" }}>Bộ thẻ cần ôn hôm nay</h3>
        <span
          onClick={() => onNavigate("my-decks")}
          style={{
            color: "var(--primary)",
            fontWeight: "700",
            fontSize: "0.95rem",
            cursor: "pointer",
            transition: "all 0.2s ease"
          }}
        >
          Xem tất cả →
        </span>
      </div>

      {/* Thanh tìm kiếm hiện đại */}
      <div className="deck-search-box">
        <i className="fa-solid fa-magnifying-glass"></i>
        <input 
          type="text" 
          placeholder="Tìm bộ thẻ nhanh..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Danh sách thẻ */}
      <div className="deck-list-scroll">
        {filteredDecks.length > 0 ? (
          filteredDecks.map((deck) => {
            // Xác định trạng thái Cram Mode và Hoàn thành
            const isRedZone = deck.daysLeft !== null;
            const isCompleted = deck.calculatedTotal > 0 && deck.calculatedDue === 0;

            // Xử lý làm đẹp tên bộ thẻ AI
            const originalTitle = deck.title || deck.name || "Bộ thẻ không tên";
            const isAIGenerated = originalTitle.toLowerCase().includes("(ai generated)");
            const displayTitle = isAIGenerated ? originalTitle.replace(/\(ai generated\)/i, "").trim() : originalTitle;

            return (
              <div
                className="deck-item"
                key={deck.id}
                style={{
                  // Chỉ giữ lại style màu sắc nền Cram Mode, bỏ đi các style Flex gây vỡ layout
                  background: isRedZone ? "rgba(245, 158, 11, 0.05)" : "var(--bg-card)",
                  borderLeft: isRedZone ? "4px solid #f59e0b" : "4px solid transparent",
                  borderColor: isRedZone ? "rgba(245, 158, 11, 0.2)" : "var(--border)",
                }}
              >
                {/* 1. Phần Tên và Icon (Bên trái) */}
                <div className="deck-item-info">
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
                      borderRadius: "12px",
                      fontSize: "1.2rem",
                      flexShrink: 0
                    }}
                  >
                    <i className="fa-solid fa-layer-group"></i>
                  </div>
                  <div style={{ overflow: "hidden" }}>
                    <h4 style={{ margin: "0 0 3px 0", color: "var(--text-dark)", fontSize: "1.05rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {displayTitle}
                      {isAIGenerated && (
                        <i className="fa-solid fa-robot" style={{ color: "#a855f7", marginLeft: "6px", fontSize: "0.9rem" }} title="Tạo bằng AI"></i>
                      )}
                    </h4>
                    <span style={{ fontSize: "0.85rem", color: "var(--text-gray)", fontWeight: "600" }}>
                      {deck.calculatedTotal || deck.totalCards || 0} thẻ
                    </span>
                  </div>
                </div>

                {/* 2. Phần báo trạng thái & Đếm ngược (Ở giữa) */}
                <div className="deck-item-status">
                  {!isRedZone && (
                    <div
                      style={{
                        color: deck.calculatedDue > 0 ? "#10b981" : "var(--text-gray)",
                        fontWeight: "700",
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
                        fontWeight: "800",
                      }}
                    >
                      {deck.daysLeft > 0
                        ? `🚨 Còn ${deck.daysLeft} ngày thi!`
                        : "🔥 Thi ngay hôm nay!"}
                    </div>
                  )}
                </div>

                {/* 3. Nút bấm (Bên phải) */}
                <div className="deck-item-action">
                  <button
                    className={`btn-deck-action ${isCompleted && !isRedZone ? "completed" : ""}`}
                    onClick={() => {
                      if (isRedZone) {
                        onNavigate("cram-review", deck.id);
                      } else {
                        onStudy(deck.id);
                      }
                    }}
                  >
                    {isRedZone ? "Vào lò ⚡" : (isCompleted ? "👁 Xem lại" : "Ôn tập")}
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-gray)" }}>
            <div style={{ background: "var(--bg-main)", width: "60px", height: "60px", margin: "0 auto 15px auto", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem" }}>
              <i className="fa-solid fa-box-open"></i>
            </div>
            <p style={{ margin: 0, fontWeight: "600" }}>Không tìm thấy bộ thẻ nào phù hợp.</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default DeckList;