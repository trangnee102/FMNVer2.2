import React, { useState } from "react";

const RecentExamsWidget = ({ exams, onNavigate }) => {
  const [examSearchTerm, setExamSearchTerm] = useState("");
  const [examFilterMode, setExamFilterMode] = useState("all");
  const [showExamFilters, setShowExamFilters] = useState(false);

  let filteredExams = exams.filter((exam) =>
    (exam.title || exam.name || "")
      .toLowerCase()
      .includes(examSearchTerm.toLowerCase()),
  );

  if (examFilterMode === "ai") {
    filteredExams = filteredExams.filter((exam) =>
      (exam.title || exam.name || "").toLowerCase().includes("(ai generated)"),
    );
  }

  const processedExams = filteredExams
    .sort((a, b) => {
      const aCards = a.calculatedTotal || 0;
      const bCards = b.calculatedTotal || 0;
      if (examFilterMode === "most") return bCards - aCards;
      if (examFilterMode === "least") return aCards - bCards;
      return bCards - aCards;
    })
    .slice(0, 5);

  return (
    <div
      className="widget-card list-widget"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      <div
        className="list-header"
        style={{ flexShrink: 0, marginBottom: "15px" }}
      >
        <h3>Bộ đề cần làm hôm nay</h3>
        <button className="btn-view-all" onClick={() => onNavigate("my-exams")}>
          Xem tất cả →
        </button>
      </div>

      <div
        style={{
          display: "flex",
          gap: "10px",
          marginBottom: showExamFilters ? "10px" : "15px",
          flexShrink: 0,
        }}
      >
        <div className="deck-search-box" style={{ flex: 1, margin: 0 }}>
          <i className="fa-solid fa-magnifying-glass"></i>
          <input
            type="text"
            placeholder="Tìm bộ đề thi nhanh..."
            value={examSearchTerm}
            onChange={(e) => setExamSearchTerm(e.target.value)}
          />
        </div>
        <button
          onClick={() => setShowExamFilters(!showExamFilters)}
          style={{
            background: showExamFilters ? "#6366f1" : "var(--bg-main)",
            color: showExamFilters ? "white" : "var(--text-gray)",
            border: "1px solid var(--border)",
            borderRadius: "10px",
            padding: "0 15px",
            cursor: "pointer",
            transition: "all 0.2s",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: showExamFilters
              ? "0 4px 10px rgba(99, 102, 241, 0.3)"
              : "none",
          }}
          title="Lọc Nâng Cao"
        >
          <i className="fa-solid fa-filter"></i>
        </button>
      </div>

      {showExamFilters && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "8px",
            marginBottom: "15px",
            flexShrink: 0,
            padding: "12px",
            background: "var(--bg-main)",
            borderRadius: "10px",
            border: "1px dashed var(--border)",
          }}
        >
          {[
            { id: "all", label: "Tất cả", icon: "fa-layer-group" },
            { id: "most", label: "Nhiều câu nhất", icon: "fa-arrow-up-9-1" },
            { id: "least", label: "Ít câu nhất", icon: "fa-arrow-down-1-9" },
            { id: "ai", label: "AI tạo", icon: "fa-robot" },
          ].map((filter) => (
            <button
              key={filter.id}
              onClick={() => setExamFilterMode(filter.id)}
              style={{
                background:
                  examFilterMode === filter.id
                    ? "rgba(99, 102, 241, 0.15)"
                    : "transparent",
                color:
                  examFilterMode === filter.id ? "#4f46e5" : "var(--text-gray)",
                border:
                  examFilterMode === filter.id
                    ? "1px solid #818cf8"
                    : "1px solid transparent",
                padding: "6px 12px",
                borderRadius: "20px",
                fontSize: "0.75rem",
                fontWeight: "600",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "5px",
                transition: "all 0.2s",
              }}
            >
              <i className={`fa-solid ${filter.icon}`}></i> {filter.label}
            </button>
          ))}
        </div>
      )}

      <div
        className="list-body custom-deck-scrollbar"
        style={{
          flex: 1,
          overflowY: "auto",
          minHeight: "150px",
          maxHeight: "320px",
          paddingRight: "8px",
          paddingBottom: "10px",
        }}
      >
        {processedExams.length > 0 ? (
          processedExams.map((exam) => {
            const totalCards = exam.calculatedTotal || 0;
            const displayTitle = exam.title || exam.name || "Đề thi không tên";
            const isAIGenerated = displayTitle
              .toLowerCase()
              .includes("(ai generated)");
            const cleanTitle = isAIGenerated
              ? displayTitle.replace(/\(ai generated\)/i, "").trim()
              : displayTitle;

            return (
              <div
                className="list-item exam-item"
                key={exam.id}
                style={{
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                }}
                onClick={() => onNavigate("my-exams")}
              >
                <div
                  className="item-info-wrapper"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  <div
                    className="item-icon bg-red-light"
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "10px",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      flexShrink: 0,
                      marginRight: "10px",
                      backgroundColor: "rgba(168, 85, 247, 0.1)",
                    }}
                  >
                    <i
                      className="fa-solid fa-file-contract"
                      style={{ color: "#a855f7" }}
                    ></i>
                  </div>
                  <div
                    className="item-info"
                    style={{ overflow: "hidden", paddingRight: "10px" }}
                  >
                    <h4
                      title={cleanTitle}
                      style={{
                        margin: 0,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        maxWidth: "180px",
                      }}
                    >
                      {cleanTitle}
                      {isAIGenerated && (
                        <i
                          className="fa-solid fa-robot"
                          style={{
                            color: "#ea580c",
                            marginLeft: "6px",
                            fontSize: "0.85rem",
                          }}
                          title="Đề thi tạo bởi AI"
                        ></i>
                      )}
                    </h4>
                  </div>
                </div>
                <div style={{ flexShrink: 0 }}>
                  <div
                    style={{
                      background: "rgba(168, 85, 247, 0.15)",
                      color: "#a855f7",
                      padding: "4px 10px",
                      borderRadius: "8px",
                      fontSize: "0.85rem",
                      fontWeight: "700",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {totalCards} câu
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div
            style={{
              textAlign: "center",
              padding: "30px 0",
              color: "var(--text-gray)",
            }}
          >
            <div
              style={{
                background: "var(--bg-main)",
                width: "50px",
                height: "50px",
                margin: "0 auto 10px auto",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.2rem",
              }}
            >
              <i
                className={
                  examFilterMode !== "all"
                    ? "fa-solid fa-filter-circle-xmark"
                    : "fa-solid fa-folder-open"
                }
              ></i>
            </div>
            <p style={{ margin: 0, fontSize: "0.9rem" }}>
              {examFilterMode !== "all"
                ? "Không có đề thi nào khớp với bộ lọc."
                : "Chưa có đề thi nào."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecentExamsWidget;