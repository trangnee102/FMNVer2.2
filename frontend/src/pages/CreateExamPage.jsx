import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Layout/Sidebar";
import api, { aiAPI } from "../services/api";
import CreateExamInput from "../components/Cards/CreateExamInput";
import CreateExamPreview from "../components/Cards/CreateExamPreview";
import CreateOptionCard from "../components/Cards/CreateOptionCard";
import "./Dashboard/DashboardPage.css";
import "./Create/Exam/CreateExam.css";
import "./Create/Flashcard/CreateCardPage.css";

const CreateExamPage = ({ onNavigate }) => {
  const navigate = useNavigate();
  const [mode, setMode] = useState("menu");

  const [topic, setTopic] = useState("");
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const fileInputRef = useRef(null);
  const [customPrompt, setCustomPrompt] = useState("");

  const [questionCount, setQuestionCount] = useState(5);
  const [questionsConfig, setQuestionsConfig] = useState([]);

  const [existingExams, setExistingExams] = useState([]);

  const [loading, setLoading] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState([]);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const previewRef = useRef(null);

  useEffect(() => {
    if (mode !== "ai") return;
    const fetchExistingExams = async () => {
      try {
        const res = await api.get("/decks");
        let decksArray = [];
        if (Array.isArray(res.data)) decksArray = res.data;
        else if (res.data?.data && Array.isArray(res.data.data)) decksArray = res.data.data;
        else if (res.data?.decks && Array.isArray(res.data.decks)) decksArray = res.data.decks;

        if (decksArray.length > 0) {
          const examTitles = decksArray
            .filter((deck) => deck.is_exam === true)
            .map((deck) => deck.title)
            .filter(Boolean);

          setExistingExams([...new Set(examTitles)]);
        }
      } catch (err) {}
    };
    fetchExistingExams();
  }, [mode]);

  useEffect(() => {
    const validCount = Math.min(Math.max(1, questionCount || 1), 50);

    setQuestionsConfig((prev) => {
      if (validCount > prev.length) {
        const newItems = Array.from(
          { length: validCount - prev.length },
          (_, i) => ({
            id: prev.length + i + 1,
            type: "",
            difficulty: "",
          }),
        );
        return [...prev, ...newItems];
      }
      if (validCount < prev.length) {
        return prev.slice(0, validCount);
      }
      return prev;
    });
  }, [questionCount]);

  const totalQuestions = questionsConfig.length;
  const totalEasy = questionsConfig.filter((q) => q.difficulty === "EASY").length;
  const totalMed = questionsConfig.filter((q) => q.difficulty === "MEDIUM").length;
  const totalHard = questionsConfig.filter((q) => q.difficulty === "HARD").length;

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.size > 5 * 1024 * 1024) {
        setError("File quá nặng! Vui lòng chọn file dưới 5MB.");
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setError("");
    }
  };

  const handleGenerateExam = async () => {
    if (!topic.trim()) {
      setError("Vui lòng nhập Tên đề thi!");
      return;
    }
    if (!text.trim() && !file) {
      setError("Vui lòng nhập văn bản hoặc tải tài liệu lên!");
      return;
    }
    if (totalQuestions === 0) {
      setError("Vui lòng nhập số lượng câu hỏi hợp lệ (1-50)!");
      return;
    }
    if (totalQuestions > 50) {
      setError("Để đảm bảo chất lượng, AI chỉ hỗ trợ tạo tối đa 50 câu/lần.");
      return;
    }

    setLoading(true);
    setError("");
    setGeneratedQuestions([]);

    try {
      const formData = new FormData();
      formData.append("topic", topic.trim());
      if (text.trim()) formData.append("text", text.trim());
      if (file) formData.append("file", file);

      formData.append("totalQuestions", totalQuestions);
      formData.append("easyCount", totalEasy);
      formData.append("mediumCount", totalMed);
      formData.append("hardCount", totalHard);

      let configText = "";
      questionsConfig.forEach((q, index) => {
        const typeLabel =
          q.type === "SINGLE_CHOICE" ? "Trắc nghiệm 1 đáp án" :
          q.type === "MULTIPLE_CHOICE" ? "Nhiều đáp án" :
          q.type === "TRUE_FALSE" ? "Đúng/Sai" : "Điền khuyết";

        const diffLabel =
          q.difficulty === "EASY" ? "DỄ" :
          q.difficulty === "MEDIUM" ? "VỪA" : "KHÓ";

        configText += `- Câu ${index + 1}: Thể loại: ${typeLabel} (${q.type}), Độ khó: ${diffLabel}.\n`;
      });

      const antiHallucinationRules = `
1. KHÔNG ĐƯỢC BỊA ĐẶT: Mọi câu hỏi phải dựa 100% vào tài liệu.
2. KHÔNG TRÙNG LẶP: Các câu hỏi phải hoàn toàn khác nhau.
3. PHÂN BỐ ĐÁP ÁN: Không xếp các đáp án đúng trùng vị trí liền kề nhau quá nhiều.
4. CẤU TRÚC ĐỀ THI BẮT BUỘC (TẠO ĐÚNG THỨ TỰ SAU):
${configText}
5. NẾU tài liệu quá ngắn, HÃY TẠO SỐ LƯỢNG TỐI ĐA CÓ THỂ. TUYỆT ĐỐI KHÔNG BỊA KIẾN THỨC. KHÔNG LẤY CÂU NÀY BÙ CHO CÂU KIA.
6. Mỗi câu phải có: "source_reference" (trích dẫn văn bản), "explanation" (giải thích), và "keywords" (2-3 từ khóa).
      `;

      const finalPrompt = `Tổng số lượng cần tạo TỐI ĐA: ${totalQuestions} câu. Yêu cầu thêm từ người dùng: ${customPrompt}. \n\n${antiHallucinationRules}`;
      formData.append("customPrompt", finalPrompt);

      const res = await aiAPI.generateExam(formData);

      let rawData = res?.data || res?.questions || res?.result || (Array.isArray(res) ? res : []);
      if (!Array.isArray(rawData)) rawData = [];

      if (res?.message && res.message.includes("bị hủy vì tài liệu không đủ dữ kiện")) {
        alert("Thông báo từ AI: \n\n" + res.message);
      }

      if (rawData.length === 0) {
        setError("AI đã đọc tài liệu nhưng không trích xuất được câu hỏi. Cậu hãy kiểm tra lại tài liệu nhé!");
      }

      setGeneratedQuestions(rawData);

      if (rawData.length > 0) {
        setTimeout(() => {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }, 100);
      }
    } catch (err) {
      setError(err.message || "Lỗi kết nối máy chủ AI. Vui lòng thử lại!");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveExam = async () => {
    if (generatedQuestions.length === 0) return;
    setIsSaving(true);
    try {
      const payload = {
        topic: topic.trim(),
        questions: generatedQuestions,
      };
      const res = await aiAPI.saveExam(payload);
      alert(res.message || "Lưu đề thi thành công!");
      setGeneratedQuestions([]);
      if (onNavigate) onNavigate("my-exams");
    } catch (err) {
      alert("Lỗi: " + (err.message || "Không thể lưu đề thi"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleScrollToPreview = () => {
    if (previewRef.current) {
      previewRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleResetForm = () => {
    if (window.confirm("Bạn muốn bỏ kết quả hiện tại và tạo đề mới?")) {
      setGeneratedQuestions([]);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  if (mode === "menu") {
    return (
      <div className="dashboard-layout">
        <Sidebar currentView="create-exam" onNavigate={onNavigate} />
        <main className="dashboard-content">
          <div className="create-content-wrapper">
            <header className="create-header">
              <h1>Tạo bộ đề thi mới ✨</h1>
              <p>Chọn phương thức tạo đề thi phù hợp với bạn.</p>
            </header>

            <div className="create-page-container">
              <CreateOptionCard
                icon="fa-pen-to-square"
                title="Tạo đề thủ công"
                description="Tự tay biên soạn từng câu hỏi trắc nghiệm, điền khuyết. Phù hợp khi bạn cần độ chính xác cao."
                colorVar="--primary"
                onClick={() => navigate("/create-exam/manual")}
              />

              <CreateOptionCard
                icon="fa-wand-magic-sparkles"
                title="Tạo đề bằng AI"
                description="Tải tài liệu PDF, Word hoặc dán văn bản. AI sẽ tự động trích xuất nội dung và tạo đề thi cho bạn."
                colorVar="--green"
                isSpeed={true}
                onClick={() => setMode("ai")}
              />
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      <Sidebar currentView="create-exam-ai" onNavigate={onNavigate} />
      <main className="dashboard-content scrollable-content" style={{ backgroundColor: "var(--bg-main)", padding: "30px" }}>
        <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
          <button 
            onClick={() => setMode("menu")} 
            style={{ background: "none", border: "none", color: "var(--text-gray)", fontSize: "1rem", fontWeight: "700", cursor: "pointer", marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}
          >
            <i className="fa-solid fa-arrow-left"></i> Quay lại menu
          </button>

          <header style={{ textAlign: "center", margin: "0 0 30px 0" }}>
            <h1 style={{ color: "var(--text-dark)", fontWeight: "800", fontSize: "2.2rem" }}>
              Tạo Đề Thi Trắc Nghiệm AI 📝
            </h1>
            <p style={{ color: "var(--text-gray)", fontSize: "1.1rem" }}>
              Tự do cấu hình từng câu hỏi, tải tài liệu lên và để AI xử lý phần còn lại!
            </p>
          </header>

          {generatedQuestions.length === 0 ? (
            <CreateExamInput
              topic={topic}
              setTopic={setTopic}
              existingExams={existingExams}
              questionCount={questionCount}
              setQuestionCount={setQuestionCount}
              questionsConfig={questionsConfig}
              setQuestionsConfig={setQuestionsConfig}
              text={text}
              setText={setText}
              fileInputRef={fileInputRef}
              handleFileChange={handleFileChange}
              customPrompt={customPrompt}
              setCustomPrompt={setCustomPrompt}
              loading={loading}
              handleGenerateExam={handleGenerateExam}
              error={error}
            />
          ) : (
            <div className="cep-success-banner">
              <div className="cep-success-icon-wrapper">
                <i className="fa-solid fa-wand-magic-sparkles cep-success-icon"></i>
              </div>
              <h2 className="cep-success-title">Tuyệt vời! Đề thi đã ra lò</h2>
              <p className="cep-success-text">
                AI đã xử lý xong tài liệu và tạo thành công{" "}
                <strong>{generatedQuestions.length}</strong> câu hỏi bám sát cấu hình của cậu.
              </p>
              <div className="cep-action-buttons">
                <button onClick={handleScrollToPreview} className="cep-btn-view">
                  Xem Trước Đề Thi <i className="fa-solid fa-arrow-down"></i>
                </button>
                <button onClick={handleResetForm} className="cep-btn-remake">
                  <i className="fa-solid fa-rotate-left"></i> Tạo lại từ đầu
                </button>
              </div>
            </div>
          )}

          <div ref={previewRef}>
            <CreateExamPreview
              generatedQuestions={generatedQuestions}
              setGeneratedQuestions={setGeneratedQuestions}
              isSaving={isSaving}
              handleSaveExam={handleSaveExam}
              targetCounts={{
                total: totalQuestions,
                easy: totalEasy,
                med: totalMed,
                hard: totalHard,
              }}
              originalText={text}
              originalFile={file}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default CreateExamPage;