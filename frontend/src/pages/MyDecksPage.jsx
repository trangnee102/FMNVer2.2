import { useState, useEffect, useCallback } from "react";
import Sidebar from "../components/Layout/Sidebar";
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
  const [forceModal, setForceModal] = useState({ isOpen: false, deckId: null });

  const fetchDecksData = useCallback(async () => {
    try {
      const todayString = new Date().toISOString().split("T")[0];

      const [decksRes, summaryRes] = await Promise.all([
        api.get(`/decks`),
        api
          .get(
            `/dashboard/summary?currentDate=${encodeURIComponent(todayString)}`,
          )
          .catch(() => null),
      ]);

      let rawDecks = decksRes.success
        ? decksRes.data || []
        : Array.isArray(decksRes)
          ? decksRes
          : [];
      const summaryData =
        summaryRes && summaryRes.success !== false
          ? summaryRes.data || summaryRes
          : null;
      const summaryDecks = summaryData?.decks || [];

      const augmentedDecks = rawDecks.map((deck) => {
        const sDeck = summaryDecks.find((sd) => String(sd.id) === String(deck.id)) || {};

        const totalCards = Number(
          sDeck.totalCards ??
          sDeck._count?.Flashcards ??
          deck.totalCards ??
          deck.cards?.length ??
          deck._count?.Flashcards ??
          0
        );

        let masteredCount = Number(
          sDeck.masteredCount ??
          sDeck.masteredCards ??
          deck.masteredCount ??
          deck.masteredCards ??
          0
        );

        let learnedCount = Number(sDeck.learnedCount ?? deck.learnedCount ?? masteredCount);

        let dueCount = Number(
          sDeck.dueCount ??
          sDeck.dueCards ??
          deck.dueCount ??
          deck.dueCards ??
          0
        );

        const unlearnedCount = Math.max(0, totalCards - learnedCount);
        dueCount = Math.max(dueCount, unlearnedCount);

        let overdueCount = Number(sDeck.overdueCount ?? deck.overdueCount ?? 0);

        if (masteredCount === 0 && totalCards > 0) {
          masteredCount = Math.max(0, totalCards - dueCount - overdueCount);
        }

        const cramSettingsStr = localStorage.getItem(
          `cram_settings_${deck.id}`,
        );
        let isCramActive = deck.is_cram_active || false;
        let isDeckOverdue = false;

        if (cramSettingsStr) {
          isCramActive = true;
          try {
            const settings = JSON.parse(cramSettingsStr);
            if (settings.examDate) {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const exam = new Date(settings.examDate);
              exam.setHours(0, 0, 0, 0);
              if (today > exam) {
                isDeckOverdue = true;
              }
            }
          } catch (e) {}
        }

        if (isDeckOverdue && overdueCount === 0) {
          overdueCount = 1;
        }

        return {
          ...deck,
          totalCards,
          masteredCount,
          dueCount,
          overdueCount,
          is_cram_active: isCramActive,
        };
      });

      setDecks(augmentedDecks);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDecksData();
  }, [fetchDecksData]);

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
        return title.includes("(ai generated)");
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
    const aCram = a.is_cram_active ? 1 : 0;
    const bCram = b.is_cram_active ? 1 : 0;
    if (aCram !== bCram) return bCram - aCram;

    const aFavorite = favoriteDecks.includes(a.id) ? 0 : 1;
    const bFavorite = favoriteDecks.includes(b.id) ? 0 : 1;
    if (aFavorite !== bFavorite) return aFavorite - bFavorite;

    const cardsA = a.totalCards ?? 0;
    const cardsB = b.totalCards ?? 0;
    const nameA = (a.title || a.name || "").toLowerCase();
    const nameB = (b.title || b.name || "").toLowerCase();

    if (sortOption === "name-asc") return nameA.localeCompare(nameB);
    if (sortOption === "name-desc") return nameB.localeCompare(nameA);
    if (sortOption === "cards-desc") return cardsB - cardsA;
    if (sortOption === "cards-asc") return cardsA - cardsB;

    return 0;
  });

  const totalDecks = filteredDecks.length;
  const totalCards = filteredDecks.reduce(
    (acc, deck) => acc + (deck.totalCards ?? 0),
    0,
  );
  const totalDue = filteredDecks.reduce(
    (acc, deck) => acc + (deck.dueCount ?? 0),
    0,
  );
  const totalOverdue = filteredDecks.reduce(
    (acc, deck) => acc + (deck.overdueCount ?? 0),
    0,
  );

  const handleStudyClick = async (deckId) => {
    try {
      const targetDeck = decks.find((d) => String(d.id) === String(deckId));
      const localDue = targetDeck ? targetDeck.dueCount : 0;

      const data = await api.get(`/study/deck/${deckId}/due-cards`);
      const apiDueCount = data.data
        ? data.data.length
        : Array.isArray(data)
          ? data.length
          : 0;

      const finalDueCount = Math.max(localDue, apiDueCount);

      if (finalDueCount === 0) {
        setForceModal({ isOpen: true, deckId: deckId });
      } else {
        if (onStudy) onStudy(deckId, false);
        else onNavigate("review", deckId);
      }
    } catch {
      if (onStudy) onStudy(deckId, false);
      else onNavigate("review", deckId);
    }
  };

  const renderEmptyState = () => {
    if (activeTab === "favorite") {
      return (
        <div className="modern-empty-state" style={{ marginTop: "40px" }}>
          <div className="empty-illustration">
            <i className="fa-solid fa-star" style={{ color: "#f59e0b" }}></i>
          </div>
          <h2 style={{ color: "var(--text-dark)" }}>
            Danh sách yêu thích đang trống
          </h2>
          <p style={{ color: "var(--text-gray)" }}>
            Đánh dấu những thẻ quan trọng để truy cập nhanh bất cứ lúc nào.
          </p>
        </div>
      );
    }

    if (activeTab === "ai") {
      return (
        <div className="modern-empty-state" style={{ marginTop: "40px" }}>
          <div className="empty-illustration">
            <i className="fa-solid fa-robot" style={{ color: "#8b5cf6" }}></i>
          </div>
          <h2 style={{ color: "var(--text-dark)" }}>
            Chưa có thẻ được tạo bằng AI
          </h2>
          <p style={{ color: "var(--text-gray)" }}>
            Tải lên tài liệu để AI tự động tạo flashcard cho bạn.
          </p>
          <button
            className="btn-create-primary"
            style={{
              background: "#8b5cf6",
              boxShadow: "0 4px 10px rgba(139, 92, 246, 0.3)",
            }}
            onClick={() => onNavigate("create-ai")}
          >
            <i className="fa-solid fa-wand-magic-sparkles"></i> Tạo thẻ bằng AI
          </button>
        </div>
      );
    }

    return (
      <div className="modern-empty-wrapper">
        <div className="modern-empty-state">
          <div className="empty-illustration">
            <i className="fa-solid fa-box-open"></i>
          </div>
          <h2 style={{ color: "var(--text-dark)" }}>Chưa có bộ thẻ nào</h2>
          <p style={{ color: "var(--text-gray)" }}>
            Bạn chưa tạo bộ thẻ nào. Hãy tạo bộ thẻ đầu tiên để bắt đầu học tập
            hiệu quả hơn nhé!
          </p>
          <button
            className="btn-create-primary"
            onClick={() => onNavigate("create")}
          >
            + Tạo bộ thẻ ngay
          </button>
        </div>

        <div className="empty-suggestions">
          <h3 className="suggestions-title">
            <i className="fa-solid fa-lightbulb"></i> Gợi ý dành cho bạn
          </h3>
          <div className="suggestions-grid">
            <div
              className="suggestion-card"
              onClick={() => onNavigate("create")}
            >
              <div className="s-icon s-blue">
                <i className="fa-solid fa-graduation-cap"></i>
              </div>
              <div className="s-content">
                <h4 style={{ color: "var(--text-dark)" }}>
                  Bắt đầu với bộ thẻ đầu tiên
                </h4>
                <p style={{ color: "var(--text-gray)" }}>
                  Tạo bộ thẻ để lưu trữ và ôn tập kiến thức một cách khoa học.
                </p>
              </div>
              <div className="s-action">Tạo ngay →</div>
            </div>
            <div
              className="suggestion-card"
              onClick={() => onNavigate("community")}
            >
              <div className="s-icon s-purple">
                <i className="fa-solid fa-users"></i>
              </div>
              <div className="s-content">
                <h4 style={{ color: "var(--text-dark)" }}>
                  Khám phá cộng đồng
                </h4>
                <p style={{ color: "var(--text-gray)" }}>
                  Tham gia cộng đồng để khám phá các bộ thẻ hữu ích từ mọi
                  người.
                </p>
              </div>
              <div className="s-action">Khám phá →</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="dashboard-layout">
      <Sidebar currentView="my-decks" onNavigate={onNavigate} />

      <main
        className="dashboard-content scrollable-content"
        style={{
          backgroundColor: "var(--bg-main)",
          overflowY: "auto",
          height: "100vh",
        }}
      >
        <div
          className="page-wrapper my-decks-wrapper"
          style={{ maxWidth: "1300px", margin: "0 auto", padding: "30px 40px" }}
        >
          <div className="modern-page-header">
            <div className="header-title-group">
              <h1
                style={{
                  color: "var(--text-dark)",
                  fontSize: "2rem",
                  fontWeight: "800",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                Thư viện của tôi 📚
              </h1>
              <p style={{ color: "var(--text-gray)", marginTop: "5px" }}>
                Quản lý và theo dõi các bộ thẻ của bạn.
              </p>
            </div>

            <div className="header-actions-group">
              <button
                className="btn-create-primary"
                style={{
                  padding: "12px 20px",
                  fontSize: "0.95rem",
                  whiteSpace: "nowrap",
                }}
                onClick={() => onNavigate("create")}
              >
                + Thiết kế bộ thẻ mới
              </button>

              <div className="modern-search-box">
                <i className="fa-solid fa-magnifying-glass"></i>
                <input
                  type="text"
                  placeholder="Tìm kiếm bộ thẻ..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    backgroundColor: "var(--bg-card)",
                    color: "var(--text-dark)",
                    borderColor: "var(--border)",
                  }}
                />
              </div>
              <select
                className="modern-sort-select"
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                style={{
                  backgroundColor: "var(--bg-card)",
                  color: "var(--text-dark)",
                  borderColor: "var(--border)",
                }}
              >
                <option value="name-asc">Sắp xếp: Tên A-Z</option>
                <option value="name-desc">Sắp xếp: Tên Z-A</option>
                <option value="cards-desc">Sắp xếp: Thẻ nhiều nhất</option>
                <option value="cards-asc">Sắp xếp: Thẻ ít nhất</option>
              </select>
            </div>
          </div>

          <div className="modern-tabs-container">
            <button
              className={`modern-tab ${activeTab === "all" ? "active" : ""}`}
              onClick={() => setActiveTab("all")}
            >
              Tất cả
            </button>
            <button
              className={`modern-tab ${activeTab === "favorite" ? "active" : ""}`}
              onClick={() => setActiveTab("favorite")}
            >
              Bộ thẻ yêu thích
            </button>
            <button
              className={`modern-tab ${activeTab === "ai" ? "active" : ""}`}
              onClick={() => setActiveTab("ai")}
            >
              Bộ Thẻ AI
            </button>
          </div>

          <div className="modern-stats-grid">
            <div
              className="modern-stat-card stat-blue"
              style={{
                backgroundColor: "var(--bg-card)",
                borderColor: "var(--border)",
              }}
            >
              <div className="stat-icon">
                <i className="fa-solid fa-layer-group"></i>
              </div>
              <div className="stat-info">
                <h2 style={{ color: "var(--text-dark)" }}>{totalDecks}</h2>
                <p style={{ color: "var(--text-gray)" }}>
                  Bộ thẻ{" "}
                  {activeTab !== "all" && (
                    <span style={{ fontSize: "0.75rem", opacity: 0.7 }}>
                      ({activeTab === "ai" ? "AI" : "Yêu thích"})
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div
              className="modern-stat-card stat-green"
              style={{
                backgroundColor: "var(--bg-card)",
                borderColor: "var(--border)",
              }}
            >
              <div className="stat-icon">
                <i className="fa-solid fa-file-lines"></i>
              </div>
              <div className="stat-info">
                <h2 style={{ color: "var(--text-dark)" }}>{totalCards}</h2>
                <p style={{ color: "var(--text-gray)" }}>Thẻ</p>
              </div>
            </div>
            <div
              className="modern-stat-card stat-orange"
              style={{
                backgroundColor: "var(--bg-card)",
                borderColor: "var(--border)",
              }}
            >
              <div className="stat-icon">
                <i className="fa-solid fa-clock"></i>
              </div>
              <div className="stat-info">
                <h2 style={{ color: "var(--text-dark)" }}>{totalDue}</h2>
                <p style={{ color: "var(--text-gray)" }}>Cần ôn</p>
              </div>
            </div>
            <div
              className="modern-stat-card stat-red"
              style={{
                backgroundColor: "var(--bg-card)",
                borderColor: "var(--border)",
              }}
            >
              <div className="stat-icon">
                <i className="fa-solid fa-circle-exclamation"></i>
              </div>
              <div className="stat-info">
                <h2 style={{ color: "var(--text-dark)" }}>{totalOverdue}</h2>
                <p style={{ color: "var(--text-gray)" }}>Quá hạn</p>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div
              className="loading-state"
              style={{
                textAlign: "center",
                padding: "50px",
                color: "var(--text-gray)",
              }}
            >
              <i
                className="fa-solid fa-spinner fa-spin"
                style={{
                  fontSize: "2rem",
                  margin: "0 auto 15px auto",
                  display: "block",
                }}
              ></i>
              <p>Đang tải dữ liệu...</p>
            </div>
          ) : sortedDecks.length === 0 ? (
            renderEmptyState()
          ) : (
            <div className="vertical-decks-grid">
              {sortedDecks.map((deck) => {
                const isFavorite = favoriteDecks.includes(deck.id);

                const totalCardsCount = deck.totalCards || 0;
                const masteredCount = deck.masteredCount || 0;
                const dueCount = deck.dueCount || 0;

                const progressPercent =
                  totalCardsCount === 0
                    ? 0
                    : Math.round((masteredCount / totalCardsCount) * 100);
                const isCompleted =
                  totalCardsCount > 0 && progressPercent === 100;

                const originalTitle =
                  deck.title || deck.name || "Bộ thẻ không tên";
                const isAIGenerated = originalTitle
                  .toLowerCase()
                  .includes("(ai generated)");
                const displayTitle = isAIGenerated
                  ? originalTitle.replace(/\(ai generated\)/i, "").trim()
                  : originalTitle;

                return (
                  <div className="vertical-deck-card" key={deck.id}>
                    <div className="vdc-header">
                      <div className="vdc-icon-main">
                        <i className="fa-solid fa-layer-group"></i>
                      </div>
                      <div className="vdc-actions">
                        {isAIGenerated && (
                          <div className="vdc-badge-ai" title="Tạo bằng AI">
                            <i className="fa-solid fa-robot"></i>
                          </div>
                        )}
                        <button
                          className={`vdc-btn-icon ${isFavorite ? "favorite-active" : ""}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavoriteDeck(deck.id);
                          }}
                          title="Yêu thích"
                        >
                          <i
                            className={
                              isFavorite
                                ? "fa-solid fa-star"
                                : "fa-regular fa-star"
                            }
                          ></i>
                        </button>
                        <button
                          className="vdc-btn-icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            openManageModal(deck);
                          }}
                          title="Cài đặt bộ thẻ"
                        >
                          <i className="fa-solid fa-ellipsis"></i>
                        </button>
                      </div>
                    </div>

                    <div className="vdc-title-wrapper">
                      <h3 className="vdc-title" title={displayTitle}>
                        {displayTitle}
                      </h3>
                    </div>

                    <div className="vdc-progress-wrapper">
                      <div className="vdc-progress-track">
                        <div
                          className="vdc-progress-fill"
                          style={{
                            width: `${progressPercent}%`,
                            backgroundColor: isCompleted
                              ? "#10b981"
                              : "var(--primary)",
                          }}
                        ></div>
                      </div>
                      <span
                        className="vdc-progress-text"
                        style={{
                          color: isCompleted ? "#10b981" : "var(--text-dark)",
                        }}
                      >
                        {progressPercent}%
                      </span>
                    </div>

                    <div className="vdc-stats-grid">
                      <div className="vdc-stat-box box-purple">
                        <div className="vdc-stat-icon">
                          <i className="fa-solid fa-clone"></i>
                        </div>
                        <div className="vdc-stat-val">{totalCardsCount}</div>
                        <div className="vdc-stat-label">Thẻ</div>
                      </div>
                      <div className="vdc-stat-box box-orange">
                        <div className="vdc-stat-icon">
                          <i className="fa-solid fa-clock"></i>
                        </div>
                        <div className="vdc-stat-val">{dueCount}</div>
                        <div className="vdc-stat-label">Cần ôn</div>
                      </div>
                      <div className="vdc-stat-box box-green">
                        <div className="vdc-stat-icon">
                          <i className="fa-solid fa-check-square"></i>
                        </div>
                        <div className="vdc-stat-val">{masteredCount}</div>
                        <div className="vdc-stat-label">Đã học</div>
                      </div>
                    </div>

                    <div
                      className={`vdc-cram-row ${deck.is_cram_active ? "active" : ""}`}
                      onClick={() => openCramModal(deck)}
                      style={
                        deck.is_cram_active
                          ? {
                              backgroundColor: "var(--bg-card)",
                              borderColor: "#f59e0b",
                              borderStyle: "solid",
                              borderWidth: "1.5px",
                            }
                          : {}
                      }
                    >
                      <div
                        className="vdc-cram-left"
                        style={
                          deck.is_cram_active
                            ? { color: "#f59e0b", fontWeight: "800" }
                            : {}
                        }
                      >
                        <i
                          className="fa-solid fa-bolt"
                          style={
                            deck.is_cram_active ? { color: "#f59e0b" } : {}
                          }
                        ></i>
                        <span>Cram Mode</span>
                      </div>
                      <div className="vdc-cram-right">
                        <span
                          className="vdc-cram-status"
                          style={
                            deck.is_cram_active
                              ? { color: "#f59e0b", fontWeight: "700" }
                              : {}
                          }
                        >
                          {deck.is_cram_active ? "Bật" : "Tắt"}
                        </span>
                        <div
                          className="vdc-toggle"
                          style={
                            deck.is_cram_active
                              ? { backgroundColor: "#f59e0b" }
                              : {}
                          }
                        ></div>
                      </div>
                    </div>

                    <div
                      className="vdc-footer"
                      style={{ display: "flex", gap: "8px", marginTop: "15px" }}
                    >
                      <button
                        className={`vdc-btn-study ${isCompleted && !deck.is_cram_active ? "completed" : ""}`}
                        style={{
                          width: "100%",
                          ...(deck.is_cram_active
                            ? {
                                background:
                                  "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                                boxShadow: "0 4px 12px rgba(245, 158, 11, 0.3)",
                                color: "white",
                                border: "none",
                                fontWeight: "800",
                              }
                            : {}),
                        }}
                        onClick={() => {
                          if (deck.is_cram_active) {
                            onNavigate("cram-review", deck.id);
                          } else {
                            handleStudyClick(deck.id);
                          }
                        }}
                      >
                        {deck.is_cram_active
                          ? "🔥 Luyện thi"
                          : dueCount > 0
                            ? "Ôn luyện"
                            : "👁 Xem lại"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {forceModal.isOpen && (
        <div className="cram-modal-overlay" style={{ zIndex: 1000 }}>
          <div
            className="cram-modal"
            style={{
              textAlign: "center",
              padding: "40px 30px",
              maxWidth: "420px",
            }}
          >
            <div
              style={{
                fontSize: "3.5rem",
                margin: "0 auto 20px auto",
                display: "inline-block",
                background: "rgba(16, 185, 129, 0.1)",
                padding: "15px",
                borderRadius: "50%",
              }}
            >
              ✨
            </div>
            <h3
              style={{
                color: "var(--text-dark)",
                fontSize: "1.5rem",
                margin: "0 0 15px 0",
                fontWeight: "800",
              }}
            >
              Tuyệt vời!
            </h3>
            <p
              style={{
                color: "var(--text-gray)",
                lineHeight: "1.6",
                margin: "0 0 30px 0",
                fontSize: "1.05rem",
              }}
            >
              Cậu đã học xong bài môn này rồi!
              <br />
              Cậu có muốn <strong>'vượt rào'</strong> ôn trước các thẻ chưa đến
              hạn không?
            </p>
            <div
              style={{ display: "flex", gap: "15px", justifyContent: "center" }}
            >
              <button
                style={{
                  flex: 1,
                  padding: "14px",
                  background: "var(--bg-main)",
                  border: "1px solid var(--border)",
                  borderRadius: "12px",
                  color: "var(--text-dark)",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onClick={() => setForceModal({ isOpen: false, deckId: null })}
              >
                Để sau
              </button>
              <button
                style={{
                  flex: 1,
                  padding: "14px",
                  background: "var(--primary)",
                  border: "none",
                  borderRadius: "12px",
                  color: "white",
                  fontWeight: "700",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onClick={() => {
                  const targetDeckId = forceModal.deckId;
                  setForceModal({ isOpen: false, deckId: null });
                  if (onStudy) onStudy(targetDeckId, true);
                  else if (onNavigate)
                    onNavigate("review", `${targetDeckId}?force=true`);
                }}
              >
                Vượt rào ngay
              </button>
            </div>
          </div>
        </div>
      )}

      <CramModeModal
        isOpen={isCramModalOpen}
        onClose={() => setIsCramModalOpen(false)}
        selectedDeck={selectedDeck}
        onNavigate={onNavigate}
      />

      <ManageDeckModal
        isOpen={isManageModalOpen}
        onClose={() => {
          setIsManageModalOpen(false);
          setIsLoading(true);
          fetchDecksData();
        }}
        selectedDeck={selectedDeck}
        onRefreshDecks={() => {
          setIsLoading(true);
          fetchDecksData();
        }}
      />
    </div>
  );
};

export default MyDecksPage;