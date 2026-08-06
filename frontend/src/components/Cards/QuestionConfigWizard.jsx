import React from "react";
import "./QuestionConfigWizard.css";

// 👉 ĐÃ NÂNG CẤP: Nhận activeStep và setActiveStep từ Component Cha truyền xuống
const QuestionConfigWizard = ({
  questionsConfig,
  setQuestionsConfig,
  activeStep,
  setActiveStep,
}) => {
  const [activeTypeBrush, setActiveTypeBrush] = React.useState("");

  if (questionsConfig.length === 0) return null;

  const handlePaintItem = (index) => {
    const newConfig = [...questionsConfig];
    const currentQ = newConfig[index];

    if (activeStep === "TYPE" && activeTypeBrush) {
      if (currentQ.type === activeTypeBrush) {
        newConfig[index].type = "";
      } else {
        newConfig[index].type = activeTypeBrush;
      }
    }

    setQuestionsConfig(newConfig);
  };

  const handleApplyAll = (field, value) => {
    if (!value && value !== "") return;
    const newConfig = questionsConfig.map((q) => {
      if (field === "type" && value === "RANDOM") {
        const types = ["SINGLE_CHOICE", "MULTIPLE_CHOICE", "TRUE_FALSE", "FILL_BLANK"];
        return { ...q, type: types[Math.floor(Math.random() * types.length)] };
      }
      return { ...q, [field]: value };
    });
    setQuestionsConfig(newConfig);
  };

  const getTypeStyle = (type) => {
    if (type === "SINGLE_CHOICE")
      return {
        icon: "🔘",
        bg: "rgba(59, 130, 246, 0.1)",
        label: "1 Đáp án",
        color: "#3b82f6",
      };
    if (type === "MULTIPLE_CHOICE")
      return {
        icon: "☑️",
        bg: "rgba(139, 92, 246, 0.1)",
        label: "Nhiều đáp án",
        color: "#8b5cf6",
      };
    if (type === "TRUE_FALSE")
      return {
        icon: "⚖️",
        bg: "rgba(20, 184, 166, 0.1)",
        label: "Đúng/Sai",
        color: "#14b8a6",
      };
    if (type === "FILL_BLANK")
      return {
        icon: "✍️",
        bg: "rgba(244, 63, 94, 0.1)",
        label: "Điền khuyết",
        color: "#f43f5e",
      };
    return { icon: "⬜", bg: "#f3f4f6", label: "Chưa gán", color: "#9ca3af" };
  };

  const generateMatrixSummary = () => {
    const matrix = {};
    questionsConfig.forEach((q) => {
      const key = q.type;
      if (!matrix[key]) matrix[key] = [];
      matrix[key].push(q.id);
    });
    return matrix;
  };

  return (
    <div className="cei-wizard-container">
      {/* Tabs */}
      <div className="cei-wizard-tabs">
        <button
          className="cei-tab-btn"
          onClick={() => setActiveStep("TYPE")}
          style={{
            borderBottomColor:
              activeStep === "TYPE" ? "#8b5cf6" : "transparent",
            backgroundColor:
              activeStep === "TYPE"
                ? "rgba(139, 92, 246, 0.05)"
                : "transparent",
            color: activeStep === "TYPE" ? "#8b5cf6" : "var(--text-gray)",
          }}
        >
          1. Chọn Loại Câu Hỏi
        </button>
        <button
          className="cei-tab-btn"
          onClick={() => {
            setActiveStep("SUMMARY");
            setActiveTypeBrush("");
          }}
          style={{
            borderBottomColor:
              activeStep === "SUMMARY" ? "#10b981" : "transparent",
            backgroundColor:
              activeStep === "SUMMARY"
                ? "rgba(16, 185, 129, 0.05)"
                : "transparent",
            color: activeStep === "SUMMARY" ? "#10b981" : "var(--text-gray)",
          }}
        >
          2. Xem Ma Trận <i className="fa-solid fa-check-double"></i>
        </button>
      </div>

      {/* Toolbar & Grid */}
      {activeStep === "TYPE" && (
        <div style={{ padding: "20px" }}>
          <div className="cei-toolbar">
            <div className="qcw-toolbar-group">
              <span className="qcw-toolbar-label">
                <i
                  className="fa-solid fa-paintbrush"
                  style={{ color: "#8b5cf6" }}
                ></i>{" "}
                Cọ Loại Câu:
              </span>
              <button
                className="cei-brush-btn"
                onClick={() =>
                  setActiveTypeBrush(
                    activeTypeBrush === "SINGLE_CHOICE"
                      ? ""
                      : "SINGLE_CHOICE",
                  )
                }
                style={{
                  border: "1px solid #3b82f6",
                  backgroundColor:
                    activeTypeBrush === "SINGLE_CHOICE" ? "#3b82f6" : "white",
                  color:
                    activeTypeBrush === "SINGLE_CHOICE" ? "white" : "#3b82f6",
                }}
              >
                🔘 1 ĐA
              </button>
              <button
                className="cei-brush-btn"
                onClick={() =>
                  setActiveTypeBrush(
                    activeTypeBrush === "MULTIPLE_CHOICE"
                      ? ""
                      : "MULTIPLE_CHOICE",
                  )
                }
                style={{
                  border: "1px solid #8b5cf6",
                  backgroundColor:
                    activeTypeBrush === "MULTIPLE_CHOICE"
                      ? "#8b5cf6"
                      : "white",
                  color:
                    activeTypeBrush === "MULTIPLE_CHOICE"
                      ? "white"
                      : "#8b5cf6",
                }}
              >
                ☑️ Nhiều ĐA
              </button>
              <button
                className="cei-brush-btn"
                onClick={() =>
                  setActiveTypeBrush(
                    activeTypeBrush === "TRUE_FALSE" ? "" : "TRUE_FALSE",
                  )
                }
                style={{
                  border: "1px solid #14b8a6",
                  backgroundColor:
                    activeTypeBrush === "TRUE_FALSE" ? "#14b8a6" : "white",
                  color:
                    activeTypeBrush === "TRUE_FALSE" ? "white" : "#14b8a6",
                }}
              >
                ⚖️ Đ/S
              </button>
              <button
                className="cei-brush-btn"
                onClick={() =>
                  setActiveTypeBrush(
                    activeTypeBrush === "FILL_BLANK" ? "" : "FILL_BLANK",
                  )
                }
                style={{
                  border: "1px solid #f43f5e",
                  backgroundColor:
                    activeTypeBrush === "FILL_BLANK" ? "#f43f5e" : "white",
                  color:
                    activeTypeBrush === "FILL_BLANK" ? "white" : "#f43f5e",
                }}
              >
                ✍️ Điền
              </button>

              <select
                className="qcw-select-all"
                onChange={(e) => {
                  handleApplyAll("type", e.target.value);
                  e.target.value = "default";
                }}
                defaultValue="default"
              >
                <option value="default" disabled>
                  -- Quét tất cả thành... --
                </option>
                <option value="RANDOM">Tất cả Ngẫu nhiên</option>
                <option value="SINGLE_CHOICE">Tất cả 1 Đáp án</option>
                <option value="MULTIPLE_CHOICE">Tất cả Nhiều đáp án</option>
                <option value="TRUE_FALSE">Tất cả Đúng/Sai</option>
                <option value="FILL_BLANK">Tất cả Điền khuyết</option>
                <option value="">Tẩy tất cả (Trống)</option>
              </select>
            </div>
          </div>

          {/* Lưới câu hỏi */}
          <div className="cei-grid-container">
            {questionsConfig.map((q, index) => {
              const isBrushing = !!activeTypeBrush;
              const typeInfo = getTypeStyle(q.type);
              const isUnassignedType = !q.type || q.type === "";

              return (
                <button
                  key={index}
                  id={`config-btn-${q.id}`}
                  className="cei-grid-item"
                  onClick={() => (isBrushing ? handlePaintItem(index) : null)}
                  title={`Câu ${q.id} | ${typeInfo.label}`}
                  style={{
                    borderWidth: "2px",
                    borderStyle: isUnassignedType ? "dashed" : "solid",
                    borderColor: isUnassignedType ? "#d1d5db" : "#e5e7eb",
                    backgroundColor: isUnassignedType
                      ? "#f3f4f6"
                      : typeInfo.bg,
                    cursor: isBrushing ? "crosshair" : "default",
                    position: "relative",
                    transition: "all 0.3s ease",
                  }}
                  onMouseOver={(e) => {
                    if (isBrushing)
                      e.currentTarget.style.transform = "scale(1.1)";
                  }}
                  onMouseOut={(e) => {
                    if (isBrushing)
                      e.currentTarget.style.transform = "scale(1)";
                  }}
                >
                  <span style={{ fontSize: "0.85rem" }}>{typeInfo.icon}</span>
                  <span
                    style={{
                      fontWeight: isUnassignedType ? "normal" : "bold",
                      color: isUnassignedType ? "#9ca3af" : "inherit",
                    }}
                  >
                    {q.id}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Ma trận tổng kết */}
      {activeStep === "SUMMARY" && (
        <div className="qcw-summary-container">
          <h3 className="qcw-summary-title">
            <i className="fa-solid fa-clipboard-list"></i> Ma trận đề thi chi
            tiết
          </h3>
          <div className="qcw-matrix-list">
            {Object.entries(generateMatrixSummary()).map(([type, ids]) => {
              const typeInfo = getTypeStyle(type);

              return (
                <div
                  key={type}
                  className="cei-matrix-item"
                  style={{ borderLeft: `4px solid ${typeInfo.color}` }}
                >
                  <div className="qcw-matrix-header">
                    <strong
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <span style={{ color: typeInfo.color }}>
                        {typeInfo.icon} {typeInfo.label}
                      </span>
                    </strong>
                  </div>
                  <div className="qcw-matrix-badges">
                    <span className="qcw-matrix-badges-label">Các câu:</span>
                    {ids.map((id) => (
                      <span key={id} className="qcw-matrix-badge-item">
                        {id}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionConfigWizard;
