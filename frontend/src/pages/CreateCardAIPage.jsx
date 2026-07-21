// frontend/src/pages/CreateCardAIPage.jsx
import React, { useState, useRef, useEffect } from "react";
import Sidebar from "../components/Layout/Sidebar";
import AIInputSection from "../components/Cards/AIInputSection";
import AIPreviewSection from "../components/Cards/AIPreviewSection";
import "./DashboardPage.css";
import "./CreateCardAIPage.css";

const CreateCardAIPage = ({ onNavigate }) => {
  const [topic, setTopic] = useState("");
  const [isNewTopic, setIsNewTopic] = useState(false);
  const [existingDecks, setExistingDecks] = useState([]);

  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const fileInputRef = useRef(null);
  const [customPrompt, setCustomPrompt] = useState("");

  const [loading, setLoading] = useState(false);
  const [generatedCards, setGeneratedCards] = useState([]);
  const [error, setError] = useState("");
  const [aiMessage, setAiMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchMyDecks = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch("http://localhost:5000/api/decks", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (response.ok) setExistingDecks(data.data || data);
      } catch (err) {
        console.error("Lỗi khi kéo dữ liệu bộ thẻ:", err);
      }
    };
    fetchMyDecks();
  }, []);

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

  const handleGenerateAI = async () => {
    if (!topic.trim() && !text.trim() && !file) {
      setError("Vui lòng nhập văn bản hoặc tải tài liệu lên để AI xử lý!");
      return;
    }

    setLoading(true);
    setError("");
    setAiMessage("");
    setGeneratedCards([]);

    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("topic", topic);
      formData.append("text", text);
      if (file) formData.append("file", file);

      // 👉 Định dạng ép [MATH] và JSON chuẩn
      const mathInstruction = `LƯU Ý TỐI QUAN TRỌNG VỀ ĐỊNH DẠNG:
1. BẮT BUỘC trả về KẾT QUẢ DUY NHẤT là một MẢNG JSON HỢP LỆ. Tuyệt đối không chèn thêm bất kỳ văn bản chào hỏi hay giải thích nào bên ngoài mảng JSON (không dùng markdown \`\`\`json).
2. Trong nội dung thẻ, BẮT BUỘC bọc TẤT CẢ các công thức và ký hiệu toán học vào giữa 2 thẻ [MATH] và [/MATH]. (Ví dụ: [MATH]\\cos(a-b)[/MATH]). Không dùng dấu $ hay $$.
3. Hãy cẩn thận escape các dấu gạch chéo ngược (backslash) nếu cần để JSON không bị lỗi (Ví dụ: dùng \\\\cos nếu parse JSON bị lỗi).`;

      const finalPrompt = customPrompt.trim()
        ? customPrompt + "\n\n" + mathInstruction
        : mathInstruction;

      formData.append("customPrompt", finalPrompt);

      const response = await fetch("http://localhost:5000/api/ai/generate", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setGeneratedCards(data.data);
        if (data.message) setAiMessage(data.message);
      } else {
        setError(data.message || "Có lỗi xảy ra khi tạo thẻ.");
      }
    } catch (err) {
      setError("Không thể kết nối đến máy chủ AI.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCards = async () => {
    if (generatedCards.length === 0) {
      alert("Chưa có thẻ nào được tạo ra cả!");
      return;
    }
    if (isNewTopic && !topic.trim()) {
      alert("⚠️ Cậu chưa nhập Tên bộ thẻ kìa! Điền vào ô bên trái nhé.");
      setError("Vui lòng nhập tên cho bộ thẻ mới trước khi lưu!");
      return;
    }
    if (!isNewTopic && !topic) {
      alert("⚠️ Cậu chưa chọn Bộ thẻ nào để lưu vào cả!");
      setError("Vui lòng chọn bộ thẻ để lưu hoặc tạo bộ thẻ mới!");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      const token = localStorage.getItem("token");

      // 👉 GỌI ĐÚNG API /decks/bulk VÀ ĐỔI TOPIC THÀNH TITLE
      const response = await fetch("http://localhost:5000/api/decks/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: topic,
          description: "Tạo tự động bằng AI",
          is_public: false,
          cards: generatedCards,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert("🎉 " + (data.message || "Lưu thẻ thành công!"));
        setGeneratedCards([]);
        setAiMessage("");
        if (onNavigate) onNavigate("my-decks");
      } else {
        alert("🚨 Lỗi: " + (data.message || "Không lưu được thẻ!"));
        setError(data.message || "Lỗi khi lưu thẻ!");
      }
    } catch (err) {
      alert("🚨 Đứt kết nối với Server!");
      setError("Không thể kết nối đến server khi lưu thẻ.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar currentView="create" onNavigate={onNavigate} />

      <main className="dashboard-content">
        <div className="create-content-wrapper">
          <header className="create-header">
            <h1>Tạo thẻ thông minh AI</h1>
            <p>
              Tải tài liệu PDF/Word lên, AI sẽ tự động trích xuất ý chính và vẽ
              công thức Toán học thành Flashcard
            </p>
          </header>

          <div 
            className="create-page-container"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "30px",
              width: "100%",
              maxWidth: "900px",
              margin: "0 auto",
            }}>
            <AIInputSection
              topic={topic}
              setTopic={setTopic}
              isNewTopic={isNewTopic}
              setIsNewTopic={setIsNewTopic}
              existingDecks={existingDecks}
              text={text}
              setText={setText}
              file={file}
              fileInputRef={fileInputRef}
              handleFileChange={handleFileChange}
              customPrompt={customPrompt}
              setCustomPrompt={setCustomPrompt}
              error={error}
              loading={loading}
              handleGenerateAI={handleGenerateAI}
            />

            <AIPreviewSection
              loading={loading}
              generatedCards={generatedCards}
              setGeneratedCards={setGeneratedCards}
              aiMessage={aiMessage}
              handleSaveCards={handleSaveCards}
              isSaving={isSaving}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default CreateCardAIPage;
