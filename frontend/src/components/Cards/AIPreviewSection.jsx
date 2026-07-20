// frontend/src/components/Cards/AIPreviewSection.jsx
import React, { useState } from "react";
import "katex/dist/katex.min.css";
import Latex from "react-latex-next";
import "./AIPreviewSection.css";

const AIPreviewSection = ({
  loading,
  generatedCards,
  setGeneratedCards,
  aiMessage,
  handleSaveCards,
  isSaving,
}) => {
  const [editingIndex, setEditingIndex] = useState(null);
  const [editFront, setEditFront] = useState("");
  const [editBack, setEditBack] = useState("");

  const [refinePrompt, setRefinePrompt] = useState("");
  const [isRefining, setIsRefining] = useState(false);

  const handleStartEdit = (idx, front, back) => {
    setEditingIndex(idx);
    setEditFront(front);
    setEditBack(back);
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditFront("");
    setEditBack("");
  };

  const handleSaveEdit = (idx) => {
    if (!editFront.trim() || !editBack.trim()) {
      alert("Nội dung thẻ không được để trống!");
      return;
    }
    const updatedCards = [...generatedCards];
    updatedCards[idx] = { front: editFront, back: editBack };
    setGeneratedCards(updatedCards);
    setEditingIndex(null);
  };

  const handleDeleteCard = (idx) => {
    if (window.confirm("Cậu có chắc chắn muốn xóa thẻ này không?")) {
      const updatedCards = generatedCards.filter((_, i) => i !== idx);
      setGeneratedCards(updatedCards);
    }
  };

  const handleRefineCards = async () => {
    if (!refinePrompt.trim()) {
      alert("Cậu hãy nhập yêu cầu sửa đổi (VD: Rút gọn đáp án) đã nhé!");
      return;
    }
    setIsRefining(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:5000/api/ai/refine", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentCards: generatedCards,
          refinePrompt: refinePrompt,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setGeneratedCards(data.data);
        setRefinePrompt("");
        alert("✨ AI: " + data.message);
      } else {
        alert("🚨 Lỗi: " + data.message);
      }
    } catch (error) {
      alert("🚨 Lỗi: Không thể kết nối đến Server AI để sửa thẻ!");
    } finally {
      setIsRefining(false);
    }
  };

  // 👉 BỘ DỊCH THUẬT SIÊU CẤP (Xử lý cả trường hợp Backend tự bọc $ hoặc chưa)
  const renderMath = (text) => {
    if (!text) return "";

    let processedText = text;

    // Khắc phục triệt để lỗi "rớt dòng" (AI tự ý biến \ thành \\)
    processedText = processedText.replace(/\\\\/g, "\\");

    return <Latex>{processedText}</Latex>;
  };

  return (
    <div className="ai-preview-section">
      <h3
        style={{
          marginTop: 0,
          marginBottom: "20px",
          color: "#334155",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          fontSize: "clamp(1.2rem, 1.5vw, 1.4rem)",
        }}
      >
        <i className="fa-solid fa-layer-group" style={{ color: "#6366f1" }}></i>{" "}
        Xem trước Bộ thẻ
      </h3>

      {!loading && generatedCards.length === 0 && (
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyItems: "center",
            marginTop: "10vh",
            color: "#94a3b8",
          }}
        >
          <i
            className="fa-solid fa-robot"
            style={{
              fontSize: "clamp(3rem, 5vw, 4rem)",
              marginBottom: "15px",
              opacity: 0.5,
            }}
          ></i>
          <p style={{ fontSize: "1.1rem" }}>Kết quả từ AI sẽ hiển thị ở đây</p>
        </div>
      )}

      {loading && (
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyItems: "center",
            marginTop: "10vh",
            color: "#6366f1",
          }}
        >
          <i
            className="fa-solid fa-brain fa-bounce"
            style={{ fontSize: "clamp(3rem, 5vw, 4rem)", marginBottom: "15px" }}
          ></i>
          <p style={{ fontWeight: "600", fontSize: "1.1rem" }}>
            AI đang đọc hiểu và trích xuất dữ liệu...
          </p>
        </div>
      )}

      {aiMessage && !loading && (
        <div className="ai-message-box">
          <i className="fa-solid fa-bell fa-shake"></i>
          {aiMessage}
        </div>
      )}

      {generatedCards.length > 0 && (
        <div className="preview-cards-container">
          <div className="ai-refine-container">
            <label className="ai-refine-label">
              <i className="fa-solid fa-wand-magic-sparkles"></i> AI Tự động
              tinh chỉnh thẻ
            </label>
            <div style={{ display: "flex", gap: "10px" }}>
              <input
                type="text"
                className="ai-textarea"
                placeholder="VD: Rút gọn đáp án dưới 10 chữ, dịch sang tiếng Anh..."
                style={{
                  height: "auto",
                  flex: 1,
                  borderColor: "#a5b4fc",
                  padding: "10px",
                }}
                value={refinePrompt}
                onChange={(e) => setRefinePrompt(e.target.value)}
                disabled={isRefining}
              />
              <button
                className="btn-edit-save"
                onClick={handleRefineCards}
                disabled={isRefining}
                style={{ whiteSpace: "nowrap" }}
              >
                {isRefining ? "Đang xào nấu..." : "Yêu cầu sửa"}
              </button>
            </div>
          </div>

          {generatedCards.map((card, idx) => (
            <div
              key={idx}
              className="generated-card"
              style={{ position: "relative" }}
            >
              {editingIndex === idx ? (
                <div className="edit-card-form">
                  <label>Mặt trước:</label>
                  <textarea
                    className="ai-textarea"
                    value={editFront}
                    onChange={(e) => setEditFront(e.target.value)}
                  />

                  <label>Mặt sau (Đáp án):</label>
                  <textarea
                    className="ai-textarea"
                    value={editBack}
                    onChange={(e) => setEditBack(e.target.value)}
                  />

                  <div
                    style={{
                      display: "flex",
                      gap: "10px",
                      justifyContent: "flex-end",
                    }}
                  >
                    <button
                      className="btn-edit-cancel"
                      onClick={handleCancelEdit}
                    >
                      Hủy
                    </button>
                    <button
                      className="btn-edit-save"
                      onClick={() => handleSaveEdit(idx)}
                    >
                      Lưu thay đổi
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="card-action-btns">
                    <button
                      className="btn-icon btn-edit"
                      onClick={() =>
                        handleStartEdit(idx, card.front, card.back)
                      }
                      title="Sửa thẻ này"
                    >
                      <i className="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button
                      className="btn-icon btn-delete"
                      onClick={() => handleDeleteCard(idx)}
                      title="Xóa thẻ này"
                    >
                      <i className="fa-solid fa-trash-can"></i>
                    </button>
                  </div>

                  <div className="card-side">
                    <strong>
                      <i className="fa-regular fa-face-smile"></i> Mặt trước
                      (Câu hỏi)
                    </strong>
                    <div className="math-preview-box format-text">
                      {renderMath(card.front)}
                    </div>
                  </div>

                  <hr
                    style={{
                      border: "none",
                      borderTop: "1px dashed #e2e8f0",
                      margin: "15px 0",
                    }}
                  />

                  <div className="card-side">
                    <strong>
                      <i className="fa-solid fa-bolt"></i> Mặt sau (Đáp án)
                    </strong>
                    <div className="math-preview-box back format-text">
                      {renderMath(card.back)}
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}

          <button
            className="generate-btn btn-save-deck"
            onClick={handleSaveCards}
            disabled={isSaving || generatedCards.length === 0}
          >
            {isSaving ? (
              <>
                <div className="loader"></div> Đang lưu thẻ vào Database...
              </>
            ) : (
              <>
                <i className="fa-solid fa-cloud-arrow-up"></i> Lưu bộ thẻ này
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default AIPreviewSection;
