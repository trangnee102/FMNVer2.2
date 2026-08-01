// frontend/src/components/Cards/CreateExamPreview.jsx
import React, { useState, useRef, useEffect } from "react";
import api from "../../services/api";

const CreateExamPreview = ({
  generatedQuestions,
  setGeneratedQuestions,
  isSaving,
  handleSaveExam,
  targetCounts,
  originalText, // Nhận text từ Đợt 1
  originalFile, // Nhận file từ Đợt 1
}) => {
  const [editingIndex, setEditingIndex] = useState(null);
  const [editForm, setEditForm] = useState(null);

  // State cho phần nhờ AI sửa từng câu
  const [aiEditPrompt, setAiEditPrompt] = useState("");
  const [aiEditLoading, setAiEditLoading] = useState(false);
  const [aiEditError, setAiEditError] = useState("");

  const [isAdding, setIsAdding] = useState(false);

  // Các State quản lý Cấu hình cho Đợt bổ sung
  const [useOriginalDoc, setUseOriginalDoc] = useState(true);
  const [addEasy, setAddEasy] = useState(0);
  const [addMed, setAddMed] = useState(0);
  const [addHard, setAddHard] = useState(0);
  const [addCustomPrompt, setAddCustomPrompt] = useState("");

  const [addText, setAddText] = useState("");
  const [addFile, setAddFile] = useState(null);
  const addFileInputRef = useRef(null);

  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");

  const safeQuestions = generatedQuestions || [];
  const totalQ = safeQuestions.length;

  // --- THỐNG KÊ TỶ LỆ THỰC TẾ ĐỢT 1 ---
  const easyCount = safeQuestions.filter((q) => q.difficulty === "EASY").length;
  const medCount = safeQuestions.filter(
    (q) => q.difficulty === "MEDIUM",
  ).length;
  const hardCount = safeQuestions.filter((q) => q.difficulty === "HARD").length;

  const easyPct = Math.round((easyCount / totalQ) * 100) || 0;
  const medPct = Math.round((medCount / totalQ) * 100) || 0;
  const hardPct = Math.round((hardCount / totalQ) * 100) || 0;

  // --- TÍNH TOÁN SỐ CÂU THIẾU ---
  const missingEasy = Math.max(0, (targetCounts?.easy || 0) - easyCount);
  const missingMed = Math.max(0, (targetCounts?.med || 0) - medCount);
  const missingHard = Math.max(0, (targetCounts?.hard || 0) - hardCount);
  const missingTotal = missingEasy + missingMed + missingHard;

  useEffect(() => {
    setAddEasy(missingEasy);
    setAddMed(missingMed);
    setAddHard(missingHard);
  }, [missingEasy, missingMed, missingHard]);

  useEffect(() => {
    if (totalQ > 0 && missingTotal > 0 && !isAdding) {
      setIsAdding(true);
    }
  }, [missingTotal, totalQ, isAdding]);

  if (totalQ === 0) return null;

  const currentAddTotal = Number(addEasy) + Number(addMed) + Number(addHard);

  const handleEditClick = (index, q) => {
    setEditingIndex(index);
    setEditForm({ ...q, options: [...(q.options || [])] });
    setAiEditPrompt(""); // Reset form sửa AI
    setAiEditError("");
  };

  const handleSaveEdit = (index) => {
    const updated = [...generatedQuestions];
    updated[index] = editForm;
    setGeneratedQuestions(updated);
    setEditingIndex(null);
  };

  const handleDelete = (index) => {
    if (window.confirm("Cậu có chắc chắn muốn xóa câu hỏi này không?")) {
      const updated = generatedQuestions.filter((_, i) => i !== index);
      setGeneratedQuestions(updated);
    }
  };

  // 👉 TÍNH NĂNG MỚI 1: THÊM CÂU HỎI THỦ CÔNG
  const handleAddManual = () => {
    const newBlankQuestion = {
      question: "",
      question_type: "SINGLE_CHOICE",
      difficulty: "MEDIUM",
      category: "THEORY",
      options: ["A. ", "B. ", "C. ", "D. "],
      correct_answers: "",
      source_reference: "",
      explanation: "",
      keywords: "",
    };
    const updated = [...generatedQuestions, newBlankQuestion];
    setGeneratedQuestions(updated);

    // Tự động mở form chỉnh sửa cho câu vừa thêm
    setEditingIndex(updated.length - 1);
    setEditForm(newBlankQuestion);
  };

  // 👉 TÍNH NĂNG MỚI 2: NHỜ AI SỬA TỪNG CÂU
  const handleAiEditQuestion = async () => {
    if (!aiEditPrompt.trim()) {
      setAiEditError(
        "Vui lòng nhập yêu cầu sửa (VD: Đổi đáp án C, sửa lỗi chính tả...)",
      );
      return;
    }
    setAiEditLoading(true);
    setAiEditError("");
    try {
      const payload = {
        questionData: editForm,
        editPrompt: aiEditPrompt,
      };
      const res = await api.post("/ai/edit-exam-question", payload);

      if (res.data) {
        setEditForm(res.data); // Cập nhật luôn vào form đang hiển thị
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

  const handleAddMore = async () => {
    if (currentAddTotal === 0) {
      setAddError("Hãy chọn ít nhất 1 câu hỏi cần bổ sung!");
      return;
    }

    if (!useOriginalDoc && !addText.trim() && !addFile) {
      setAddError("Vui lòng cung cấp tài liệu mới để AI vắt óc!");
      return;
    }

    setAddLoading(true);
    setAddError("");

    try {
      const formData = new FormData();
      formData.append("topic", "Bổ sung câu hỏi");

      if (useOriginalDoc) {
        if (originalText?.trim()) formData.append("text", originalText.trim());
        if (originalFile) formData.append("file", originalFile);
      } else {
        if (addText.trim()) formData.append("text", addText.trim());
        if (addFile) formData.append("file", addFile);
      }

      // 👉 KẾT NỐI VỚI BACKEND CHỐNG TRÙNG LẶP: Gửi mảng câu cũ lên
      formData.append("existingQuestions", JSON.stringify(generatedQuestions));

      let rules = `
⚠️ LUẬT THÉP BỔ SUNG:
1. Tạo CHÍNH XÁC thêm ${currentAddTotal} câu hỏi.
2. KHÔNG ĐƯỢC BỊA ĐẶT KIẾN THỨC. Chỉ dựa vào tài liệu được cung cấp.
3. BẮT BUỘC TẠO ĐỘ KHÓ NHƯ SAU: ${addEasy > 0 ? `${addEasy} câu DỄ, ` : ""}${addMed > 0 ? `${addMed} câu VỪA, ` : ""}${addHard > 0 ? `${addHard} câu KHÓ.` : ""}
4. 🎓 DỮ LIỆU HỌC THUẬT: Mỗi câu hỏi BẮT BUỘC phải có thêm các trường: "source_reference" (trích dẫn), "explanation" (giải thích), và "keywords" (mảng từ khóa).
      `;

      const finalPrompt = `Số lượng cần tạo: ${currentAddTotal} câu. Yêu cầu thêm: ${addCustomPrompt}. \n\n${rules}`;
      formData.append("customPrompt", finalPrompt);

      const res = await api.post("/ai/generate-exam", formData);
      let newQuestions =
        res?.data ||
        res?.questions ||
        res?.result ||
        (Array.isArray(res) ? res : []);
      if (!Array.isArray(newQuestions)) newQuestions = [];

      if (newQuestions.length === 0) {
        setAddError(
          "AI không vắt thêm được câu nào từ dữ liệu. Cậu thử đổi tài liệu khác nhé!",
        );
      } else {
        setGeneratedQuestions([...generatedQuestions, ...newQuestions]);
        setIsAdding(false);
        setAddText("");
        setAddFile(null);
        setAddCustomPrompt("");
      }
    } catch (err) {
      setAddError(
        err.message || "Lỗi kết nối AI khi bổ sung. Thử lại sau nhé!",
      );
    } finally {
      setAddLoading(false);
    }
  };

  return (
    <div
      style={{
        backgroundColor: "var(--bg-card)",
        padding: "30px",
        borderRadius: "16px",
        border: "1px solid var(--border)",
        boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
        animation: "fadeIn 0.5s ease-in-out",
      }}
    >
      {/* HEADER & THỐNG KÊ THỰC TẾ */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
          flexWrap: "wrap",
          gap: "15px",
        }}
      >
        <h2 style={{ color: "var(--text-dark)", margin: 0 }}>
          Bản xem trước Đề thi ({totalQ} câu)
        </h2>

        <div
          style={{
            display: "flex",
            gap: "10px",
            fontSize: "0.9rem",
            fontWeight: "bold",
          }}
        >
          <span
            style={{
              padding: "5px 12px",
              backgroundColor: "rgba(16, 185, 129, 0.1)",
              color: "#10b981",
              borderRadius: "20px",
              border: "1px solid #10b981",
            }}
          >
            Dễ: {easyCount} ({easyPct}%)
          </span>
          <span
            style={{
              padding: "5px 12px",
              backgroundColor: "rgba(245, 158, 11, 0.1)",
              color: "#f59e0b",
              borderRadius: "20px",
              border: "1px solid #f59e0b",
            }}
          >
            Vừa: {medCount} ({medPct}%)
          </span>
          <span
            style={{
              padding: "5px 12px",
              backgroundColor: "rgba(239, 68, 68, 0.1)",
              color: "#ef4444",
              borderRadius: "20px",
              border: "1px solid #ef4444",
            }}
          >
            Khó: {hardCount} ({hardPct}%)
          </span>
        </div>
      </div>

      {/* DANH SÁCH CÂU HỎI */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "15px",
          marginBottom: "30px",
        }}
      >
        {generatedQuestions.map((q, index) => {
          const isEditing = editingIndex === index;

          return (
            <div
              key={index}
              style={{
                padding: "20px",
                border: isEditing
                  ? "2px solid #8b5cf6"
                  : "1px solid var(--border)",
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
                      Câu {index + 1} [{q.question_type} - {q.difficulty}]:
                    </div>
                    <div style={{ display: "flex", gap: "12px" }}>
                      <button
                        onClick={() => handleEditClick(index, q)}
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
                        onClick={() => handleDelete(index)}
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

                  {/* Hiển thị các trường học thuật từ AI */}
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
                          <i className="fa-solid fa-lightbulb"></i> Giải thích:
                        </span>
                        <span
                          style={{
                            color: "var(--text-dark)",
                            marginLeft: "8px",
                          }}
                        >
                          {q.explanation}
                        </span>
                      </div>
                    )}

                    {q.source_reference && (
                      <div>
                        <span style={{ color: "#f59e0b", fontWeight: "bold" }}>
                          <i className="fa-solid fa-book-open"></i> Nguồn tham
                          chiếu:
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
                        {q.keywords.split(",").map((kw, i) => (
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
                            {kw.trim()}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
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

                  {/* 👉 GIAO DIỆN MỚI: NHỜ AI SỬA */}
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
                      <i className="fa-solid fa-wand-magic-sparkles"></i> Nhờ AI
                      sửa nhanh câu này:
                    </div>
                    <div style={{ display: "flex", gap: "10px" }}>
                      <input
                        type="text"
                        placeholder="Vd: Đổi đáp án thành C và giải thích lại giúp tôi..."
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

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <span
                      style={{ fontWeight: "bold", color: "var(--text-dark)" }}
                    >
                      Đáp án đúng:
                    </span>
                    <input
                      type="text"
                      value={editForm.correct_answers}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          correct_answers: e.target.value,
                        })
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
                      <i className="fa-solid fa-graduation-cap"></i> Chỉnh sửa
                      Dữ liệu học thuật (Thủ công):
                    </div>

                    <input
                      type="text"
                      placeholder="Nguồn tham chiếu..."
                      value={editForm.source_reference || ""}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          source_reference: e.target.value,
                        })
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
                        setEditForm({
                          ...editForm,
                          explanation: e.target.value,
                        })
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
                      value={editForm.keywords || ""}
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
                      onClick={() => setEditingIndex(null)}
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
                      onClick={() => handleSaveEdit(index)}
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
        })}
      </div>

      {/* 👉 TÍNH NĂNG MỚI: NÚT THÊM THỦ CÔNG */}
      <div style={{ textAlign: "center", marginBottom: "30px" }}>
        <button
          onClick={handleAddManual}
          style={{
            padding: "10px 20px",
            backgroundColor: "transparent",
            color: "var(--text-dark)",
            border: "2px dashed var(--text-gray)",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "bold",
            transition: "all 0.2s",
          }}
          onMouseOver={(e) => (e.target.style.borderColor = "#8b5cf6")}
          onMouseOut={(e) => (e.target.style.borderColor = "var(--text-gray)")}
        >
          <i className="fa-solid fa-pen-nib"></i> Tự gõ thêm 1 câu hỏi
        </button>
      </div>

      {/* BẢNG HIỂN THỊ TRẠNG THÁI (ĐỦ HOẶC THIẾU) NGAY TRÊN Ô BỔ SUNG */}
      {missingTotal > 0 ? (
        <div
          style={{
            backgroundColor: "rgba(245, 158, 11, 0.1)",
            borderLeft: "4px solid #f59e0b",
            padding: "15px",
            borderRadius: "8px",
            marginBottom: "20px",
            color: "#b45309",
            animation: "fadeIn 0.3s",
          }}
        >
          <h4 style={{ margin: "0 0 5px 0" }}>
            <i className="fa-solid fa-shield-halved"></i> Kích hoạt Van An Toàn
            AI
          </h4>
          <p style={{ margin: "0 0 5px 0", fontSize: "0.95rem" }}>
            AI đã tự động dừng lại vì tài liệu không đủ dữ kiện. Đề thi đang
            thiếu {missingTotal} câu so với yêu cầu.
          </p>
        </div>
      ) : (
        <div
          style={{
            backgroundColor: "rgba(16, 185, 129, 0.1)",
            borderLeft: "4px solid #10b981",
            padding: "15px",
            borderRadius: "8px",
            marginBottom: "20px",
            color: "#065f46",
          }}
        >
          <p style={{ margin: 0, fontWeight: "bold" }}>
            <i className="fa-solid fa-circle-check"></i> Tuyệt vời! Bạn đang có{" "}
            {totalQ} câu hỏi chuẩn chỉ.
          </p>
        </div>
      )}

      {/* KHU VỰC BỔ SUNG CÂU HỎI */}
      <div
        style={{
          marginBottom: "30px",
          border: "1px dashed #8b5cf6",
          borderRadius: "12px",
          padding: "20px",
          backgroundColor: "rgba(139, 92, 246, 0.05)",
        }}
      >
        {!isAdding ? (
          <div style={{ textAlign: "center" }}>
            <p style={{ color: "var(--text-gray)", marginBottom: "15px" }}>
              Đề thi vẫn chưa đủ đô? Cậu có thể Bổ sung thêm câu hỏi nhé!
            </p>
            <button
              onClick={() => setIsAdding(true)}
              style={{
                padding: "10px 20px",
                backgroundColor: "#3b82f6",
                color: "white",
                borderRadius: "8px",
                border: "none",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              <i className="fa-solid fa-plus"></i> Bổ sung thêm câu hỏi bằng AI
            </button>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "15px",
              animation: "fadeIn 0.3s ease-in-out",
            }}
          >
            <h3 style={{ color: "#8b5cf6", margin: 0 }}>Bổ sung câu hỏi</h3>
            {addError && (
              <div
                style={{
                  color: "#ef4444",
                  fontSize: "0.9rem",
                  fontWeight: "bold",
                }}
              >
                {addError}
              </div>
            )}

            {/* CHỌN NGUỒN TÀI LIỆU */}
            <div>
              <label
                style={{
                  fontWeight: "bold",
                  display: "block",
                  marginBottom: "8px",
                  color: "var(--text-dark)",
                }}
              >
                Nguồn tài liệu:
              </label>
              <div style={{ display: "flex", gap: "20px" }}>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    cursor: "pointer",
                    color: "var(--text-dark)",
                  }}
                >
                  <input
                    type="radio"
                    checked={useOriginalDoc}
                    onChange={() => setUseOriginalDoc(true)}
                  />
                  Dùng lại tài liệu ban đầu
                </label>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    cursor: "pointer",
                    color: "var(--text-dark)",
                  }}
                >
                  <input
                    type="radio"
                    checked={!useOriginalDoc}
                    onChange={() => setUseOriginalDoc(false)}
                  />
                  Cung cấp tài liệu mới
                </label>
              </div>
            </div>

            {/* NHẬP TÀI LIỆU MỚI (NẾU CÓ) */}
            {!useOriginalDoc && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  padding: "15px",
                  backgroundColor: "var(--bg-main)",
                  borderRadius: "8px",
                  border: "1px solid var(--border)",
                }}
              >
                <input
                  type="file"
                  ref={addFileInputRef}
                  onChange={(e) => setAddFile(e.target.files[0])}
                />
                <textarea
                  rows="2"
                  placeholder="Hoặc dán thêm nội dung vào đây..."
                  value={addText}
                  onChange={(e) => setAddText(e.target.value)}
                  style={{
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                    outline: "none",
                  }}
                />
              </div>
            )}

            {/* CẤU HÌNH ĐỘ KHÓ ĐỢT 2 */}
            <div>
              <label
                style={{
                  fontWeight: "bold",
                  display: "block",
                  marginBottom: "8px",
                  color: "var(--text-dark)",
                }}
              >
                Phân bổ {currentAddTotal} câu hỏi:
              </label>
              <div style={{ display: "flex", gap: "15px", flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: "80px" }}>
                  <label
                    style={{
                      fontSize: "0.9rem",
                      color: "#10b981",
                      fontWeight: "bold",
                      display: "block",
                    }}
                  >
                    Dễ
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={addEasy}
                    onChange={(e) => setAddEasy(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px",
                      borderRadius: "6px",
                      border: "1px solid var(--border)",
                      textAlign: "center",
                      fontWeight: "bold",
                    }}
                  />
                </div>
                <div style={{ flex: 1, minWidth: "80px" }}>
                  <label
                    style={{
                      fontSize: "0.9rem",
                      color: "#f59e0b",
                      fontWeight: "bold",
                      display: "block",
                    }}
                  >
                    Vừa
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={addMed}
                    onChange={(e) => setAddMed(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px",
                      borderRadius: "6px",
                      border: "1px solid var(--border)",
                      textAlign: "center",
                      fontWeight: "bold",
                    }}
                  />
                </div>
                <div style={{ flex: 1, minWidth: "80px" }}>
                  <label
                    style={{
                      fontSize: "0.9rem",
                      color: "#ef4444",
                      fontWeight: "bold",
                      display: "block",
                    }}
                  >
                    Khó
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={addHard}
                    onChange={(e) => setAddHard(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px",
                      borderRadius: "6px",
                      border: "1px solid var(--border)",
                      textAlign: "center",
                      fontWeight: "bold",
                    }}
                  />
                </div>
              </div>
            </div>

            {/* YÊU CẦU CHO AI ĐỢT 2 */}
            <div>
              <label
                style={{
                  fontWeight: "bold",
                  display: "block",
                  marginBottom: "8px",
                  color: "var(--text-dark)",
                }}
              >
                Yêu cầu thêm (Tùy chọn):
              </label>
              <textarea
                rows="2"
                placeholder="Vd: Chỉ tạo câu hỏi về các con số..."
                value={addCustomPrompt}
                onChange={(e) => setAddCustomPrompt(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "8px",
                  border: "1px solid var(--border)",
                  outline: "none",
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
                onClick={() => setIsAdding(false)}
                disabled={addLoading}
                style={{
                  padding: "10px 15px",
                  backgroundColor: "var(--bg-main)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                Hủy
              </button>
              <button
                onClick={handleAddMore}
                disabled={addLoading || currentAddTotal === 0}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#3b82f6",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor:
                    addLoading || currentAddTotal === 0
                      ? "not-allowed"
                      : "pointer",
                  fontWeight: "bold",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                {addLoading ? (
                  <i className="fa-solid fa-spinner fa-spin"></i>
                ) : (
                  <i className="fa-solid fa-wand-magic-sparkles"></i>
                )}
                {addLoading ? "Đang vắt óc..." : "Tạo thêm ngay"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* NÚT LƯU ĐỀ THI VÀO KHO */}
      <button
        onClick={handleSaveExam}
        disabled={isSaving}
        style={{
          width: "100%",
          padding: "15px",
          backgroundColor: "#10b981",
          color: "white",
          borderRadius: "8px",
          border: "none",
          fontWeight: "bold",
          fontSize: "1.1rem",
          cursor: isSaving ? "not-allowed" : "pointer",
          boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
        }}
      >
        {isSaving ? "Đang lưu vào kho..." : "Chốt Đề & Lưu Vào Kho 💾"}
      </button>
    </div>
  );
};

export default CreateExamPreview;
