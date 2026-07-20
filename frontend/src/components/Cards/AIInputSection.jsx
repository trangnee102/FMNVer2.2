// frontend/src/components/Cards/AIInputSection.jsx
import React from "react";

const AIInputSection = ({
  topic,
  setTopic,
  isNewTopic,
  setIsNewTopic,
  existingDecks,
  text,
  setText,
  file,
  fileInputRef,
  handleFileChange,
  customPrompt,
  setCustomPrompt,
  error,
  loading,
  handleGenerateAI,
}) => {
  return (
    <div className="ai-input-section">
      <div style={{ marginBottom: "20px" }}>
        <label className="input-label">Lưu vào bộ thẻ</label>

        {!isNewTopic ? (
          <select
            className="ai-textarea"
            style={{
              height: "auto",
              cursor: "pointer",
              backgroundColor: "#f8fafc",
            }}
            value={topic}
            onChange={(e) => {
              if (e.target.value === "CREATE_NEW") {
                setIsNewTopic(true);
                setTopic("");
              } else {
                setTopic(e.target.value);
              }
            }}
          >
            <option value="" disabled>
              -- Chọn bộ thẻ của bạn --
            </option>
            <optgroup label="📚 Bộ thẻ hiện có">
              {existingDecks.map((deck) => (
                <option
                  key={deck.id || deck.deck_id}
                  value={deck.title || deck.name}
                >
                  {deck.title || deck.name}
                </option>
              ))}
            </optgroup>
            <option
              value="CREATE_NEW"
              style={{ fontWeight: "bold", color: "#6366f1" }}
            >
              ➕ Tạo bộ thẻ mới...
            </option>
          </select>
        ) : (
          <div style={{ display: "flex", gap: "10px" }}>
            <input
              type="text"
              className="ai-textarea"
              placeholder="Nhập tên bộ thẻ mới..."
              style={{ height: "auto", flex: 1, borderColor: "#6366f1" }}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              autoFocus
            />
            <button
              type="button"
              className="btn-edit-cancel"
              onClick={() => {
                setIsNewTopic(false);
                setTopic("");
              }}
            >
              Hủy
            </button>
          </div>
        )}
      </div>

      <div style={{ marginBottom: "20px" }}>
        <label className="input-label">
          Tài liệu tham khảo (PDF, Word, Ảnh &lt; 5MB)
        </label>
        <div
          className={`file-upload-zone ${file ? "file-selected" : ""}`}
          onClick={() => fileInputRef.current.click()}
        >
          <input
            type="file"
            className="file-input"
            ref={fileInputRef}
            accept=".pdf, .doc, .docx, .png, .jpg, .jpeg"
            onChange={handleFileChange}
          />
          <i
            className="fa-solid fa-cloud-arrow-up"
            style={{
              fontSize: "2rem",
              color: file ? "#10b981" : "#94a3b8",
              marginBottom: "10px",
            }}
          ></i>
          {file ? (
            <p>
              Đã chọn file: <strong>{file.name}</strong>
            </p>
          ) : (
            <p>Bấm vào đây để tải file PDF, Word hoặc Ảnh lên</p>
          )}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          marginBottom: "20px",
        }}
      >
        <label className="input-label">Hoặc dán trực tiếp văn bản</label>
        <textarea
          className="ai-textarea"
          style={{ minHeight: "150px" }}
          placeholder="Dán nội dung vào đây..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        ></textarea>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          marginBottom: "20px",
        }}
      >
        <label className="input-label">
          Yêu cầu đặc biệt cho AI (Tùy chọn)
        </label>
        <textarea
          className="ai-textarea"
          style={{ minHeight: "80px", borderColor: "#10b981" }}
          placeholder="VD: Tạo đúng 10 thẻ, thiết kế dạng trắc nghiệm, tập trung vào công thức Toán..."
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
        ></textarea>
      </div>

      {error && (
        <div
          style={{ color: "#ef4444", marginBottom: "15px", fontWeight: "500" }}
        >
          🚨 {error}
        </div>
      )}

      <button
        className="generate-btn"
        onClick={handleGenerateAI}
        disabled={loading}
      >
        {loading ? (
          <>
            <div className="loader"></div> Đang phân tích...
          </>
        ) : (
          <>
            <i className="fa-solid fa-wand-magic-sparkles"></i> Tạo Flashcard
            ngay
          </>
        )}
      </button>
    </div>
  );
};

export default AIInputSection;
