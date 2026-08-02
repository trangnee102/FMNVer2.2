// frontend/src/components/Dashboard/DeckList.jsx
import React, { useState } from "react";

const DeckList = ({ decks, onStudy, onNavigate }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMode, setFilterMode] = useState("all"); 
  const [showFilters, setShowFilters] = useState(false);

  // 1. Lọc dựa trên Text Search
  let filteredDecks = decks.filter(deck => 
    (deck.title || deck.name || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 2. Lọc dựa trên Filter Mode
  switch (filterMode) {
    case "cram": 
      filteredDecks = filteredDecks.filter(deck => deck.daysLeft !== null);
      break;
    case "due": 
      filteredDecks = filteredDecks.filter(deck => (deck.calculatedDue || 0) > 0);
      break;
    case "completed": 
      filteredDecks = filteredDecks.filter(deck => 
        (deck.calculatedTotal || 0) > 0 && (deck.calculatedDue || 0) === 0
      );
      break;
    case "ai": 
      filteredDecks = filteredDecks.filter(deck => 
        (deck.title || deck.name || "").toLowerCase().includes("(ai generated)")
      );
      break;
    default:
      break;
  }

  // 3. Sắp xếp ưu tiên (Priority Sorting)
  const processedDecks = filteredDecks.sort((a, b) => {
    const aIsCram = a.daysLeft !== null;
    const bIsCram = b.daysLeft !== null;
    const aDue = a.calculatedDue || 0;
    const bDue = b.calculatedDue || 0;

    if (aIsCram && !bIsCram) return -1;
    if (!aIsCram && bIsCram) return 1;
    if (aIsCram && bIsCram) return a.daysLeft - b.daysLeft;
    if (aDue !== bDue) return bDue - aDue;

    return (b.calculatedTotal || b.totalCards || 0) - (a.calculatedTotal || a.totalCards || 0);
  });

  return (
    <div className="widget-card list-widget" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      
      {/* CSS ĐỘC LẬP TẠO THANH CUỘN BÊN PHẢI SIÊU MƯỢT */}
      <style>
        {`
          .custom-deck-scrollbar::-webkit-scrollbar {
            width: 6px;
          }
          .custom-deck-scrollbar::-webkit-scrollbar-track {
            background: transparent;
            border-radius: 10px;
          }
          .custom-deck-scrollbar::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 10px;
          }
          .custom-deck-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
          }
        `}
      </style>

      <div className="list-header" style={{ flexShrink: 0, marginBottom: "15px" }}>
        <h3>Bộ thẻ cần ôn hôm nay</h3>
        <button className="btn-view-all" onClick={() => onNavigate("my-decks")}>
          Xem tất cả →
        </button>
      </div>

      <div style={{ display: "flex", gap: "10px", marginBottom: showFilters ? "10px" : "15px", flexShrink: 0 }}>
        <div className="deck-search-box" style={{ flex: 1, margin: 0 }}>
          <i className="fa-solid fa-magnifying-glass"></i>
          <input 
            type="text" 
            placeholder="Tìm bộ thẻ nhanh..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button 
          onClick={() => setShowFilters(!showFilters)}
          style={{
            background: showFilters ? "#6366f1" : "var(--bg-main)",
            color: showFilters ? "white" : "var(--text-gray)",
            border: "1px solid var(--border)",
            borderRadius: "10px",
            padding: "0 15px",
            cursor: "pointer",
            transition: "all 0.2s",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: showFilters ? "0 4px 10px rgba(99, 102, 241, 0.3)" : "none"
          }}
          title="Lọc Nâng Cao"
        >
          <i className="fa-solid fa-filter"></i>
        </button>
      </div>

      {showFilters && (
        <div style={{ 
          display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "15px", flexShrink: 0,
          padding: "12px", background: "var(--bg-main)", borderRadius: "10px", border: "1px dashed var(--border)"
        }}>
          {[
            { id: "all", label: "Tất cả", icon: "fa-layer-group" },
            { id: "cram", label: "Đang ôn thi", icon: "fa-fire" },
            { id: "due", label: "Cần ôn ngay", icon: "fa-clock" },
            { id: "completed", label: "Đã xong", icon: "fa-check-double" },
            { id: "ai", label: "AI tạo", icon: "fa-robot" }
          ].map(filter => (
            <button
              key={filter.id}
              onClick={() => setFilterMode(filter.id)}
              style={{
                background: filterMode === filter.id ? "rgba(99, 102, 241, 0.15)" : "transparent",
                color: filterMode === filter.id ? "#4f46e5" : "var(--text-gray)",
                border: filterMode === filter.id ? "1px solid #818cf8" : "1px solid transparent",
                padding: "6px 12px",
                borderRadius: "20px",
                fontSize: "0.75rem",
                fontWeight: "600",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "5px",
                transition: "all 0.2s"
              }}
            >
              <i className={`fa-solid ${filter.icon}`}></i> {filter.label}
            </button>
          ))}
        </div>
      )}

      {/* 👉 GIỚI HẠN CHIỀU CAO VÀ ÉP THANH CUỘN DỌC */}
      <div className="list-body custom-deck-scrollbar" style={{ flex: 1, overflowY: "auto", minHeight: "150px", maxHeight: "320px", paddingRight: "8px", paddingBottom: "10px" }}>
        {processedDecks.length > 0 ? (
          processedDecks.map((deck) => {
            const isRedZone = deck.daysLeft !== null;
            const isCompleted = deck.calculatedTotal > 0 && deck.calculatedDue === 0;

            const originalTitle = deck.title || deck.name || "Bộ thẻ không tên";
            const isAIGenerated = originalTitle.toLowerCase().includes("(ai generated)");
            const displayTitle = isAIGenerated ? originalTitle.replace(/\(ai generated\)/i, "").trim() : originalTitle;

            return (
              <div
                className="list-item"
                key={deck.id}
                style={{
                  borderLeft: isRedZone ? "4px solid #f59e0b" : "4px solid transparent",
                  backgroundColor: isRedZone ? "rgba(245, 158, 11, 0.05)" : "var(--bg-main)",
                }}
              >
                <div className="item-info-wrapper" style={{ display: "flex", alignItems: "center", flex: 1, minWidth: 0 }}>
                  <div
                    className="item-icon"
                    style={{
                      background: isRedZone ? "rgba(245, 158, 11, 0.15)" : "rgba(99, 102, 241, 0.1)",
                      color: isRedZone ? "#d97706" : "#6366f1",
                    }}
                  >
                    <i className="fa-solid fa-layer-group"></i>
                  </div>
                  
                  <div className="item-info" style={{ overflow: "hidden", paddingRight: "10px" }}>
                    <h4 title={displayTitle} style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "180px" }}>
                      {displayTitle}
                      {isAIGenerated && (
                        <i className="fa-solid fa-robot" style={{ color: "#a855f7", marginLeft: "6px", fontSize: "0.85rem" }} title="Tạo bằng AI"></i>
                      )}
                    </h4>
                    
                    <span className="item-meta">
                      {isRedZone ? (
                        <span style={{ color: "#ea580c", fontWeight: "700" }}>
                          {deck.daysLeft > 0 ? `🚨 Còn ${deck.daysLeft} ngày!` : "🔥 Thi hôm nay!"}
                        </span>
                      ) : (
                        `${deck.calculatedTotal || deck.totalCards || 0} thẻ`
                      )}
                    </span>
                  </div>
                </div>

                <div style={{ flexShrink: 0 }}>
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
                    {isRedZone ? "Vào lò ⚡" : (isCompleted ? "Xem lại" : "Ôn ngay")}
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div style={{ textAlign: "center", padding: "30px 0", color: "var(--text-gray)" }}>
            <div style={{ background: "var(--bg-main)", width: "50px", height: "50px", margin: "0 auto 10px auto", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem" }}>
              <i className={filterMode !== "all" ? "fa-solid fa-filter-circle-xmark" : "fa-solid fa-box-open"}></i>
            </div>
            <p style={{ margin: 0, fontSize: "0.9rem" }}>
              {filterMode !== "all" ? "Không có bộ thẻ nào khớp với bộ lọc." : "Chưa có bộ thẻ nào."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeckList;