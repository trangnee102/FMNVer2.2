// frontend/src/components/Cards/CreateExamPreview.jsx
import React, { useState } from "react";
import PreviewStats from "./PreviewStats";
import QuestionCard from "./QuestionCard";
import AddMoreMatrix from "./AddMoreMatrix";

const CreateExamPreview = ({
  generatedQuestions,
  setGeneratedQuestions,
  isSaving,
  handleSaveExam,
  targetCounts,
  originalText,
  originalFile,
}) => {
  const totalQ = generatedQuestions?.length || 0;

  // 👉 NÂNG CẤP UX: Quản lý trạng thái nút "Đã lưu"
  const [isSaved, setIsSaved] = useState(false);

  if (totalQ === 0) return null;

  const stats = {
    SINGLE: generatedQuestions.filter(
      (q) => q.question_type === "SINGLE_CHOICE",
    ).length,
    MULTIPLE: generatedQuestions.filter(
      (q) => q.question_type === "MULTIPLE_CHOICE",
    ).length,
    TRUE_FALSE: generatedQuestions.filter(
      (q) => q.question_type === "TRUE_FALSE",
    ).length,
    FILL_BLANK: generatedQuestions.filter(
      (q) => q.question_type === "FILL_BLANK",
    ).length,
    EASY: generatedQuestions.filter((q) => q.difficulty === "EASY").length,
    MEDIUM: generatedQuestions.filter((q) => q.difficulty === "MEDIUM").length,
    HARD: generatedQuestions.filter((q) => q.difficulty === "HARD").length,
  };

  const handleUpdate = (index, updatedQ) => {
    const newQs = [...generatedQuestions];
    newQs[index] = updatedQ;
    setGeneratedQuestions(newQs);
  };

  const handleDelete = (index) => {
    if (window.confirm("Cậu có chắc chắn muốn xóa câu hỏi này không?")) {
      setGeneratedQuestions((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const handleRemoveNew = (index) => {
    setGeneratedQuestions((prev) => prev.filter((_, i) => i !== index));
  };

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
      _isNew: true,
    };
    setGeneratedQuestions([...generatedQuestions, newBlankQuestion]);
  };

  const handleQuestionsAdded = (newQuestions) => {
    setGeneratedQuestions([...generatedQuestions, ...newQuestions]);
  };

  // 👉 Xử lý hiệu ứng Nút bấm khi lưu
  const onSaveClick = async () => {
    await handleSaveExam();
    setIsSaved(true);
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
      <PreviewStats totalQ={totalQ} stats={stats} />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "15px",
          marginBottom: "30px",
        }}
      >
        {generatedQuestions.map((q, index) => (
          <QuestionCard
            key={index}
            q={q}
            index={index}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            onRemoveNew={handleRemoveNew}
          />
        ))}
      </div>

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

      <AddMoreMatrix
        totalQ={totalQ}
        targetCounts={targetCounts}
        originalText={originalText}
        originalFile={originalFile}
        existingQuestions={generatedQuestions}
        onAdded={handleQuestionsAdded}
      />

      <button
        onClick={onSaveClick}
        disabled={isSaving || isSaved}
        style={{
          width: "100%",
          padding: "15px",
          backgroundColor: isSaved ? "#9ca3af" : "#10b981", // Chuyển màu xám khi đã lưu
          color: "white",
          borderRadius: "8px",
          border: "none",
          fontWeight: "bold",
          fontSize: "1.1rem",
          cursor: isSaving || isSaved ? "not-allowed" : "pointer",
          boxShadow: isSaved ? "none" : "0 4px 12px rgba(16, 185, 129, 0.3)",
          transition: "all 0.3s ease",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: "8px",
        }}
      >
        {isSaving ? (
          <>
            <i className="fa-solid fa-spinner fa-spin"></i> Đang lưu vào kho...
          </>
        ) : isSaved ? (
          <>
            <i className="fa-solid fa-check-circle"></i> Đã lưu thành công
          </>
        ) : (
          "Chốt Đề & Lưu Vào Kho 💾"
        )}
      </button>
    </div>
  );
};

export default CreateExamPreview;