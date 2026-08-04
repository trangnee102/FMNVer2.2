// frontend/src/components/Study/AIMentorChat.jsx
import React, { useState, useRef, useEffect } from "react";
import api from "../../services/api";

const AIMentorChat = ({ currentQuestion }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: "ai",
      text: "Chào cậu! Tớ là AI Mentor. Cậu có phần nào chưa hiểu ở câu hỏi này không? Cứ hỏi tớ nhé!",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    setMessages((prev) => [...prev, { sender: "user", text: userMessage }]);
    setInput("");
    setIsLoading(true);

    try {
      let context = "Người dùng đang hỏi kiến thức chung.";
      if (currentQuestion && currentQuestion.question) {
        context = `
          Câu hỏi hiện tại sinh viên đang làm: "${currentQuestion.question}"
          Các đáp án: ${currentQuestion.options || "Không có"}
          Đáp án đúng: "${currentQuestion.correct_answers || currentQuestion.answer || "Không có"}"
          Giải thích sẵn có: "${currentQuestion.explanation || currentQuestion.back_text || "Không có"}"
        `;
      }

      const response = await api.post("/ai/ask-mentor", {
        question: userMessage,
        context: context,
      });

      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text:
            response.data.reply ||
            "Tớ hiểu rồi, nhưng hệ thống trả lời hơi lỗi xíu!",
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: "Xin lỗi cậu, tớ đang bị nghẽn mạng! Cậu thử lại sau nhé. 😥",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            position: "fixed",
            bottom: "30px",
            right: "30px",
            width: "60px",
            height: "60px",
            borderRadius: "50%",
            backgroundColor: "#8b5cf6",
            color: "white",
            border: "none",
            boxShadow: "0 4px 15px rgba(139, 92, 246, 0.4)",
            cursor: "pointer",
            fontSize: "1.8rem",
            zIndex: 1000,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            animation: "bounce 2s infinite",
          }}
          title="Hỏi AI Mentor"
        >
          <i className="fa-solid fa-robot"></i>
        </button>
      )}

      {isOpen && (
        <div
          style={{
            position: "fixed",
            bottom: "30px",
            right: "30px",
            width: "350px",
            height: "500px",
            backgroundColor: "var(--bg-card)",
            borderRadius: "16px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
            display: "flex",
            flexDirection: "column",
            zIndex: 1000,
            border: "1px solid var(--border)",
            overflow: "hidden",
            animation: "fadeIn 0.3s ease-in-out",
          }}
        >
          <div
            style={{
              backgroundColor: "#8b5cf6",
              color: "white",
              padding: "15px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontWeight: "bold",
            }}
          >
            <div>
              <i
                className="fa-solid fa-robot"
                style={{ marginRight: "8px" }}
              ></i>
              AI Mentor
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: "none",
                border: "none",
                color: "white",
                cursor: "pointer",
                fontSize: "1.2rem",
              }}
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>

          <div
            style={{
              flex: 1,
              padding: "15px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              backgroundColor: "var(--bg-main)",
            }}
          >
            {messages.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  alignSelf: msg.sender === "user" ? "flex-end" : "flex-start",
                  backgroundColor:
                    msg.sender === "user" ? "#3b82f6" : "var(--bg-card)",
                  color: msg.sender === "user" ? "white" : "var(--text-dark)",
                  padding: "10px 15px",
                  borderRadius: "12px",
                  maxWidth: "85%",
                  border:
                    msg.sender === "ai" ? "1px solid var(--border)" : "none",
                  fontSize: "0.95rem",
                  lineHeight: "1.4",
                  whiteSpace: "pre-wrap",
                }}
              >
                {msg.text}
              </div>
            ))}
            {isLoading && (
              <div
                style={{
                  alignSelf: "flex-start",
                  color: "var(--text-gray)",
                  fontSize: "0.9rem",
                  fontStyle: "italic",
                }}
              >
                AI đang gõ...{" "}
                <i className="fa-solid fa-circle-notch fa-spin"></i>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form
            onSubmit={handleSendMessage}
            style={{
              padding: "10px",
              backgroundColor: "var(--bg-card)",
              borderTop: "1px solid var(--border)",
              display: "flex",
              gap: "10px",
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Nhập câu hỏi của cậu..."
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: "20px",
                border: "1px solid var(--border)",
                outline: "none",
                backgroundColor: "var(--bg-main)",
                color: "var(--text-dark)",
              }}
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              style={{
                backgroundColor: "#8b5cf6",
                color: "white",
                border: "none",
                borderRadius: "50%",
                width: "40px",
                height: "40px",
                cursor: isLoading || !input.trim() ? "not-allowed" : "pointer",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <i className="fa-solid fa-paper-plane"></i>
            </button>
          </form>
        </div>
      )}

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </>
  );
};

export default AIMentorChat; // Cực kỳ quan trọng: Dòng này bắt buộc phải có!