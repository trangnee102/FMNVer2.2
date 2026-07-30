// frontend/src/components/Cards/CreateExamInput.jsx
import React from "react";

const CreateExamInput = ({
  topic,
  setTopic,
  examType,
  setExamType,
  questionCount,
  setQuestionCount,
  easyCount,
  setEasyCount,
  medCount,
  setMedCount,
  hardCount,
  setHardCount,
  text,
  setText,
  fileInputRef,
  handleFileChange,
  customPrompt, // 👉 Đã nhận cấu hình prompt tùy biến
  setCustomPrompt,
  loading,
  handleGenerateExam,
  error,
}) => {
  // Tính tổng số lượng thực tế
  const currentTotal = Number(easyCount) + Number(medCount) + Number(hardCount);
  const isInvalidCount = currentTotal !== Number(questionCount);

  // Tính phần trăm hiển thị giao diện
  const easyPct =
    questionCount > 0 ? (Number(easyCount) / questionCount) * 100 : 0;
  const medPct =
    questionCount > 0 ? (Number(medCount) / questionCount) * 100 : 0;
  const hardPct =
    questionCount > 0 ? (Number(hardCount) / questionCount) * 100 : 0;

  return (
    <div
      style={{
        backgroundColor: "var(--bg-card)",
        padding: "30px",
        borderRadius: "16px",
        boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
        border: "1px solid var(--border)",
        marginBottom: "30px",
      }}
    >
      {error && <div className="exam-alert-error">{error}</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {/* TÊN ĐỀ THI */}
        <div>
          <label
            style={{
              display: "block",
              fontWeight: "bold",
              marginBottom: "8px",
              color: "var(--text-dark)",
            }}
          >
            Tên đề thi (*)
          </label>
          <input
            type="text"
            placeholder="Vd: Đề kiểm tra 15p Lịch Sử..."
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "8px",
              border: "2px solid var(--border)",
              outline: "none",
              fontSize: "1rem",
            }}
          />
        </div>

        {/* LOẠI CÂU & TỔNG SỐ LƯỢNG */}
        <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: "200px" }}>
            <label
              style={{
                display: "block",
                fontWeight: "bold",
                marginBottom: "8px",
                color: "var(--text-dark)",
              }}
            >
              Loại câu hỏi
            </label>
            <select
              value={examType}
              onChange={(e) => setExamType(e.target.value)}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "8px",
                border: "2px solid var(--border)",
                outline: "none",
              }}
            >
              <option value="MIX">🔀 Hỗn hợp (Mix các loại)</option>
              <option value="SINGLE">🔘 Trắc nghiệm 1 đáp án</option>
              <option value="MULTIPLE">☑️ Trắc nghiệm nhiều đáp án</option>
              <option value="TRUE_FALSE">⚖️ Đúng / Sai</option>
              <option value="FILL_BLANK">✍️ Điền khuyết</option>
            </select>
          </div>
          <div style={{ flex: 1, minWidth: "200px" }}>
            <label
              style={{
                display: "block",
                fontWeight: "bold",
                marginBottom: "8px",
                color: "var(--text-dark)",
              }}
            >
              Tổng số câu
            </label>
            <select
              value={questionCount}
              onChange={(e) => setQuestionCount(Number(e.target.value))}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "8px",
                border: "2px solid var(--border)",
                outline: "none",
              }}
            >
              <option value={10}>10 câu</option>
              <option value={20}>20 câu</option>
              <option value={30}>30 câu</option>
              <option value={50}>50 câu</option>
            </select>
          </div>
        </div>

        {/* KHU VỰC CẤU HÌNH SỐ LƯỢNG CỤ THỂ THEO ĐỘ KHÓ */}
        <div
          style={{
            padding: "20px",
            backgroundColor: "rgba(139, 92, 246, 0.05)",
            border: "1px dashed #8b5cf6",
            borderRadius: "12px",
          }}
        >
          <label
            style={{
              display: "block",
              fontWeight: "bold",
              marginBottom: "15px",
              color: "var(--text-dark)",
            }}
          >
            Phân bổ mức độ khó (Số lượng cụ thể)
          </label>
          <div style={{ display: "flex", gap: "15px", flexWrap: "wrap" }}>
            {/* CÂU DỄ */}
            <div style={{ flex: 1, minWidth: "100px" }}>
              <label
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.95rem",
                  color: "#10b981",
                  fontWeight: "bold",
                  marginBottom: "5px",
                }}
              >
                <span>Dễ</span>
                <span style={{ opacity: 0.7, fontSize: "0.85rem" }}>
                  {easyPct.toFixed(0)}%
                </span>
              </label>
              <input
                type="number"
                min="0"
                max={questionCount}
                value={easyCount}
                onChange={(e) => setEasyCount(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid var(--border)",
                  fontSize: "1.1rem",
                  textAlign: "center",
                  fontWeight: "bold",
                }}
              />
            </div>

            {/* CÂU VỪA */}
            <div style={{ flex: 1, minWidth: "100px" }}>
              <label
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.95rem",
                  color: "#f59e0b",
                  fontWeight: "bold",
                  marginBottom: "5px",
                }}
              >
                <span>Vừa</span>
                <span style={{ opacity: 0.7, fontSize: "0.85rem" }}>
                  {medPct.toFixed(0)}%
                </span>
              </label>
              <input
                type="number"
                min="0"
                max={questionCount}
                value={medCount}
                onChange={(e) => setMedCount(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid var(--border)",
                  fontSize: "1.1rem",
                  textAlign: "center",
                  fontWeight: "bold",
                }}
              />
            </div>

            {/* CÂU KHÓ */}
            <div style={{ flex: 1, minWidth: "100px" }}>
              <label
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.95rem",
                  color: "#ef4444",
                  fontWeight: "bold",
                  marginBottom: "5px",
                }}
              >
                <span>Khó</span>
                <span style={{ opacity: 0.7, fontSize: "0.85rem" }}>
                  {hardPct.toFixed(0)}%
                </span>
              </label>
              <input
                type="number"
                min="0"
                max={questionCount}
                value={hardCount}
                onChange={(e) => setHardCount(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid var(--border)",
                  fontSize: "1.1rem",
                  textAlign: "center",
                  fontWeight: "bold",
                }}
              />
            </div>
          </div>

          <div
            style={{
              marginTop: "20px",
              fontSize: "1rem",
              fontWeight: "bold",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ color: isInvalidCount ? "#ef4444" : "#10b981" }}>
              Đã phân bổ: {currentTotal} / {questionCount} câu
              {isInvalidCount && (
                <span
                  style={{
                    fontSize: "0.85rem",
                    marginLeft: "10px",
                    fontWeight: "normal",
                  }}
                >
                  (Cần điều chỉnh cho khớp)
                </span>
              )}
            </span>
            <div
              style={{
                flex: 1,
                height: "8px",
                backgroundColor: "#e5e7eb",
                borderRadius: "4px",
                marginLeft: "20px",
                display: "flex",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${easyPct}%`,
                  backgroundColor: "#10b981",
                  transition: "width 0.3s ease",
                }}
              ></div>
              <div
                style={{
                  width: `${medPct}%`,
                  backgroundColor: "#f59e0b",
                  transition: "width 0.3s ease",
                }}
              ></div>
              <div
                style={{
                  width: `${hardPct}%`,
                  backgroundColor: "#ef4444",
                  transition: "width 0.3s ease",
                }}
              ></div>
            </div>
          </div>
        </div>

        {/* Ô NHẬP YÊU CẦU CHO AI (CUSTOM PROMPT) */}
        <div>
          <label
            style={{
              display: "block",
              fontWeight: "bold",
              marginBottom: "8px",
              color: "var(--text-dark)",
            }}
          >
            <i
              className="fa-solid fa-wand-magic-sparkles"
              style={{ marginRight: "8px", color: "#8b5cf6" }}
            ></i>
            Yêu cầu thêm cho AI (Tùy chọn)
          </label>
          <textarea
            rows="2"
            placeholder="Vd: Chỉ tập trung hỏi vào giai đoạn 1960 - 1975, hỏi nhiều về các chiến dịch..."
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "8px",
              border: "2px solid var(--border)",
              outline: "none",
              resize: "vertical",
            }}
          ></textarea>
        </div>

        {/* UPLOAD FILE */}
        <div>
          <label
            style={{
              display: "block",
              fontWeight: "bold",
              marginBottom: "8px",
              color: "var(--text-dark)",
            }}
          >
            Tài liệu tham khảo (PDF, Word, Ảnh &lt; 5MB)
          </label>
          <input
            type="file"
            accept=".pdf, .doc, .docx, image/*"
            ref={fileInputRef}
            onChange={handleFileChange}
            style={{
              width: "100%",
              padding: "10px",
              border: "2px dashed #8b5cf6",
              borderRadius: "8px",
              backgroundColor: "rgba(139, 92, 246, 0.05)",
            }}
          />
        </div>

        {/* NHẬP TEXT */}
        <div>
          <label
            style={{
              display: "block",
              fontWeight: "bold",
              marginBottom: "8px",
              color: "var(--text-dark)",
            }}
          >
            Hoặc dán văn bản vào đây
          </label>
          <textarea
            rows="4"
            placeholder="Paste tài liệu của bạn vào đây..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "8px",
              border: "2px solid var(--border)",
              outline: "none",
              resize: "vertical",
            }}
          ></textarea>
        </div>

        {/* NÚT SUBMIT */}
        <button
          onClick={handleGenerateExam}
          disabled={loading || isInvalidCount}
          className="exam-btn-generate"
        >
          {loading ? (
            <>
              <div className="exam-spinner"></div> Đang nhờ AI vắt óc ra đề...
            </>
          ) : isInvalidCount ? (
            `⚠️ Vui lòng phân bổ đúng ${questionCount} câu`
          ) : (
            "Tiến hành tạo Đề Thi 🚀"
          )}
        </button>
      </div>
    </div>
  );
};

export default CreateExamInput;
