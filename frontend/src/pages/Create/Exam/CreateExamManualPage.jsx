// frontend/src/pages/CreateExamManualPage.jsx
import React, { useState } from "react";
// 👉 ĐÃ FIX: Sửa lại đường dẫn import api chuẩn xác (chỉ lùi 1 bậc) để cứu sập Vite
import api from "../../../services/api";
import "./CreateExamManualPage.css";

const CreateExamManualPage = ({ onNavigate }) => {
  const [examTitle, setExamTitle] = useState("");
  const [examDesc, setExamDesc] = useState("");

  const getInitialOptions = (type) => {
    if (type === "SINGLE_CHOICE" || type === "MULTIPLE_CHOICE") {
      return ["", "", "", ""];
    }
    if (type === "TRUE_FALSE") {
      return ["Đúng", "Sai"];
    }
    return [];
  };

  const getInitialCorrectAnswers = (type) => {
    if (type === "SINGLE_CHOICE" || type === "TRUE_FALSE") return [0];
    if (type === "MULTIPLE_CHOICE") return [];
    return [];
  };

  const [questions, setQuestions] = useState([
    {
      id: Date.now(),
      type: "SINGLE_CHOICE",
      difficulty: "MEDIUM",
      content: "",
      options: ["", "", "", ""],
      correctAnswers: [0],
      explanation: "",
    },
  ]);

  const [isSaving, setIsSaving] = useState(false);

  const handleAddQuestion = () => {
    setQuestions([
      ...questions,
      {
        id: Date.now(),
        type: "SINGLE_CHOICE",
        difficulty: "MEDIUM",
        content: "",
        options: ["", "", "", ""],
        correctAnswers: [0],
        explanation: "",
      },
    ]);
  };

  const handleRemoveQuestion = (id) => {
    if (questions.length === 1) {
      alert("Đề thi phải có ít nhất 1 câu hỏi!");
      return;
    }
    setQuestions(questions.filter((q) => q.id !== id));
  };

  const handleQuestionChange = (id, field, value) => {
    setQuestions(
      questions.map((q) => (q.id === id ? { ...q, [field]: value } : q)),
    );
  };

  const handleTypeChange = (id, newType) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === id) {
          return {
            ...q,
            type: newType,
            options: getInitialOptions(newType),
            correctAnswers: getInitialCorrectAnswers(newType),
          };
        }
        return q;
      }),
    );
  };

  const handleOptionTextChange = (id, optIndex, text) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === id) {
          const newOptions = [...q.options];
          newOptions[optIndex] = text;
          return { ...q, options: newOptions };
        }
        return q;
      }),
    );
  };

  const handleMarkCorrectAnswer = (id, val, type) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === id) {
          if (type === "SINGLE_CHOICE" || type === "TRUE_FALSE") {
            return { ...q, correctAnswers: [val] };
          }
          if (type === "MULTIPLE_CHOICE") {
            const newAns = q.correctAnswers.includes(val)
              ? q.correctAnswers.filter((ans) => ans !== val)
              : [...q.correctAnswers, val];
            return { ...q, correctAnswers: newAns };
          }
        }
        return q;
      }),
    );
  };

  const handleSaveExam = async () => {
    if (!examTitle.trim()) {
      alert("⚠️ LỖI: Vui lòng nhập Tên đề thi trước khi lưu!");
      return;
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];

      if (!q.content.trim()) {
        alert(`⚠️ LỖI Ở CÂU ${i + 1}: Bạn chưa nhập nội dung câu hỏi!`);
        return;
      }

      if (q.type === "FILL_BLANK") {
        const matches = [...q.content.matchAll(/\[(.*?)\]/g)];
        if (matches.length === 0) {
          alert(
            `🚨 CẢNH BÁO NGUY HIỂM Ở CÂU ${i + 1} 🚨\n\nBạn đang chọn dạng "Điền khuyết" nhưng lại quên đục lỗ đáp án!\n\nVui lòng bọc từ cần điền vào trong ngoặc vuông [...].\nVí dụ: Con [mèo] con.`,
          );
          return;
        }
      }

      if (q.type === "MULTIPLE_CHOICE" && q.correctAnswers.length === 0) {
        alert(
          `⚠️ LỖI Ở CÂU ${i + 1}: Dạng "Nhiều đáp án" yêu cầu bạn phải tích chọn ít nhất 1 đáp án đúng!`,
        );
        return;
      }
    }

    const finalQuestions = questions.map((q) => {
      if (q.type === "FILL_BLANK") {
        const matches = [...q.content.matchAll(/\[(.*?)\]/g)];
        const extractedAnswers = matches.map((m) => m[1]);
        return { ...q, correctAnswers: extractedAnswers };
      }
      return q;
    });

    setIsSaving(true);

    try {
      const payload = {
        name: examTitle.trim(),
        description: examDesc.trim(),
        isExam: true,
        cards: finalQuestions,
      };

      await api.post("/decks/bulk", payload);

      alert("✅ Lưu bộ đề thành công!");
      onNavigate("my-exams");
    } catch (error) {
      console.error("Lỗi khi lưu đề thi:", error);
      alert(
        "❌ Lỗi kết nối! Không thể lưu đề thi: " +
          (error.response?.data?.message || error.message),
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="manual-exam-container">
      <div className="manual-header">
        <button
          onClick={() => onNavigate("create-exam")}
          className="back-btn"
          disabled={isSaving}
        >
          <i className="fa-solid fa-arrow-left"></i> Quay lại
        </button>
        <h1 className="page-title">Tạo đề thi thủ công 📝</h1>
      </div>

      <div className="form-section">
        <div className="form-group">
          <label className="form-label">Tên đề thi (*)</label>
          <input
            type="text"
            className="form-input"
            placeholder="Vd: Đề kiểm tra 15p Lịch Sử..."
            value={examTitle}
            onChange={(e) => setExamTitle(e.target.value)}
            disabled={isSaving}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Mô tả (Tùy chọn)</label>
          <textarea
            className="form-textarea"
            rows="2"
            placeholder="Mô tả ngắn về bộ đề thi này..."
            value={examDesc}
            onChange={(e) => setExamDesc(e.target.value)}
            disabled={isSaving}
          />
        </div>
      </div>

      {questions.map((q, index) => (
        <div key={q.id} className="question-block">
          <div className="question-header">
            <h3 className="question-title">Câu hỏi {index + 1}</h3>
            <button
              className="delete-btn"
              onClick={() => handleRemoveQuestion(q.id)}
              disabled={isSaving}
            >
              <i className="fa-solid fa-trash"></i> Xóa câu này
            </button>
          </div>

          <div className="flex-row">
            <div className="form-group flex-1">
              <label className="form-label">Loại câu hỏi</label>
              <select
                className="form-select"
                value={q.type}
                onChange={(e) => handleTypeChange(q.id, e.target.value)}
                disabled={isSaving}
              >
                <option value="SINGLE_CHOICE">1 Đáp án</option>
                <option value="MULTIPLE_CHOICE">Nhiều đáp án</option>
                <option value="TRUE_FALSE">Đúng/Sai</option>
                <option value="FILL_BLANK">Điền khuyết</option>
              </select>
            </div>
            <div className="form-group flex-1">
              <label className="form-label">Độ khó</label>
              <select
                className="form-select"
                value={q.difficulty}
                onChange={(e) =>
                  handleQuestionChange(q.id, "difficulty", e.target.value)
                }
                disabled={isSaving}
              >
                <option value="EASY">Dễ</option>
                <option value="MEDIUM">Vừa</option>
                <option value="HARD">Khó</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              Nội dung câu hỏi
              {q.type === "FILL_BLANK" && (
                <span
                  style={{
                    color: "#3b82f6",
                    fontSize: "0.85rem",
                    marginLeft: "10px",
                    fontWeight: "normal",
                  }}
                >
                  (Tự động tạo chỗ điền)
                </span>
              )}
            </label>

            {q.type === "FILL_BLANK" && (
              <div
                style={{
                  marginBottom: "12px",
                  padding: "12px 16px",
                  backgroundColor: "#eff6ff",
                  border: "1px dashed #93c5fd",
                  borderRadius: "8px",
                  fontSize: "0.95rem",
                  color: "#1e40af",
                  lineHeight: "1.5",
                }}
              >
                💡 <b>Hướng dẫn đục lỗ:</b> Hãy gõ trọn vẹn câu, và bọc từ khóa
                cần sinh viên điền trong dấu ngoặc vuông <b>[...]</b>.<br />
                <i>
                  Ví dụ: Hôm nay trời <b>[nắng]</b>, tôi đi ra ngoài phơi{" "}
                  <b>[nắng]</b>.
                </i>
              </div>
            )}

            <textarea
              className="form-textarea"
              rows={q.type === "FILL_BLANK" ? "4" : "2"}
              placeholder={
                q.type === "FILL_BLANK"
                  ? "Nhập câu hỏi và dùng [...] để đánh dấu đáp án..."
                  : "Nhập nội dung câu hỏi vào đây..."
              }
              value={q.content}
              onChange={(e) =>
                handleQuestionChange(q.id, "content", e.target.value)
              }
              disabled={isSaving}
            />
          </div>

          {q.type !== "FILL_BLANK" && (
            <div className="form-group">
              <label className="form-label" style={{ color: "#3b82f6" }}>
                <i className="fa-solid fa-circle-check"></i> Thiết lập đáp án
                (Tích vào đáp án ĐÚNG)
              </label>

              {q.type === "SINGLE_CHOICE" && (
                <div className="options-list">
                  {q.options.map((opt, i) => (
                    <div key={i} className="option-row">
                      <input
                        type="radio"
                        name={`single-${q.id}`}
                        className="option-radio"
                        checked={q.correctAnswers.includes(i)}
                        onChange={() =>
                          handleMarkCorrectAnswer(q.id, i, "SINGLE_CHOICE")
                        }
                        disabled={isSaving}
                      />
                      <span style={{ fontWeight: "bold", color: "#6b7280" }}>
                        {String.fromCharCode(65 + i)}.
                      </span>
                      <input
                        type="text"
                        className="form-input"
                        placeholder={`Nhập nội dung lựa chọn ${String.fromCharCode(65 + i)}...`}
                        value={opt}
                        onChange={(e) =>
                          handleOptionTextChange(q.id, i, e.target.value)
                        }
                        disabled={isSaving}
                      />
                    </div>
                  ))}
                </div>
              )}

              {q.type === "MULTIPLE_CHOICE" && (
                <div className="options-list">
                  {q.options.map((opt, i) => (
                    <div key={i} className="option-row">
                      <input
                        type="checkbox"
                        className="option-checkbox"
                        checked={q.correctAnswers.includes(i)}
                        onChange={() =>
                          handleMarkCorrectAnswer(q.id, i, "MULTIPLE_CHOICE")
                        }
                        disabled={isSaving}
                      />
                      <span style={{ fontWeight: "bold", color: "#6b7280" }}>
                        {String.fromCharCode(65 + i)}.
                      </span>
                      <input
                        type="text"
                        className="form-input"
                        placeholder={`Nhập nội dung lựa chọn ${String.fromCharCode(65 + i)}...`}
                        value={opt}
                        onChange={(e) =>
                          handleOptionTextChange(q.id, i, e.target.value)
                        }
                        disabled={isSaving}
                      />
                    </div>
                  ))}
                </div>
              )}

              {q.type === "TRUE_FALSE" && (
                <div className="options-list flex-row" style={{ gap: "1rem" }}>
                  <label className="tf-label">
                    <input
                      type="radio"
                      name={`tf-${q.id}`}
                      className="option-radio"
                      checked={q.correctAnswers.includes(0)}
                      onChange={() =>
                        handleMarkCorrectAnswer(q.id, 0, "TRUE_FALSE")
                      }
                      disabled={isSaving}
                    />
                    ĐÚNG
                  </label>
                  <label className="tf-label">
                    <input
                      type="radio"
                      name={`tf-${q.id}`}
                      className="option-radio"
                      checked={q.correctAnswers.includes(1)}
                      onChange={() =>
                        handleMarkCorrectAnswer(q.id, 1, "TRUE_FALSE")
                      }
                      disabled={isSaving}
                    />
                    SAI
                  </label>
                </div>
              )}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Giải thích chi tiết (Tùy chọn)</label>
            <textarea
              className="form-textarea"
              rows="2"
              placeholder="Giải thích vì sao lại chọn đáp án này để sinh viên hiểu bài..."
              value={q.explanation}
              onChange={(e) =>
                handleQuestionChange(q.id, "explanation", e.target.value)
              }
              disabled={isSaving}
            />
          </div>
        </div>
      ))}

      <button
        className="add-q-btn"
        onClick={handleAddQuestion}
        disabled={isSaving}
      >
        <i className="fa-solid fa-plus"></i> Thêm câu hỏi mới
      </button>

      <button
        className="submit-btn"
        onClick={handleSaveExam}
        disabled={isSaving}
      >
        {isSaving ? (
          <>
            <i className="fa-solid fa-spinner fa-spin"></i> Đang lưu...
          </>
        ) : (
          <>
            <i className="fa-solid fa-floppy-disk"></i> Chốt Đề & Lưu Vào Kho
          </>
        )}
      </button>
    </div>
  );
};

export default CreateExamManualPage;