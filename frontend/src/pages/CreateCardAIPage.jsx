// frontend/src/pages/CreateCardAIPage.jsx
import React, { useState, useRef, useEffect } from "react";
import Sidebar from "../components/Layout/Sidebar";
import AIInputSection from "../components/Cards/AIInputSection";
import AIPreviewSection from "../components/Cards/AIPreviewSection";
import api from "../services/api";
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
        const res = await api.get("/decks");
        const decksList = res.data || res || [];
        setExistingDecks(Array.isArray(decksList) ? decksList : []);
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
      const formData = new FormData();
      if (topic.trim()) formData.append("topic", topic.trim());
      if (text.trim()) formData.append("text", text.trim());
      if (file) formData.append("file", file);

      const mathInstruction = `LƯU Ý TỐI QUAN TRỌNG VỀ ĐỊNH DẠNG:
1. BẮT BUỘC trả về KẾT QUẢ DUY NHẤT là một MẢNG JSON HỢP LỆ. Tuyệt đối không chèn thêm bất kỳ văn bản chào hỏi hay giải thích nào bên ngoài mảng JSON (không dùng markdown \`\`\`json).
2. Trong nội dung thẻ, BẮT BUỘC bọc TẤT CẢ các công thức và ký hiệu toán học vào giữa 2 thẻ [MATH] và [/MATH]. (Ví dụ: [MATH]\\cos(a-b)[/MATH]). Không dùng dấu $ hay $$.
3. Hãy cẩn thận escape các dấu gạch chéo ngược (backslash) nếu cần để JSON không bị lỗi.`;

      const finalPrompt = customPrompt.trim()
        ? customPrompt + "\n\n" + mathInstruction
        : mathInstruction;

      formData.append("customPrompt", finalPrompt);

      const res = await api.post("/ai/generate", formData);
      console.log("📦 Dữ liệu thô từ Backend gửi về Frontend:", res); // Radar theo dõi data

      // 👉 ĐÃ FIX: Bóc tách lớp vỏ thông minh, bao xài cho mọi kiểu trả về của Axios
      const responseData = res.data ? res.data : res;

      // Backend của mình đang trả về data: [...] hoặc cards: [...]
      let rawData = responseData.data || responseData.cards || responseData;

      if (!Array.isArray(rawData)) {
        rawData = [];
        console.warn(
          "⚠️ Cảnh báo: Dữ liệu thẻ bóc ra không phải là một Mảng!",
          responseData,
        );
      }

      setGeneratedCards(rawData);

      if (responseData.message) {
        setAiMessage(responseData.message);
      } else if (rawData.length > 0) {
        setAiMessage("Đã tạo thẻ thành công!");
      }
    } catch (err) {
      console.error("🚨 Lỗi khi gọi API /ai/generate:", err);
      setError(err.message || err.error || "Không thể kết nối đến máy chủ AI.");
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
      setError("Vui lòng nhập tên trước khi lưu!");
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
      let finalTitle = undefined;
      if (isNewTopic) {
        const cleanTopic = topic.trim();
        finalTitle = cleanTopic.includes("(AI Generated)")
          ? cleanTopic
          : `${cleanTopic} (AI Generated)`;
      }

      // 👉 Gói hàng gửi cho /decks/bulk để lưu thẳng vào Database (Đã đồng bộ)
      const payload = {
        description: "Tạo tự động bằng AI",
        is_public: false,
        cards: generatedCards,
      };

      if (isNewTopic) {
        payload.title = finalTitle;
        payload.name = finalTitle;
      } else {
        payload.deck_id = topic;
      }

      const res = await api.post("/decks/bulk", payload);
      alert("🎉 " + (res.message || "Lưu thẻ thành công!"));

      setGeneratedCards([]);
      setAiMessage("");
      if (onNavigate) onNavigate("my-decks");
    } catch (err) {
      const errorMsg = err.message || err.error || "Lỗi khi lưu dữ liệu!";
      alert("🚨 Lỗi từ Server: " + errorMsg);
      setError(errorMsg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar currentView="create-ai" onNavigate={onNavigate} />

      <main
        className="dashboard-content scrollable-content"
        style={{ backgroundColor: "var(--bg-main)" }}
      >
        <div className="create-content-wrapper" style={{ padding: "30px" }}>
          <header
            className="create-header"
            style={{ textAlign: "center", marginBottom: "30px" }}
          >
            <h1 style={{ color: "var(--text-dark)", fontWeight: "800" }}>
              Tạo thẻ thông minh AI ✨
            </h1>
            <p style={{ color: "var(--text-gray)" }}>
              Tải tài liệu PDF/Word lên, AI sẽ tự động trích xuất ý chính để làm
              Flashcard!
            </p>
          </header>

          <div
            className="create-page-container"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "30px",
              width: "100%",
              maxWidth: "1000px",
              margin: "0 auto",
            }}
          >
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