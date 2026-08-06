// frontend/src/components/Cards/QuestionCard.jsx
import React, { useState } from "react";
import api from "../../services/api";

const QuestionCard = ({ q, index, onUpdate, onDelete, onRemoveNew }) => {
  // Nếu là câu hỏi mới tự gõ, bật sẵn chế độ Edit
  const [isEditing, setIsEditing] = useState(q._isNew || false);
  const [editForm, setEditForm] = useState(q);

  const [aiEditPrompt, setAiEditPrompt] = useState("");
  const [aiEditLoading, setAiEditLoading] = useState(false);
  const [aiEditError, setAiEditError] = useState("");

  const handleSave = () => {
    const updatedQ = { ...editForm };
    delete updatedQ._isNew; // Xóa cờ đánh dấu câu mới
    onUpdate(index, updatedQ);
    setIsEditing(false);
  };

  const handleCancel = () => {
    if (q._isNew) {
      onRemoveNew(index); // Xóa luôn nếu hủy câu đang tự gõ mới
    } else {
      setEditForm(q); // Phục hồi dữ liệu cũ
      setIsEditing(false);
      setAiEditPrompt("");
      setAiEditError("");
    }
  };

  const handleAiEditQuestion = async () => {
    if (!aiEditPrompt.trim()) {
      setAiEditError("Vui lòng nhập yêu cầu sửa (VD: Đổi đáp án C...)");
      return;
    }
    setAiEditLoading(true);
    setAiEditError("");
    try {
      const payload = { questionData: editForm, editPrompt: aiEditPrompt };
      const res = await api.post("/ai/edit-exam-question", payload);
      if (res.data) {
        setEditForm(res.data);
        setAiEditPrompt("");
        alert(
          "✨ AI đã sửa xong! Cậu kiểm tra lại rồi bấm 'Lưu thay đổi' nhé!",
        );
      }
    } catch (error) {
      setAiEditError(error.message || "Có lỗi khi gọi AI. Cậu thử lại nhé!");
    } finally {
      setAiEditLoading(false);
    }
  };

  return (
    <div
      style={{
        padding: "20px",
        border: isEditing ? "2px solid #8b5cf6" : "1px solid var(--border)",
        borderRadius: "12px",
        backgroundColor: "var(--bg-main)",
        transition: "all 0.2s",
      }}
    >
      {!isEditing ? (
        <>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: "12px",
            }}
          >
            <div
              style={{
                fontWeight: "bold",
                color: "#8b5cf6",
                fontSize: "1.1rem",
              }}
            >
              Câu {index + 1} [{q.question_type}]:
            </div>
            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={() => setIsEditing(true)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#3b82f6",
                  cursor: "pointer",
                  fontSize: "1.1rem",
                }}
                title="Sửa câu này"
              >
                <i className="fa-solid fa-pen-to-square"></i>
              </button>
              <button
                onClick={() => onDelete(index)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#ef4444",
                  cursor: "pointer",
                  fontSize: "1.1rem",
                }}
                title="Xóa câu này"
              >
                <i className="fa-solid fa-trash-can"></i>
              </button>
            </div>
          </div>

          {q.groundingSuspicious && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px 10px",
                marginBottom: "10px",
                borderRadius: "999px",
                background: "rgba(245, 158, 11, 0.12)",
                color: "#b45309",
                fontSize: "0.82rem",
                fontWeight: "700",
              }}
              title="Trích dẫn của câu này không khớp rõ với tài liệu gốc — có thể AI đã bịa, hãy kiểm tra lại kỹ trước khi lưu."
            >
              <i className="fa-solid fa-triangle-exclamation"></i>
              Nghi ngờ chưa bám sát tài liệu gốc
            </div>
          )}


          <div
            style={{
              marginBottom: "15px",
              color: "var(--text-dark)",
              whiteSpace: "pre-wrap",
              fontWeight: "600",
              fontSize: "1.1rem",
            }}
          >
            {q.question}
          </div>

          {q.options && q.options.length > 0 && (
            <div
              style={{
                marginLeft: "15px",
                marginBottom: "15px",
                color: "var(--text-gray)",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
              }}
            >
              {q.options.map((opt, i) => (
                <div key={i}>{opt}</div>
              ))}
            </div>
          )}

          <div
            style={{
              color: "#10b981",
              fontWeight: "bold",
              padding: "10px",
              backgroundColor: "rgba(16, 185, 129, 0.1)",
              borderRadius: "6px",
              display: "inline-block",
              marginBottom: "15px",
            }}
          >
            Đáp án đúng: {q.correct_answers}
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              paddingTop: "12px",
              borderTop: "1px dashed var(--border)",
              fontSize: "0.95rem",
            }}
          >
            {q.explanation && (
              <div>
                <span style={{ color: "#8b5cf6", fontWeight: "bold" }}>
                  <i className="fa-solid fa-lightbulb"></i> Giải thích:{" "}
                </span>
                <span style={{ color: "var(--text-dark)", marginLeft: "8px" }}>
                  {q.explanation}
                </span>
              </div>
            )}
            {q.source_reference && (
              <div>
                <span style={{ color: "#f59e0b", fontWeight: "bold" }}>
                  <i className="fa-solid fa-book-open"></i> Trích dẫn:{" "}
                </span>
                <span
                  style={{
                    color: "var(--text-gray)",
                    marginLeft: "8px",
                    fontStyle: "italic",
                  }}
                >
                  "{q.source_reference}"
                </span>
              </div>
            )}
            {q.keywords && (
              <div style={{ marginTop: "5px" }}>
                {(Array.isArray(q.keywords)
                  ? q.keywords
                  : String(q.keywords || "").split(",")
                ).map((kw, i) => (
                  <span
                    key={i}
                    style={{
                      display: "inline-block",
                      padding: "3px 8px",
                      backgroundColor: "var(--border)",
                      color: "var(--text-dark)",
                      borderRadius: "12px",
                      fontSize: "0.8rem",
                      marginRight: "6px",
                      fontWeight: "600",
                    }}
                  >
                    <i
                      className="fa-solid fa-hashtag"
                      style={{ color: "#8b5cf6", marginRight: "3px" }}
                    ></i>
                    {typeof kw === "string" ? kw.trim() : kw}
                  </span>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div
            style={{
              fontWeight: "bold",
              color: "#8b5cf6",
              fontSize: "1.1rem",
              marginBottom: "5px",
            }}
          >
            <i className="fa-solid fa-pen"></i> Đang sửa Câu {index + 1}
          </div>

          <div
            style={{
              marginBottom: "10px",
              padding: "12px",
              backgroundColor: "rgba(59, 130, 246, 0.05)",
              borderRadius: "8px",
              border: "1px dashed #3b82f6",
            }}
          >
            <div
              style={{
                fontWeight: "bold",
                fontSize: "0.95rem",
                color: "#3b82f6",
                marginBottom: "8px",
              }}
            >
              <i className="fa-solid fa-wand-magic-sparkles"></i> Nhờ AI sửa
              nhanh câu này:
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <input
                type="text"
                placeholder="Vd: Đổi đáp án thành C và giải thích lại..."
                value={aiEditPrompt}
                onChange={(e) => setAiEditPrompt(e.target.value)}
                style={{
                  flex: 1,
                  padding: "8px",
                  borderRadius: "6px",
                  border: "1px solid var(--border)",
                  outline: "none",
                }}
              />
              <button
                onClick={handleAiEditQuestion}
                disabled={aiEditLoading}
                style={{
                  padding: "8px 15px",
                  backgroundColor: "#3b82f6",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: aiEditLoading ? "not-allowed" : "pointer",
                  fontWeight: "bold",
                }}
              >
                {aiEditLoading ? (
                  <i className="fa-solid fa-spinner fa-spin"></i>
                ) : (
                  "AI Sửa"
                )}
              </button>
            </div>
            {aiEditError && (
              <div
                style={{
                  color: "#ef4444",
                  fontSize: "0.85rem",
                  marginTop: "5px",
                  fontWeight: "bold",
                }}
              >
                {aiEditError}
              </div>
            )}
          </div>

          <textarea
            rows="2"
            value={editForm.question}
            onChange={(e) =>
              setEditForm({ ...editForm, question: e.target.value })
            }
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: "6px",
              border: "1px solid var(--border)",
              outline: "none",
            }}
            placeholder="Nội dung câu hỏi..."
          />

          {editForm.options &&
            editForm.options.map((opt, i) => (
              <input
                key={i}
                type="text"
                value={opt}
                onChange={(e) => {
                  const newOpts = [...editForm.options];
                  newOpts[i] = e.target.value;
                  setEditForm({ ...editForm, options: newOpts });
                }}
                style={{
                  width: "100%",
                  padding: "8px",
                  borderRadius: "6px",
                  border: "1px solid var(--border)",
                  outline: "none",
                }}
              />
            ))}

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontWeight: "bold", color: "var(--text-dark)" }}>
              Đáp án đúng:
            </span>
            <input
              type="text"
              value={editForm.correct_answers}
              onChange={(e) =>
                setEditForm({ ...editForm, correct_answers: e.target.value })
              }
              style={{
                flex: 1,
                padding: "8px",
                borderRadius: "6px",
                border: "1px solid var(--border)",
                outline: "none",
              }}
              placeholder="VD: A hoặc A,C"
            />
          </div>

          <div
            style={{
              marginTop: "10px",
              padding: "15px",
              backgroundColor: "rgba(139, 92, 246, 0.05)",
              borderRadius: "8px",
              border: "1px dashed #8b5cf6",
            }}
          >
            <div
              style={{
                fontWeight: "bold",
                fontSize: "0.95rem",
                color: "#8b5cf6",
                marginBottom: "10px",
              }}
            >
              <i className="fa-solid fa-graduation-cap"></i> Chỉnh sửa Dữ liệu
              học thuật (Thủ công):
            </div>
            <input
              type="text"
              placeholder="Nguồn tham chiếu..."
              value={editForm.source_reference || ""}
              onChange={(e) =>
                setEditForm({ ...editForm, source_reference: e.target.value })
              }
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: "6px",
                border: "1px solid var(--border)",
                marginBottom: "8px",
                fontSize: "0.9rem",
              }}
            />
            <textarea
              rows="2"
              placeholder="Giải thích chi tiết..."
              value={editForm.explanation || ""}
              onChange={(e) =>
                setEditForm({ ...editForm, explanation: e.target.value })
              }
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: "6px",
                border: "1px solid var(--border)",
                marginBottom: "8px",
                fontSize: "0.9rem",
                resize: "vertical",
              }}
            />
            <input
              type="text"
              placeholder="Từ khóa (cách nhau bằng dấu phẩy)..."
              value={
                Array.isArray(editForm.keywords)
                  ? editForm.keywords.join(", ")
                  : editForm.keywords || ""
              }
              onChange={(e) =>
                setEditForm({ ...editForm, keywords: e.target.value })
              }
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: "6px",
                border: "1px solid var(--border)",
                fontSize: "0.9rem",
              }}
            />
          </div>

          <div
            style={{
              display: "flex",
              gap: "10px",
              justifyContent: "flex-end",
              marginTop: "10px",
            }}
          >
            <button
              onClick={handleCancel}
              style={{
                padding: "8px 15px",
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              Hủy
            </button>
            <button
              onClick={handleSave}
              style={{
                padding: "8px 15px",
                backgroundColor: "#10b981",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              Lưu thay đổi
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionCard;