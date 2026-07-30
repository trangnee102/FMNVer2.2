// frontend/src/pages/CreateExamPage.jsx
import React, { useState, useRef } from "react";
import Sidebar from "../components/Layout/Sidebar";
import api from "../services/api";
import CreateExamInput from "../components/Cards/CreateExamInput";
import CreateExamPreview from "../components/Cards/CreateExamPreview";
import "./DashboardPage.css";
import "./CreateExam.css";

const CreateExamPage = ({ onNavigate }) => {
  const [topic, setTopic] = useState("");
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const fileInputRef = useRef(null);
  const [customPrompt, setCustomPrompt] = useState("");

  const [examType, setExamType] = useState("MIX");
  const [questionCount, setQuestionCount] = useState(10);

  const [easyCount, setEasyCount] = useState(4);
  const [medCount, setMedCount] = useState(4);
  const [hardCount, setHardCount] = useState(2);

  const [loading, setLoading] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState([]);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

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

    setLoading(true);
    setError("");
    setGeneratedQuestions([]);

    try {
      const formData = new FormData();
      formData.append("topic", topic.trim());
      if (text.trim()) formData.append("text", text.trim());
      if (file) formData.append("file", file);

      const typeText =
        examType === "SINGLE"
          ? "Chỉ tạo câu hỏi trắc nghiệm 1 đáp án đúng (SINGLE_CHOICE)."
          : examType === "MULTIPLE"
            ? "Chỉ tạo câu hỏi trắc nghiệm nhiều đáp án đúng (MULTIPLE_CHOICE)."
            : examType === "TRUE_FALSE"
              ? "Chỉ tạo câu hỏi Đúng/Sai (TRUE_FALSE)."
              : examType === "FILL_BLANK"
                ? "Chỉ tạo câu hỏi điền vào chỗ trống (FILL_BLANK)."
                : "Tạo đề thi hỗn hợp (MIX) gồm Trắc nghiệm 1 đáp án, Nhiều đáp án, Đúng/Sai và Điền khuyết.";

      // 👉 ĐÃ NÂNG CẤP: Bổ sung Luật số 6 ép AI trả về dữ liệu học thuật
      const antiHallucinationRules = `
⚠️ LUẬT THÉP BẮT BUỘC (ANTI-HALLUCINATION & FALLBACK):
1. KHÔNG ĐƯỢC BỊA ĐẶT: Mọi câu hỏi phải dựa 100% vào tài liệu.
2. KHÔNG TRÙNG LẶP: Các câu hỏi phải hoàn toàn khác nhau.
3. PHÂN BỐ ĐÁP ÁN: Không xếp các đáp án đúng trùng vị trí liền kề nhau quá nhiều.
4. CƠ CẤU ĐỘ KHÓ BẮT BUỘC: Cố gắng tạo tối đa ${easyCount} câu DỄ, ${medCount} câu VỪA và ${hardCount} câu KHÓ.
5. 🚨 LUẬT AN TOÀN: NẾU tài liệu quá ngắn, không đủ dữ kiện để tạo đủ số lượng yêu cầu, HÃY TẠO SỐ LƯỢNG TỐI ĐA CÓ THỂ. TUYỆT ĐỐI KHÔNG BỊA KIẾN THỨC BÊN NGOÀI ĐỂ BÙ VÀO.
6. 🎓 DỮ LIỆU HỌC THUẬT: Mỗi câu hỏi BẮT BUỘC phải có thêm các trường: "source_reference" (trích dẫn đoạn văn bản nguồn), "explanation" (giải thích chi tiết đáp án), và "keywords" (mảng 2-3 từ khóa quan trọng).
      `;

      const finalPrompt = `Số lượng câu hỏi yêu cầu: ${questionCount} câu. Thể loại yêu cầu: ${typeText}. Yêu cầu thêm: ${customPrompt}. \n\n${antiHallucinationRules}`;
      formData.append("customPrompt", finalPrompt);

      const res = await api.post("/ai/generate-exam", formData);

      let rawData =
        res?.data ||
        res?.questions ||
        res?.result ||
        (Array.isArray(res) ? res : []);
      if (!Array.isArray(rawData)) rawData = [];

      if (rawData.length === 0) {
        setError(
          "⚠️ AI đã đọc tài liệu nhưng không trích xuất được câu hỏi. Cậu thử bấm tạo lại lần nữa hoặc thêm tài liệu dài hơn nhé!",
        );
      }

      setGeneratedQuestions(rawData);
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
      const res = await api.post("/ai/save-exam", payload);
      alert("🎉 " + (res.message || "Lưu đề thi thành công!"));
      setGeneratedQuestions([]);

      if (onNavigate) onNavigate("my-exams");
    } catch (err) {
      alert("🚨 Lỗi: " + (err.message || "Không thể lưu đề thi"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar currentView="create-exam-ai" onNavigate={onNavigate} />

      <main
        className="dashboard-content scrollable-content"
        style={{ backgroundColor: "var(--bg-main)", padding: "30px" }}
      >
        <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
          <header style={{ textAlign: "center", margin: "0 0 30px 0" }}>
            <h1
              style={{
                color: "var(--text-dark)",
                fontWeight: "800",
                fontSize: "2.2rem",
              }}
            >
              Tạo Đề Thi Trắc Nghiệm AI 📝
            </h1>
            <p style={{ color: "var(--text-gray)", fontSize: "1.1rem" }}>
              Tùy chỉnh định dạng đề thi, tải tài liệu lên và để AI thiết kế bài
              test cho cậu!
            </p>
          </header>

          <CreateExamInput
            topic={topic}
            setTopic={setTopic}
            examType={examType}
            setExamType={setExamType}
            questionCount={questionCount}
            setQuestionCount={setQuestionCount}
            easyCount={easyCount}
            setEasyCount={setEasyCount}
            medCount={medCount}
            setMedCount={setMedCount}
            hardCount={hardCount}
            setHardCount={setHardCount}
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

          <CreateExamPreview
            generatedQuestions={generatedQuestions}
            setGeneratedQuestions={setGeneratedQuestions}
            isSaving={isSaving}
            handleSaveExam={handleSaveExam}
            targetCounts={{
              total: questionCount,
              easy: easyCount,
              med: medCount,
              hard: hardCount,
            }}
            originalText={text}
            originalFile={file}
          />
        </div>
      </main>
    </div>
  );
};

export default CreateExamPage;
