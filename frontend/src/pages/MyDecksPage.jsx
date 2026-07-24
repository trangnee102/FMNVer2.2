// frontend/src/pages/MyDecksPage.jsx
import React, { useState, useEffect } from "react";
import Sidebar from "../components/Layout/Sidebar";
import Button from "../components/common/Button";
import CramModeModal from "../components/Modals/CramModeModal";
import ManageDeckModal from "../components/Modals/ManageDeckModal";
import api from "../services/api";
import "./DashboardPage.css";
import "./MyDecksPage.css";

const MyDecksPage = ({ onNavigate, onStudy }) => {
  const [decks, setDecks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState("name-asc");
  const [favoriteDecks, setFavoriteDecks] = useState(
    JSON.parse(localStorage.getItem("favoriteDeckIds") || "[]") || [],
  );

  const [selectedDeck, setSelectedDeck] = useState(null);
  const [isCramModalOpen, setIsCramModalOpen] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);

  // =========================
  // Helpers
  // =========================
  const getCardCount = (deck) =>
    deck.totalCards ?? deck._count?.Flashcards ?? 0;

  const isAIDeck = (deck) => {
    if (deck.isAI !== undefined) return deck.isAI;
    return (
      (deck.title || "").toLowerCase().startsWith("[ai]") ||
      (deck.description || "").toLowerCase().startsWith("[ai]")
    );
  };


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
    let isMounted = true;

    const loadDecks = async () => {
      if (!isMounted) return;
      await fetchDecks();
    };

    void loadDecks();

    const handleDeckProgressUpdated = () => {
      void fetchDecks();
    };

    window.addEventListener("deck-progress-updated", handleDeckProgressUpdated);

    return () => {
      isMounted = false;
      window.removeEventListener("deck-progress-updated", handleDeckProgressUpdated);
    };
  }, []);

  const toggleFavoriteDeck = (deckId) => {
    setFavoriteDecks((prev) => {
      const nextFavorites = prev.includes(deckId)
        ? prev.filter((id) => id !== deckId)
        : [...prev, deckId];
      localStorage.setItem("favoriteDeckIds", JSON.stringify(nextFavorites));
      return nextFavorites;
    });
  };

  const openCramModal = (deck) => {
    setSelectedDeck(deck);
    setIsCramModalOpen(true);
  };

  const openManageModal = (deck) => {
    setSelectedDeck(deck);
    setIsManageModalOpen(true);
  };

  const filteredDecks = decks
    .filter((deck) => {
      if (activeTab === "favorite") return favoriteDecks.includes(deck.id);
      if (activeTab === "ai") {
        return isAIDeck(deck);
      }
      return true;
    })
    .filter((deck) => {
      const search = searchQuery.trim().toLowerCase();
      if (!search) return true;
      return (
        (deck.title || deck.name || "").toLowerCase().includes(search) ||
        (deck.description || "").toLowerCase().includes(search)
      );
    });
    
const sortedDecks = [...filteredDecks].sort((a, b) => {
  // ==========================
  // Ưu tiên bộ thẻ yêu thích lên đầu
  // ==========================
  const aFavorite = favoriteDecks.includes(a.id);
  const bFavorite = favoriteDecks.includes(b.id);

  if (aFavorite !== bFavorite) {
    return bFavorite - aFavorite;
  }

  // ==========================
  // Sau đó mới sort theo lựa chọn
  // ==========================
  switch (sortOption) {
    case "name-asc":
      return (a.title || a.name || "").localeCompare(
        b.title || b.name || ""
      );

    case "name-desc":
      return (b.title || b.name || "").localeCompare(
        a.title || a.name || ""
      );

    case "cards-desc":
      return getCardCount(b) - getCardCount(a);

    case "cards-asc":
      return getCardCount(a) - getCardCount(b);

    default:
      return 0;
  }
});

  const handleStudyClick = async (deckId) => {
    try {
      const res = await api.get(`/study/due/${deckId}`);

      // 👉 CHUẨN HÓA AXIOS: Bóc dữ liệu an toàn tránh sập code
      const safeDueCards = res.data?.data || res.data || [];
      const dueCount = Array.isArray(safeDueCards) ? safeDueCards.length : 0;

      if (dueCount === 0) {
        const userWantsToForce = window.confirm(
          "✨ Cậu đã học xong bài môn này rồi!\n\nCậu có muốn 'vượt rào' ôn trước các thẻ chưa đến hạn không?",
        );

        if (userWantsToForce) {
          if (onStudy) onStudy(deckId, true);
          else onNavigate("review", `${deckId}?force=true`);
        }
      } else {
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
          ) : sortedDecks.length === 0 ? (
            <div className="empty-state">
              Không tìm thấy bộ thẻ phù hợp với bộ lọc hiện tại.
            </div>
          ) : (
            <div className="decks-grid">
              {sortedDecks.map((deck) => {
                const isFavorite = favoriteDecks.includes(deck.id);
                const totalCards = getCardCount(deck);
                const progressPercent = deck.progressPercent ?? 0;
                const dueLabel = deck.dueCards != null ? deck.dueCards : totalCards;
                const statusText = totalCards === 0
                  ? "Chưa có thẻ"
                  : dueLabel === 0
                  ? "✅ Đã hoàn thành"
                  : `⏳ Còn ${dueLabel} thẻ`;

                return (
                  <div className="deck-card" key={deck.id}>
                    <button
                      className={`favorite-btn ${isFavorite ? "active" : ""}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavoriteDeck(deck.id);
                      }}
                      aria-label={isFavorite ? "Bỏ yêu thích" : "Yêu thích"}
                    >
                      <i className={isFavorite ? "fa-solid fa-star" : "fa-regular fa-star"}></i>
                    </button>

                    <div className="deck-card-header">
                      <div className="deck-card-icon">
                        <i className="fa-solid fa-layer-group"></i>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                        <h3>{deck.title || deck.name || "Bộ thẻ không tên"}</h3>
                        {isAIDeck(deck) && (
                          <span style={{background:"#7C3AED",color:"#fff",padding:"2px 8px",borderRadius:"999px",fontSize:"12px",fontWeight:600}}>AI</span>
                        )}
                      </div>
                    </div>

                    <p className="deck-card-description">
                      {deck.description || "Chứa các thẻ từ vựng / thuật ngữ."}
                    </p>

                    <div className="deck-card-meta">
                      <span className="deck-meta-pill">
                        <i className="fa-regular fa-clone"></i>
                        {totalCards} thẻ
                      </span>
                      {deck.description ? (
                        <span className="deck-meta-pill">
                          {deck.description}
                        </span>
                      ) : null}
                    </div>

                    <div className="progress-area">
                      <div className="progress-label">
                        <span>Tiến độ ôn tập</span>
                        <strong>{progressPercent}%</strong>
                      </div>
                      <div className="progress-track">
                        <div
                          className="progress-fill"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>

                    <div className="deck-status-row">
                      <span className="deck-status-pill">{statusText}</span>
                      <span className="deck-status-pill">
                        {deck.clone_count ? `${deck.clone_count} lượt chia sẻ` : ""}
                      </span>
                    </div>

                    <div className="deck-actions">
                      <button
                        className="card-action-button study"
                        onClick={() => handleStudyClick(deck.id)}
                      >
                        Ôn tập thường
                      </button>

                      <button
                        className="card-action-button cram"
                        onClick={() => openCramModal(deck)}
                      >
                        ⚡ Bật Cram
                      </button>

                      <button
                        className="card-action-button manage"
                        onClick={() => openManageModal(deck)}
                      >
                        Quản lý
                      </button>
                    </div>
                  </div>
                );
              })}
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
