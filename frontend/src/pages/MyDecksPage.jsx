// frontend/src/pages/MyDecksPage.jsx
import React, { useState, useEffect } from "react";
import Sidebar from "../components/Layout/Sidebar";
import Button from "../components/common/Button";
import CramModeModal from "../components/Modals/CramModeModal";
import ManageDeckModal from "../components/Modals/ManageDeckModal";
import "./DashboardPage.css";
import "./MyDecksPage.css";

// 👉 ĐÃ SỬA: Nhận thêm prop onStudy để có thể đính kèm cờ "Vượt Rào"
const MyDecksPage = ({ onNavigate, onStudy }) => {
  const [decks, setDecks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedDeck, setSelectedDeck] = useState(null);
  const [isCramModalOpen, setIsCramModalOpen] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);

  const fetchDecks = async () => {
    try {
      const token = localStorage.getItem("token") || "";
      const res = await fetch("http://localhost:5000/api/decks", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) setDecks(data.data || []);
    } catch (error) {
      console.error("Lỗi khi tải bộ thẻ:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDecks();
  }, []);

  const openCramModal = (deck) => {
    setSelectedDeck(deck);
    setIsCramModalOpen(true);
  };

  const openManageModal = (deck) => {
    setSelectedDeck(deck);
    setIsManageModalOpen(true);
  };

  // 👉 ĐÃ THÊM: Bẫy sự kiện bấm nút Ôn Tập Thường
  const handleStudyClick = async (deckId) => {
    try {
      const token = localStorage.getItem("token") || "";

      // Chớp nhoáng gọi API xem bộ thẻ này còn bài để học không
      const res = await fetch(`http://localhost:5000/api/study/due/${deckId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const dueCount = data.data ? data.data.length : 0;

      // Nếu hết thẻ (0 thẻ) -> Bật Popup hỏi ý kiến
      if (dueCount === 0) {
        const userWantsToForce = window.confirm(
          "✨ Cậu đã học xong bài môn này rồi!\n\nCậu có muốn 'vượt rào' ôn trước các thẻ chưa đến hạn không?",
        );

        if (userWantsToForce) {
          // Nếu đồng ý, gọi onStudy kèm cờ forceReview = true
          if (onStudy) onStudy(deckId, true);
          // Hack an toàn nếu nhỡ quên cập nhật App.js
          else onNavigate("review", `${deckId}?force=true`);
        }
      } else {
        // Nếu còn bài thì vào học bình thường (cờ = false)
        if (onStudy) onStudy(deckId, false);
        else onNavigate("review", deckId);
      }
    } catch (error) {
      // Rủi ro mạng lag thì cứ mở trang học ra cho báo lỗi bên đó
      if (onStudy) onStudy(deckId, false);
      else onNavigate("review", deckId);
    }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar currentView="my-decks" onNavigate={onNavigate} />

      <main className="dashboard-content">
        <div className="page-wrapper">
          <header style={{ marginBottom: "30px" }}>
            {/* 👉 ĐÃ SỬA: Đổi tiêu đề trang ở đây */}
            <h1 style={{ color: "#2d3748" }}>Thư viện của tôi 📚</h1>
            <p style={{ color: "#718096" }}>
              Quản lý kho tàng kiến thức của bạn tại đây.
            </p>
          </header>

          {isLoading ? (
            <p style={{ textAlign: "center", color: "#718096" }}>
              Đang tải dữ liệu...
            </p>
          ) : decks.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "50px",
                background: "white",
                borderRadius: "12px",
                boxShadow: "0 4px 6px rgba(0, 0, 0, 0.05)",
              }}
            >
              <p
                style={{
                  fontSize: "1.1rem",
                  color: "#4a5568",
                  marginBottom: "20px",
                }}
              >
                Cậu chưa có bộ thẻ nào cả! Hãy tạo bộ thẻ đầu tiên nhé.
              </p>
              <Button
                text="Tạo thẻ ngay"
                variant="primary"
                onClick={() => onNavigate("create")}
              />
            </div>
          ) : (
            <div className="decks-grid">
              {decks.map((deck) => (
                <div className="deck-card" key={deck.id}>
                  <div className="deck-card-header">
                    <div
                      style={{
                        background: "#ebf8ff",
                        color: "#3182ce",
                        padding: "12px",
                        borderRadius: "10px",
                      }}
                    >
                      <i className="fa-solid fa-layer-group"></i>
                    </div>
                    <h3>{deck.title || deck.name}</h3>
                  </div>

                  <p
                    style={{
                      color: "#718096",
                      fontSize: "0.9rem",
                      margin: "0 0 20px 0",
                    }}
                  >
                    Chứa các thẻ từ vựng / thuật ngữ.
                  </p>

                  <div className="deck-actions">
                    <button
                      onClick={() => handleStudyClick(deck.id)}
                      style={{
                        width: "100%",
                        padding: "12px",
                        background: "#f0f4f8",
                        border: "none",
                        borderRadius: "8px",
                        color: "#2b6cb0",
                        fontWeight: "bold",
                        cursor: "pointer",
                        transition: "0.2s",
                      }}
                    >
                      Ôn tập thường
                    </button>

                    <button
                      onClick={() => openCramModal(deck)}
                      style={{
                        width: "100%",
                        padding: "12px",
                        background: "#f59e0b",
                        border: "none",
                        borderRadius: "8px",
                        color: "white",
                        fontWeight: "bold",
                        cursor: "pointer",
                        display: "flex",
                        justifyContent: "center",
                        gap: "8px",
                        alignItems: "center",
                        transition: "0.2s",
                      }}
                    >
                      ⚡ Bật Cram Mode
                    </button>

                    <button
                      className="btn-manage"
                      onClick={() => openManageModal(deck)}
                    >
                      ⚙️ Quản lý chi tiết
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <CramModeModal
        isOpen={isCramModalOpen}
        onClose={() => setIsCramModalOpen(false)}
        selectedDeck={selectedDeck}
        onNavigate={onNavigate}
      />

      <ManageDeckModal
        isOpen={isManageModalOpen}
        onClose={() => setIsManageModalOpen(false)}
        selectedDeck={selectedDeck}
        onRefreshDecks={fetchDecks}
      />
    </div>
  );
};

export default MyDecksPage;
