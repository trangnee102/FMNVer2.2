// frontend/src/components/Cards/CreateExamInput.jsx
import React, { useState } from "react";
import "./CreateExamInput.css";
import ConfigProgressBars from "./ConfigProgressBars";
import QuestionConfigWizard from "./QuestionConfigWizard";

const CreateExamInput = ({
  topic,
  setTopic,
  existingExams = [],
  questionCount,
  setQuestionCount,
  questionsConfig,
  setQuestionsConfig,
  text,
  setText,
  fileInputRef,
  handleFileChange,
  customPrompt,
  setCustomPrompt,
  loading,
  handleGenerateExam,
  error,
}) => {
  const [topicMode, setTopicMode] = useState("NEW");

  // 👉 ĐÃ NÂNG CẤP: Quản lý Tab của Wizard tại File Cha
  const [activeWizardStep, setActiveWizardStep] = useState("TYPE");

  const handleCountChange = (e) => {
    let val = e.target.value;
    if (val.length > 1 && val.startsWith("0")) val = val.replace(/^0+/, "");
    setQuestionCount(Number(val));
  };

  const isInvalidCount =
    !questionCount || questionCount < 1 || questionCount > 50;

  const unassignedQuestions = questionsConfig
    .filter((q) => !q.type || q.type === "")
    .map((q) => q.id);

  const hasUnassignedConfig = unassignedQuestions.length > 0;

  const unassignedText =
    unassignedQuestions.length > 8
      ? unassignedQuestions.slice(0, 8).join(", ") + ", ..."
      : unassignedQuestions.join(", ");

  const handleAttemptSubmit = (e) => {
    e.preventDefault();

    if (loading || isInvalidCount) return;

    if (hasUnassignedConfig) {
      // 👉 Câu nào chưa gán Loại câu thì nhảy sang Tab "Chọn Loại Câu Hỏi"
      setActiveWizardStep("TYPE");

      // 👉 Cuộn màn hình và nháy đỏ (Vì DOM không bị xóa khi đổi Tab nên cuộn luôn vẫn mượt)
      const firstUnassignedId = unassignedQuestions[0];
      const targetElement = document.getElementById(
        `config-btn-${firstUnassignedId}`,
      );

      if (targetElement) {
        targetElement.scrollIntoView({ behavior: "smooth", block: "center" });
      }

      unassignedQuestions.forEach((id) => {
        const el = document.getElementById(`config-btn-${id}`);
        if (el) {
          el.classList.add("error-flash-animation");
          setTimeout(() => {
            el.classList.remove("error-flash-animation");
          }, 1500);
        }
      });

      return;
    }

    handleGenerateExam();
  };

  return (
    <div className="cei-container">
      {error && <div className="exam-alert-error">{error}</div>}

      <div className="cei-flex-col">
        {/* KHU VỰC 1: TÊN ĐỀ THI & TỔNG SỐ CÂU */}
        <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
          <div style={{ flex: 2, minWidth: "250px" }}>
            <label
              className="cei-form-label"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>Tên đề thi (*)</span>
              {existingExams.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    fontSize: "0.85rem",
                    fontWeight: "normal",
                  }}
                >
                  <label
                    style={{
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <input
                      type="radio"
                      checked={topicMode === "NEW"}
                      onChange={() => {
                        setTopicMode("NEW");
                        setTopic("");
                      }}
                    />{" "}
                    Tạo mới
                  </label>
                  <label
                    style={{
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      color: "#8b5cf6",
                      fontWeight: "bold",
                    }}
                  >
                    <input
                      type="radio"
                      checked={topicMode === "EXISTING"}
                      onChange={() => {
                        setTopicMode("EXISTING");
                        setTopic(existingExams[0] || "");
                      }}
                    />{" "}
                    Gộp vào đề cũ
                  </label>
                </div>
              )}
            </label>

            {topicMode === "NEW" ? (
              <input
                type="text"
                className="cei-input"
                placeholder="Vd: Đề kiểm tra 15p Lịch Sử..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            ) : (
              <select
                className="cei-input cei-input-highlight"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              >
                {existingExams.map((examName, idx) => (
                  <option key={idx} value={examName}>
                    {examName}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div style={{ flex: 1, minWidth: "150px" }}>
            <label className="cei-form-label">Tổng số câu (1-50)</label>
            <input
              type="number"
              min="1"
              max="50"
              className="cei-input cei-input-highlight"
              placeholder="VD: 15"
              value={questionCount === 0 ? "" : questionCount}
              onChange={handleCountChange}
            />
          </div>
        </div>

        {/* KHU VỰC 2: TIẾN TRÌNH % */}
        <ConfigProgressBars questionsConfig={questionsConfig} />

        {/* KHU VỰC 3: WIZARD CỌ VẼ */}
        <QuestionConfigWizard
          questionsConfig={questionsConfig}
          setQuestionsConfig={setQuestionsConfig}
          activeStep={activeWizardStep} /* 👉 TRUYỀN STATE XUỐNG CHO CON */
          setActiveStep={setActiveWizardStep} /* 👉 TRUYỀN HÀM XUỐNG CHO CON */
        />

        {/* KHU VỰC 4: TÀI LIỆU & YÊU CẦU CHO AI */}
        <div>
          <label className="cei-form-label">
            <i
              className="fa-solid fa-wand-magic-sparkles"
              style={{ color: "#8b5cf6", marginRight: "5px" }}
            ></i>{" "}
            Yêu cầu thêm cho AI (Tùy chọn)
          </label>
          <textarea
            className="cei-input"
            rows="2"
            placeholder="Vd: Chỉ tập trung hỏi vào giai đoạn 1960 - 1975..."
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            style={{ resize: "vertical" }}
          ></textarea>
        </div>

        <div>
          <label className="cei-form-label">
            Tài liệu tham khảo (PDF, Word, Ảnh &lt; 5MB)
          </label>
          <input
            type="file"
            accept=".pdf, .doc, .docx, image/*"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="cei-input"
            style={{
              borderStyle: "dashed",
              borderColor: "#8b5cf6",
              backgroundColor: "rgba(139, 92, 246, 0.05)",
            }}
          />
        </div>

        <div>
          <label className="cei-form-label">Hoặc dán văn bản vào đây</label>
          <textarea
            className="cei-input"
            rows="4"
            placeholder="Paste tài liệu của bạn vào đây..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            style={{ resize: "vertical" }}
          ></textarea>
        </div>

        {/* NÚT SUBMIT */}
        <button
          onClick={handleAttemptSubmit}
          className="exam-btn-generate"
          style={{
            opacity: loading || isInvalidCount || hasUnassignedConfig ? 0.6 : 1,
            cursor: loading || isInvalidCount ? "not-allowed" : "pointer",
            backgroundColor: hasUnassignedConfig ? "#d1d5db" : "var(--primary)",
            color: hasUnassignedConfig ? "#4b5563" : "white",
            transition: "all 0.3s ease",
          }}
        >
          {loading ? (
            <>
              <div className="exam-spinner"></div> Hệ thống đang khởi tạo đề thi
              AI...
            </>
          ) : isInvalidCount ? (
            `⚠️ Vui lòng nhập số lượng từ 1 - 50`
          ) : hasUnassignedConfig ? (
            `⚠️ Vui lòng cấu hình cho (các) câu: ${unassignedText}`
          ) : (
            `Tạo Đề Thi (${questionCount} câu) 🚀`
          )}
        </button>
      </div>
    </div>
  );
};

export default CreateExamInput;