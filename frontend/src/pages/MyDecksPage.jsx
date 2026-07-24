// frontend/src/pages/MyDecksPage.jsx
import { useState, useEffect } from "react";
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
  const [favoriteDecks, setFavoriteDecks] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("favoriteDeckIds") || "[]");
    } catch {
      return [];
    }
  });

  const [selectedDeck, setSelectedDeck] = useState(null);
  const [isCramModalOpen, setIsCramModalOpen] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);

  useEffect(() => {
    const fetchDecks = async () => {
      try {
        const data = await api.get("/decks");
        if (data.success) {
          setDecks(data.data || []);
        }
      } catch (err) {
        console.error("Lỗi khi tải bộ thẻ:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDecks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleFavoriteDeck = (deckId) => {
    setFavoriteDecks((prev) => {
      const isFavorite = prev.includes(deckId);
      const nextFavorites = isFavorite
        ? prev.filter((id) => id !== deckId)
        : [deckId, ...prev.filter((id) => id !== deckId)];
      localStorage.setItem("favoriteDeckIds", JSON.stringify(nextFavorites));
      return nextFavorites;
    });

    setDecks((prevDecks) => {
      const deckIndex = prevDecks.findIndex((deck) => deck.id === deckId);
      if (deckIndex === -1) return prevDecks;
      const deckToMove = prevDecks[deckIndex];
      const newDecks = prevDecks.filter((deck) => deck.id !== deckId);
      return [deckToMove, ...newDecks];
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
        const title = (deck.title || deck.name || "").toLowerCase();
        return title.includes("ai");
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
    const aFavorite = favoriteDecks.includes(a.id) ? 0 : 1;
    const bFavorite = favoriteDecks.includes(b.id) ? 0 : 1;

    if (aFavorite !== bFavorite) {
      return aFavorite - bFavorite;
    }

    if (aFavorite === 0 && bFavorite === 0) {
      const aIndex = favoriteDecks.indexOf(a.id);
      const bIndex = favoriteDecks.indexOf(b.id);
      if (aIndex !== bIndex) {
        return aIndex - bIndex;
      }
    }

    if (sortOption === "name-asc") {
      return (a.title || a.name || "").localeCompare(b.title || b.name || "");
    }
    if (sortOption === "name-desc") {
      return (b.title || b.name || "").localeCompare(a.title || a.name || "");
    }
    if (sortOption === "cards-desc") {
      return (b._count?.Flashcards || 0) - (a._count?.Flashcards || 0);
    }
    if (sortOption === "cards-asc") {
      return (a._count?.Flashcards || 0) - (b._count?.Flashcards || 0);
    }
    return 0;
  });

  const handleStudyClick = async (deckId) => {
    try {
      const data = await api.get(`/study/deck/${deckId}/due-cards`);
      const dueCount = data.data ? data.data.length : 0;

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
    } catch {
      if (onStudy) onStudy(deckId, false);
      else onNavigate("review", deckId);
    }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar currentView="my-decks" onNavigate={onNavigate} />

      <main className="dashboard-content">
        <div className="page-wrapper my-decks-wrapper">
          <div className="page-header">
            <div>
              <h1>Thư viện của tôi 📚</h1>
              <p>Quản lý kho tàng kiến thức của bạn tại đây.</p>
            </div>
            <Button
              text="+ Thiết kế bộ thẻ mới"
              variant="primary"
              onClick={() => onNavigate("create")}
            />
          </div>

          <div className="library-toolbar">
            <div className="tabs-row">
              <button
                className={`tab-button ${activeTab === "all" ? "active" : ""}`}
                onClick={() => setActiveTab("all")}
              >
                Tất cả
              </button>
              <button
                className={`tab-button ${activeTab === "favorite" ? "active" : ""}`}
                onClick={() => setActiveTab("favorite")}
              >
                Bộ thẻ yêu thích
              </button>
              <button
                className={`tab-button ${activeTab === "ai" ? "active" : ""}`}
                onClick={() => setActiveTab("ai")}
              >
                Bộ Thẻ AI
              </button>
            </div>

            <div className="search-sort-row">
              <input
                className="search-input"
                type="search"
                placeholder="Tìm kiếm bộ thẻ theo tên..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <select
                className="sort-select"
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
              >
                <option value="name-asc">Sắp xếp: Tên A-Z</option>
                <option value="name-desc">Sắp xếp: Tên Z-A</option>
                <option value="cards-desc">Số thẻ: nhiều đến ít</option>
                <option value="cards-asc">Số thẻ: ít đến nhiều</option>
              </select>
            </div>
          </div>

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
                const totalCards = deck.totalCards ?? deck._count?.Flashcards ?? 0;
                const progressPercent = deck.progressPercent ?? 0;

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
                      <i
                        className={
                          isFavorite ? "fa-solid fa-star" : "fa-regular fa-star"
                        }
                      />
                    </button>

                    <div className="deck-card-header">
                      <div className="deck-card-icon">
                        <i className="fa-solid fa-layer-group" />
                      </div>
                      <div className="deck-card-details">
                        <h3>{deck.title || deck.name || "Bộ thẻ không tên"}</h3>
                        <p className="deck-card-subtitle">
                          {deck.description || "Chứa các thẻ từ vựng / thuật ngữ."}
                        </p>
                      </div>
                    </div>

                    <div className="deck-card-meta">
                      <span className="meta-pill">
                        <i className="fa-regular fa-clone" />
                        {totalCards} thẻ
                      </span>
                      {deck.is_public !== undefined ? (
                        <span className="meta-pill">
                          {deck.is_public ? "Công khai" : "Riêng tư"}
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
                    </div>
                    <button
                      className="manage-button"
                      onClick={() => openManageModal(deck)}
                    >
                      Quản lý
                    </button>
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
        onRefreshDecks={() => {
          setIsLoading(true);
          api
            .get("/decks")
            .then((data) => {
              if (data.success) setDecks(data.data || []);
            })
            .catch((err) =>
              console.error("Lỗi khi tải lại bộ thẻ:", err),
            )
            .finally(() => setIsLoading(false));
        }}
      />
    </div>
  );
};

export default MyDecksPage;
