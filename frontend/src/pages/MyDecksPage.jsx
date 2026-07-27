// frontend/src/pages/MyDecksPage.jsx
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

  // 👉 ĐÃ SỬA: Thuật toán gộp dữ liệu 2 lớp cực kỳ chặt chẽ, không bao giờ lo hiển thị 0%
  const fetchDecksData = useCallback(async () => {
    try {
      const todayString = new Date().toISOString();
      const t = new Date().getTime(); // Phá cache

      const [decksRes, summaryRes] = await Promise.all([
        api.get(`/decks?t=${t}`),
        api.get(`/dashboard/summary?currentDate=${encodeURIComponent(todayString)}&t=${t}`).catch(() => null)
      ]);

      let rawDecks = decksRes.success ? (decksRes.data || []) : [];
      const summaryData = (summaryRes && summaryRes.success !== false) ? (summaryRes.data || summaryRes) : null;
      const summaryDecks = summaryData?.decks || [];

      // Vét cạn dữ liệu từ cả 2 API để đảm bảo số liệu chuẩn xác
      const augmentedDecks = rawDecks.map(deck => {
        const sDeck = summaryDecks.find(sd => sd.id === deck.id) || {};
        
        const totalCards = sDeck.totalCards ?? sDeck._count?.Flashcards ?? deck.totalCards ?? deck.cards?.length ?? deck._count?.Flashcards ?? 0;
        const masteredCount = sDeck.masteredCount ?? sDeck.masteredCards ?? deck.masteredCount ?? deck.masteredCards ?? 0;
        const dueCount = sDeck.dueCount ?? sDeck.dueCards ?? deck.dueCount ?? deck.dueCards ?? 0;
        const overdueCount = sDeck.overdueCount ?? deck.overdueCount ?? 0;

        return {
          ...deck,
          totalCards,
          masteredCount,
          dueCount,
          overdueCount
        };
      });

      setDecks(augmentedDecks);
    } catch (err) {
      console.error("Lỗi khi tải bộ thẻ:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Gọi lần đầu khi Component Mount
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
  const totalCards = filteredDecks.reduce((acc, deck) => acc + (deck.totalCards ?? 0), 0);
  const totalDue = filteredDecks.reduce((acc, deck) => acc + (deck.dueCount ?? 0), 0);
  const totalOverdue = filteredDecks.reduce((acc, deck) => acc + (deck.overdueCount ?? 0), 0);

  const handleStudyClick = async (deckId) => {
    try {
      const t = new Date().getTime(); 
      const data = await api.get(`/study/deck/${deckId}/due-cards?t=${t}`);
      const dueCount = data.data ? data.data.length : 0;

      if (dueCount === 0) {
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
          <h2 style={{ color: "var(--text-dark)" }}>Danh sách yêu thích đang trống</h2>
          <p style={{ color: "var(--text-gray)" }}>Đánh dấu những thẻ quan trọng để truy cập nhanh bất cứ lúc nào.</p>
        </div>
      );
    }

    if (activeTab === "ai") {
      return (
        <div className="modern-empty-state" style={{ marginTop: "40px" }}>
          <div className="empty-illustration">
            <i className="fa-solid fa-robot" style={{ color: "#8b5cf6" }}></i>
          </div>
          <h2 style={{ color: "var(--text-dark)" }}>Chưa có thẻ được tạo bằng AI</h2>
          <p style={{ color: "var(--text-gray)" }}>Tải lên tài liệu để AI tự động tạo flashcard cho bạn.</p>
          <button 
            className="btn-create-primary" 
            style={{ background: "#8b5cf6", boxShadow: "0 4px 10px rgba(139, 92, 246, 0.3)" }}
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
          <p style={{ color: "var(--text-gray)" }}>Bạn chưa tạo bộ thẻ nào. Hãy tạo bộ thẻ đầu tiên để bắt đầu học tập hiệu quả hơn nhé!</p>
          <button className="btn-create-primary" onClick={() => onNavigate("create")}>
            + Tạo bộ thẻ ngay
          </button>
        </div>

        <div className="empty-suggestions">
          <h3 className="suggestions-title"><i className="fa-solid fa-lightbulb"></i> Gợi ý dành cho bạn</h3>
          <div className="suggestions-grid">
            <div className="suggestion-card" onClick={() => onNavigate("create")}>
              <div className="s-icon s-blue"><i className="fa-solid fa-graduation-cap"></i></div>
              <div className="s-content">
                <h4 style={{ color: "var(--text-dark)" }}>Bắt đầu với bộ thẻ đầu tiên</h4>
                <p style={{ color: "var(--text-gray)" }}>Tạo bộ thẻ để lưu trữ và ôn tập kiến thức một cách khoa học.</p>
              </div>
              <div className="s-action">Tạo ngay →</div>
            </div>
            <div className="suggestion-card" onClick={() => onNavigate("community")}>
              <div className="s-icon s-purple"><i className="fa-solid fa-users"></i></div>
              <div className="s-content">
                <h4 style={{ color: "var(--text-dark)" }}>Khám phá cộng đồng</h4>
                <p style={{ color: "var(--text-gray)" }}>Tham gia cộng đồng để khám phá các bộ thẻ hữu ích từ mọi người.</p>
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

      <main className="dashboard-content scrollable-content" style={{ backgroundColor: "var(--bg-main)", overflowY: "auto", height: "100vh" }}>
        <div className="page-wrapper my-decks-wrapper" style={{ maxWidth: "1200px", margin: "0 auto", padding: "30px 40px" }}>
          
          <div className="modern-page-header">
            <div className="header-title-group">
              <h1 style={{ color: "var(--text-dark)", fontSize: "2rem", fontWeight: "800", display: "flex", alignItems: "center", gap: "10px" }}>
                Thư viện của tôi 📚
              </h1>
              <p style={{ color: "var(--text-gray)", marginTop: "5px" }}>Quản lý và theo dõi các bộ thẻ của bạn.</p>
            </div>
            
            <div className="header-actions-group">
              <button 
                className="btn-create-primary" 
                style={{ padding: "12px 20px", fontSize: "0.95rem", whiteSpace: "nowrap" }}
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
                  style={{ backgroundColor: "var(--bg-card)", color: "var(--text-dark)", borderColor: "var(--border)" }}
                />
              </div>
              <select className="modern-sort-select" value={sortOption} onChange={(e) => setSortOption(e.target.value)} style={{ backgroundColor: "var(--bg-card)", color: "var(--text-dark)", borderColor: "var(--border)" }}>
                <option value="name-asc">Sắp xếp: Tên A-Z</option>
                <option value="name-desc">Sắp xếp: Tên Z-A</option>
                <option value="cards-desc">Sắp xếp: Thẻ nhiều nhất</option>
                <option value="cards-asc">Sắp xếp: Thẻ ít nhất</option>
              </select>
            </div>
          </div>

          <div className="modern-tabs-container">
            <button className={`modern-tab ${activeTab === "all" ? "active" : ""}`} onClick={() => setActiveTab("all")}>
              Tất cả
            </button>
            <button className={`modern-tab ${activeTab === "favorite" ? "active" : ""}`} onClick={() => setActiveTab("favorite")}>
              Bộ thẻ yêu thích
            </button>
            <button className={`modern-tab ${activeTab === "ai" ? "active" : ""}`} onClick={() => setActiveTab("ai")}>
              Bộ Thẻ AI
            </button>
          </div>

          <div className="modern-stats-grid">
            <div className="modern-stat-card stat-blue" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}>
              <div className="stat-icon"><i className="fa-solid fa-layer-group"></i></div>
              <div className="stat-info">
                <h2 style={{ color: "var(--text-dark)" }}>{totalDecks}</h2>
                <p style={{ color: "var(--text-gray)" }}>Bộ thẻ {activeTab !== "all" && <span style={{fontSize: "0.75rem", opacity: 0.7}}>({activeTab === 'ai' ? 'AI' : 'Yêu thích'})</span>}</p>
              </div>
            </div>
            <div className="modern-stat-card stat-green" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}>
              <div className="stat-icon"><i className="fa-solid fa-file-lines"></i></div>
              <div className="stat-info">
                <h2 style={{ color: "var(--text-dark)" }}>{totalCards}</h2>
                <p style={{ color: "var(--text-gray)" }}>Thẻ</p>
              </div>
            </div>
            <div className="modern-stat-card stat-orange" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}>
              <div className="stat-icon"><i className="fa-solid fa-clock"></i></div>
              <div className="stat-info">
                <h2 style={{ color: "var(--text-dark)" }}>{totalDue}</h2>
                <p style={{ color: "var(--text-gray)" }}>Cần ôn</p>
              </div>
            </div>
            <div className="modern-stat-card stat-red" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}>
              <div className="stat-icon"><i className="fa-solid fa-circle-exclamation"></i></div>
              <div className="stat-info">
                <h2 style={{ color: "var(--text-dark)" }}>{totalOverdue}</h2>
                <p style={{ color: "var(--text-gray)" }}>Quá hạn</p>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="loading-state" style={{ textAlign: "center", padding: "50px", color: "var(--text-gray)" }}>
              <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: "2rem", margin: "0 auto 15px auto", display: "block" }}></i>
              <p>Đang tải dữ liệu...</p>
            </div>
          ) : sortedDecks.length === 0 ? (
            renderEmptyState()
          ) : (
            <div className="modern-decks-grid">
              {sortedDecks.map((deck) => {
                const isFavorite = favoriteDecks.includes(deck.id);
                
                // Dùng thẳng các biến đã được Map chuẩn xác từ thuật toán ở trên
                const totalCardsCount = deck.totalCards;
                const masteredCount = deck.masteredCount;
                const dueCount = deck.dueCount;
                const overdueCount = deck.overdueCount;
                const progressPercent = totalCardsCount === 0 ? 0 : Math.round((masteredCount / totalCardsCount) * 100);
                
                const isCompleted = totalCardsCount > 0 && progressPercent === 100;
                
                let isNew = false;
                if (deck.createdAt) {
                  const createdTime = new Date(deck.createdAt).getTime();
                  const now = new Date().getTime();
                  const hoursDiff = (now - createdTime) / (1000 * 60 * 60);
                  isNew = hoursDiff <= 24; 
                } else {
                  isNew = totalCardsCount === 0; 
                }

                const originalTitle = deck.title || deck.name || "Bộ thẻ không tên";
                const isAIGenerated = originalTitle.toLowerCase().includes("(ai generated)");
                const displayTitle = isAIGenerated ? originalTitle.replace(/\(ai generated\)/i, "").trim() : originalTitle;

                return (
                  <div className="modern-deck-card" key={deck.id} style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}>
                    <div className="mdc-header">
                      <div className="mdc-icon-wrapper">
                        <div className="mdc-icon"><i className="fa-solid fa-layer-group"></i></div>
                      </div>
                      <div className="mdc-header-right">
                        <div className="mdc-badges">
                          {isCompleted && <span className="badge badge-success">Hoàn thành</span>}
                          {isNew && !isCompleted && <span className="badge badge-new" style={{ background: "#fee2e2", color: "#dc2626" }}>Mới tạo</span>}
                        </div>
                        
                        {isAIGenerated && (
                          <div className="mdc-ai-icon" title="Tạo tự động bằng AI">
                            <i className="fa-solid fa-robot"></i>
                          </div>
                        )}

                        <button 
                          className={`mdc-favorite ${isFavorite ? "active" : ""}`}
                          onClick={(e) => { e.stopPropagation(); toggleFavoriteDeck(deck.id); }}
                          title="Yêu thích"
                        >
                          <i className={isFavorite ? "fa-solid fa-star" : "fa-regular fa-star"}></i>
                        </button>
                      </div>
                    </div>

                    <div className="mdc-body">
                      <h3 className="mdc-title" style={{ color: "var(--text-dark)" }}>{displayTitle}</h3>
                      <div className="mdc-progress-wrapper">
                        <div className="mdc-progress-track" style={{ backgroundColor: "var(--border)" }}>
                          <div className="mdc-progress-fill" style={{ width: `${progressPercent}%`, backgroundColor: isCompleted ? '#10b981' : undefined }}></div>
                        </div>
                        <span className="mdc-progress-text" style={{ color: isCompleted ? '#10b981' : 'var(--text-gray)' }}>{progressPercent}%</span>
                      </div>
                    </div>

                    <div className="mdc-stats-grid-2x2">
                      <div className="mdc-stat-box box-purple" style={{ backgroundColor: "var(--bg-main)", borderColor: "var(--border)" }}>
                        <i className="fa-solid fa-clone"></i>
                        <div className="stat-info">
                          <span className="stat-num" style={{ color: "var(--text-dark)" }}>{totalCardsCount}</span>
                          <span className="stat-label">Thẻ</span>
                        </div>
                      </div>
                      <div className="mdc-stat-box box-green" style={{ backgroundColor: "var(--bg-main)", borderColor: "var(--border)" }}>
                        <i className="fa-solid fa-check-square"></i>
                        <div className="stat-info">
                          <span className="stat-num" style={{ color: "var(--text-dark)" }}>{masteredCount}</span>
                          <span className="stat-label">Đã học</span>
                        </div>
                      </div>
                      <div className="mdc-stat-box box-orange" style={{ backgroundColor: "var(--bg-main)", borderColor: "var(--border)" }}>
                        <i className="fa-solid fa-clock"></i>
                        <div className="stat-info">
                          <span className="stat-num" style={{ color: "var(--text-dark)" }}>{dueCount}</span>
                          <span className="stat-label">Cần ôn</span>
                        </div>
                      </div>
                      <div className="mdc-stat-box box-red" style={{ backgroundColor: "var(--bg-main)", borderColor: "var(--border)" }}>
                        <i className="fa-solid fa-circle-exclamation"></i>
                        <div className="stat-info">
                          <span className="stat-num" style={{ color: "var(--text-dark)" }}>{overdueCount}</span>
                          <span className="stat-label">Quá hạn</span>
                        </div>
                      </div>
                    </div>

                    <div className={`mdc-cram-compact ${deck.is_cram_active ? "active" : ""}`} style={{ backgroundColor: "var(--bg-main)", borderColor: deck.is_cram_active ? "var(--primary)" : "var(--border)" }} onClick={() => openCramModal(deck)}>
                      <div className="cram-left">
                        <i className="fa-solid fa-bolt"></i>
                        <span style={{ color: "var(--text-dark)" }}>Cram Mode</span>
                      </div>
                      <div className="cram-right">
                        <span className="cram-status">{deck.is_cram_active ? "Bật" : "Tắt"}</span>
                        <div className="compact-switch"></div>
                      </div>
                    </div>

                    <div className="mdc-footer">
                      <button className="mdc-btn-study" onClick={() => handleStudyClick(deck.id)}>
                        Ôn luyện
                      </button>
                      <button className="mdc-btn-settings" style={{ backgroundColor: "var(--bg-main)", color: "var(--text-gray)" }} onClick={() => openManageModal(deck)} title="Cài đặt bộ thẻ">
                        <i className="fa-solid fa-gear"></i>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* MODAL VƯỢT RÀO */}
      {forceModal.isOpen && (
        <div className="cram-modal-overlay" style={{ zIndex: 1000 }}>
          <div className="cram-modal" style={{ textAlign: "center", padding: "40px 30px", maxWidth: "420px" }}>
            <div style={{ fontSize: "3.5rem", margin: "0 auto 20px auto", display: "inline-block", background: "rgba(16, 185, 129, 0.1)", padding: "15px", borderRadius: "50%" }}>
              ✨
            </div>
            <h3 style={{ color: "var(--text-dark)", fontSize: "1.5rem", margin: "0 0 15px 0", fontWeight: "800" }}>Tuyệt vời!</h3>
            <p style={{ color: "var(--text-gray)", lineHeight: "1.6", margin: "0 0 30px 0", fontSize: "1.05rem" }}>
              Cậu đã học xong bài môn này rồi!<br/>Cậu có muốn <strong>'vượt rào'</strong> ôn trước các thẻ chưa đến hạn không?
            </p>
            <div style={{ display: "flex", gap: "15px", justifyContent: "center" }}>
              <button 
                style={{ flex: 1, padding: "14px", background: "var(--bg-main)", border: "1px solid var(--border)", borderRadius: "12px", color: "var(--text-dark)", fontWeight: "600", cursor: "pointer", transition: "all 0.2s" }}
                onClick={() => setForceModal({ isOpen: false, deckId: null })}
              >
                Để sau
              </button>
              <button 
                style={{ flex: 1, padding: "14px", background: "var(--primary)", border: "none", borderRadius: "12px", color: "white", fontWeight: "700", cursor: "pointer", transition: "all 0.2s" }}
                onClick={() => {
                  const targetDeckId = forceModal.deckId;
                  setForceModal({ isOpen: false, deckId: null });
                  if (onStudy) onStudy(targetDeckId, true);
                  else if (onNavigate) onNavigate("review", `${targetDeckId}?force=true`);
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

      {/* KÍCH HOẠT RE-FETCH KHI ĐÓNG QUẢN LÝ */}
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