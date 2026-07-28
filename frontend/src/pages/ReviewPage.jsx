// frontend/src/pages/ReviewPage.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import Sidebar from "../components/Layout/Sidebar";
import CramModeModal from "../components/Modals/ManageDeckModal"; 
import Button from "../components/common/Button";
import api from "../services/api"; 
import "./ReviewPage.css";

// =====================================================================
// COMPONENT 1: GIAO DIỆN LẬT THẺ (ACTIVE STUDY SESSION)
// =====================================================================
const ActiveStudySession = ({ deckId, forceReview, onFinish }) => {
  const [cards, setCards] = useState([]);
  const [initialTotal, setInitialTotal] = useState(0);
  const [sessionStats, setSessionStats] = useState({ passed: 0, forgotten: 0 });
  const [isSessionFinished, setIsSessionFinished] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false); 

  const actualDeckId = String(deckId).split('?')[0];
  const isForce = String(deckId).includes('force=true') || forceReview;

  const pendingRequests = useRef([]); 

  const [currentIndex, setCurrentIndex] = useState(() => {
    const savedIndex = localStorage.getItem(`review_progress_${actualDeckId}`);
    return savedIndex ? parseInt(savedIndex, 10) : 0;
  });

  const [isFlipped, setIsFlipped] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [startTime, setStartTime] = useState(Date.now());

  const handleReviewAllAgain = async () => {
    setIsLoading(true);
    setIsSessionFinished(false);
    setErrorMsg(null);
    setCards([]);
    setCurrentIndex(0);
    setSessionStats({ passed: 0, forgotten: 0 });
    localStorage.removeItem(`review_progress_${actualDeckId}`);

    try {
      const todayString = new Date().toISOString();
      const t = new Date().getTime(); 
      const response = await api.get(`/study/deck/${actualDeckId}/due-cards?force=true&currentDate=${encodeURIComponent(todayString)}&t=${t}`);
      
      const loadedCards = response.data || [];
      setCards(loadedCards);
      setInitialTotal(loadedCards.length);
    } catch (err) {
      console.error("Lỗi khi tải lại danh sách thẻ:", err);
      setErrorMsg("Đã xảy ra sự cố trong quá trình tải dữ liệu.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const fetchDueCards = async () => {
      try {
        const todayString = new Date().toISOString();
        const t = new Date().getTime(); 
        const endpoint = isForce
          ? `/study/deck/${actualDeckId}/due-cards?force=true&currentDate=${encodeURIComponent(todayString)}&t=${t}`
          : `/study/deck/${actualDeckId}/due-cards?currentDate=${encodeURIComponent(todayString)}&t=${t}`;

        const response = await api.get(endpoint);
        const loadedCards = response.data || [];
        
        setCards(loadedCards);
        setInitialTotal(loadedCards.length);

        const savedIndex = localStorage.getItem(`review_progress_${actualDeckId}`);
        if (savedIndex) {
          setSessionStats({ passed: parseInt(savedIndex, 10), forgotten: 0 });
        }
      } catch (error) {
        console.error("Lỗi khi tải dữ liệu:", error);
        setErrorMsg("Mất kết nối với máy chủ. Vui lòng thử lại sau.");
      } finally {
        setIsLoading(false);
      }
    };

    if (actualDeckId) fetchDueCards();
  }, [actualDeckId, isForce]);

  useEffect(() => {
    if (actualDeckId && cards.length > 0 && !isSessionFinished) {
      localStorage.setItem(`review_progress_${actualDeckId}`, currentIndex);
    }
  }, [currentIndex, actualDeckId, cards.length, isSessionFinished]);

  useEffect(() => {
    setIsFlipped(false);
    setStartTime(Date.now());
  }, [currentIndex]);

  const handleRating = async (rating) => {
    const currentCard = cards[currentIndex];
    const durationMs = Date.now() - startTime;

    const req = api.post("/study/review", {
      flashcard_id: currentCard.id,
      rating: rating,
      duration_ms: durationMs > 500 ? durationMs : 500, 
    }).catch((err) => console.error("Lỗi đồng bộ dữ liệu ngầm:", err));
    
    pendingRequests.current.push(req);

    if (rating === 1) {
      setSessionStats((prev) => ({ ...prev, forgotten: prev.forgotten + 1 }));
      setCards(prevCards => [...prevCards, currentCard]); 
    } else {
      setSessionStats((prev) => ({ ...prev, passed: prev.passed + 1 }));
    }

    if (currentIndex < cards.length - 1) {
      setIsFlipped(false);
      setTimeout(() => {
        setCurrentIndex((prev) => prev + 1);
      }, 150);
    } else {
      localStorage.removeItem(`review_progress_${actualDeckId}`);
      setIsSessionFinished(true);
    }
  };

  const handleFinishSession = async () => {
    setIsSyncing(true);
    await Promise.allSettled(pendingRequests.current); 
    setIsSyncing(false);
    if (onFinish) onFinish();
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isSessionFinished || isSyncing) return;
      if (e.code === "Space") {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      }
      if (isFlipped) {
        switch (e.key) {
          case "1": handleRating(1); break;
          case "2": handleRating(2); break;
          case "3": handleRating(3); break;
          case "4": handleRating(4); break;
          default: break;
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFlipped, currentIndex, cards, startTime, isSessionFinished, isSyncing]);

  if (isLoading) return <div style={{ padding: "50px", textAlign: "center", color: "var(--text-gray)" }}>Đang tải dữ liệu...</div>;

  if (errorMsg || cards.length === 0) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "80vh" }}>
        <div style={{ background: "var(--bg-card)", padding: "40px", borderRadius: "16px", boxShadow: "0 10px 25px rgba(0,0,0,0.1)", textAlign: "center", maxWidth: "500px", width: "100%", border: "1px solid var(--border)" }}>
          {errorMsg ? (
            <>
              <h2 style={{ color: "#ef4444", fontSize: "1.5rem", marginBottom: "15px" }}>Đã xảy ra sự cố</h2>
              <p style={{ color: "var(--text-gray)", fontSize: "1rem", lineHeight: "1.5", marginBottom: "30px" }}>{errorMsg}</p>
              <button onClick={onFinish} style={{ padding: "12px 24px", cursor: "pointer", background: "var(--primary)", color: "white", border: "none", borderRadius: "8px", fontWeight: "bold" }}>Trở về Trang chủ</button>
            </>
          ) : (
            <>
              <div style={{ fontSize: "3rem", marginBottom: "20px" }}>🏆</div>
              <h2 style={{ color: "var(--text-dark)", fontSize: "1.5rem", marginBottom: "15px", fontWeight: "bold" }}>Đã hoàn thành mục tiêu</h2>
              <p style={{ color: "var(--text-gray)", fontSize: "1rem", lineHeight: "1.5", marginBottom: "30px" }}>Hiện tại không còn thẻ nào đến hạn ôn tập trong hôm nay. Bạn có muốn tiếp tục ôn tập lại toàn bộ danh sách thẻ không?</p>
              <div style={{ display: "flex", gap: "15px", justifyContent: "center" }}>
                <button onClick={onFinish} style={{ flex: 1, padding: "12px", cursor: "pointer", background: "var(--bg-main)", color: "var(--text-gray)", border: "1px solid var(--border)", borderRadius: "8px", fontWeight: "bold", transition: "all 0.2s" }}>Trở về Ôn tập</button>
                <button onClick={handleReviewAllAgain} style={{ flex: 1, padding: "12px", cursor: "pointer", background: "var(--primary)", color: "white", border: "none", borderRadius: "8px", fontWeight: "bold", transition: "all 0.2s" }}>Tiếp tục học</button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  if (isSessionFinished) {
    return (
      <div className="review-page-container" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "80vh" }}>
        <div style={{ background: "var(--bg-card)", padding: "40px", borderRadius: "20px", boxShadow: "0 10px 30px rgba(0,0,0,0.08)", textAlign: "center", maxWidth: "450px", width: "100%", border: "1px solid var(--border)" }}>
          <h2 style={{ color: "#10b981", fontSize: "2rem", marginBottom: "15px", fontWeight: "bold" }}>Hoàn thành phiên học</h2>
          <p style={{ color: "var(--text-gray)", fontSize: "1.1rem", marginBottom: "30px" }}>Bạn đã xem xét xong {initialTotal} thẻ độc lập.</p>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "20px", marginBottom: "35px" }}>
             <div style={{ flex: 1, background: "rgba(16, 185, 129, 0.1)", padding: "20px", borderRadius: "16px", border: "1px solid rgba(16, 185, 129, 0.2)" }}>
                 <div style={{ fontSize: "2.5rem", fontWeight: "900", color: "#10b981" }}>{sessionStats.passed}</div>
                 <div style={{ color: "#059669", fontSize: "0.95rem", fontWeight: "700", marginTop: "5px" }}>Đánh giá Tốt/Dễ</div>
             </div>
             <div style={{ flex: 1, background: "rgba(239, 68, 68, 0.1)", padding: "20px", borderRadius: "16px", border: "1px solid rgba(239, 68, 68, 0.2)" }}>
                 <div style={{ fontSize: "2.5rem", fontWeight: "900", color: "#ef4444" }}>{sessionStats.forgotten}</div>
                 <div style={{ color: "#b91c1c", fontSize: "0.95rem", fontWeight: "700", marginTop: "5px" }}>Lần bấm Quên</div>
             </div>
          </div>
          <button 
             onClick={handleFinishSession} 
             disabled={isSyncing}
             style={{ width: "100%", padding: "16px", background: "#3b82f6", color: "white", border: "none", borderRadius: "12px", fontWeight: "bold", fontSize: "1.1rem", cursor: isSyncing ? "wait" : "pointer", transition: "all 0.2s", opacity: isSyncing ? 0.7 : 1 }}
          >
            {isSyncing ? "Đang đồng bộ..." : "Tiếp tục Ôn tập"}
          </button>
        </div>
      </div>
    );
  }

  if (currentIndex >= cards.length) return null;

  const currentCard = cards[currentIndex];
  const displayProgress = Math.min(currentIndex + 1, initialTotal);

  return (
    <div className="review-page-container">
      <div className="review-header">
        <button className="btn-back" onClick={onFinish}>← Quay lại</button>
        <div className="progress-bar">Tiến độ: {displayProgress} / {initialTotal}</div>
      </div>
      <div className={`flashcard-container ${isFlipped ? "flipped" : ""}`} onClick={() => setIsFlipped(!isFlipped)}>
        <div className="card-face card-front">
          <h3>{currentCard.question || currentCard.front_content}</h3>
          {!isFlipped && <p className="hint-text">(Nhấn Phím Cách hoặc Click để xem đáp án)</p>}
        </div>
        <div className="card-face card-back">
          <p className="answer-text">{currentCard.answer || currentCard.back_content}</p>
        </div>
      </div>
      <div className="rating-section">
        {isFlipped ? (
          <>
            <div className="rating-title">Đánh giá mức độ ghi nhớ</div>
            <div className="rating-buttons">
              <button className="btn-rating btn-again" onClick={() => handleRating(1)}>Quên <span className="key-hint">[Phím 1]</span></button>
              <button className="btn-rating btn-hard" onClick={() => handleRating(2)}>Khó <span className="key-hint">[Phím 2]</span></button>
              <button className="btn-rating btn-good" onClick={() => handleRating(3)}>Tốt <span className="key-hint">[Phím 3]</span></button>
              <button className="btn-rating btn-easy" onClick={() => handleRating(4)}>Dễ <span className="key-hint">[Phím 4]</span></button>
            </div>
          </>
        ) : (
          <div style={{ color: "var(--text-gray)", fontStyle: "italic", textAlign: "center" }}>Lật thẻ để hiển thị lựa chọn...</div>
        )}
      </div>
    </div>
  );
};


// =====================================================================
// COMPONENT 2: GIAO DIỆN DASHBOARD TỔNG QUAN ÔN TẬP (NẰM NGANG)
// =====================================================================
const ReviewDashboard = ({ onNavigate }) => {
  const [decks, setDecks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMode, setFilterMode] = useState("all"); 
  const [sortMode, setSortMode] = useState("newest");
  
  const [isCramModalOpen, setIsCramModalOpen] = useState(false);
  const [selectedDeck, setSelectedDeck] = useState(null);
  const [forceModal, setForceModal] = useState({ isOpen: false, deck: null });

  const fetchDecksData = useCallback(async () => {
    try {
      const todayString = new Date().toISOString().split('T')[0];
      const t = new Date().getTime(); 
      
      const [decksRes, summaryRes] = await Promise.all([
        api.get(`/decks?t=${t}`),
        api.get(`/dashboard/summary?currentDate=${encodeURIComponent(todayString)}&t=${t}`).catch(() => null)
      ]);

      let rawDecks = decksRes.success ? (decksRes.data || []) : (Array.isArray(decksRes) ? decksRes : []);
      const summaryData = (summaryRes && summaryRes.success !== false) ? (summaryRes.data || summaryRes) : null;
      const summaryDecks = summaryData?.decks || [];

      const augmentedDecks = rawDecks.map(deck => {
        const sDeck = summaryDecks.find(sd => sd.id === deck.id) || {};
        
        const totalCards = sDeck.totalCards ?? sDeck._count?.Flashcards ?? deck.totalCards ?? deck.cards?.length ?? deck._count?.Flashcards ?? 0;
        let dueCount = sDeck.dueCount ?? sDeck.dueCards ?? deck.dueCount ?? deck.dueCards ?? 0;
        let masteredCount = sDeck.masteredCount ?? sDeck.masteredCards ?? deck.masteredCount ?? deck.masteredCards ?? 0;
        let overdueCount = sDeck.overdueCount ?? deck.overdueCount ?? 0;
        
        if (masteredCount === 0 && totalCards > 0) {
          masteredCount = Math.max(0, totalCards - dueCount - overdueCount);
        }

        const cramSettingsStr = localStorage.getItem(`cram_settings_${deck.id}`);
        let isCramActive = deck.is_cram_active || false;
        let activeExamDate = deck.exam_date || null;
        let isDeckOverdue = false;

        if (cramSettingsStr) {
          isCramActive = true; 
          try {
            const settings = JSON.parse(cramSettingsStr);
            if (settings.examDate) {
              activeExamDate = settings.examDate;
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const exam = new Date(settings.examDate);
              exam.setHours(0, 0, 0, 0);
              if (today > exam) {
                isDeckOverdue = true; 
              }
            }
          } catch(e){}
        }

        let daysLeft = null;
        if (activeExamDate) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const exam = new Date(activeExamDate);
          exam.setHours(0, 0, 0, 0);
          const diff = Math.ceil((exam - today) / (1000 * 60 * 60 * 24));
          daysLeft = diff > 0 ? diff : 0;
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
          examDateToUse: activeExamDate,
          daysLeft
        };
      });

      setDecks(augmentedDecks);
    } catch (error) {
      console.error("Lỗi khi tải bộ thẻ:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDecksData();
  }, [fetchDecksData]);

  const openCramModal = (deck) => {
    setSelectedDeck(deck);
    setIsCramModalOpen(true);
  };

  const handleStudyClick = (deckId) => {
    const targetDeck = decks.find(d => d.id === deckId);
    if (!targetDeck) return;

    if (targetDeck.totalCards === 0) {
      if (onNavigate) onNavigate("create"); 
      return;
    }

    if (targetDeck.dueCount === 0) {
      setForceModal({ isOpen: true, deck: targetDeck });
    } else {
      if (onNavigate) onNavigate("review", deckId);
    }
  };

  const totalDecks = decks.length;
  const totalCards = decks.reduce((sum, d) => sum + (d.totalCards || 0), 0);
  const totalDue = decks.reduce((sum, d) => sum + (d.dueCount || 0), 0);
  const totalOverdue = decks.reduce((sum, d) => sum + (d.overdueCount || 0), 0); 

  let displayDecks = decks.filter(d => (d.title || d.name || "").toLowerCase().includes(searchTerm.toLowerCase()));
  if (filterMode === 'due') displayDecks = displayDecks.filter(d => d.dueCount > 0);
  if (filterMode === 'overdue') displayDecks = displayDecks.filter(d => d.overdueCount > 0); 
  if (filterMode === 'cram') displayDecks = displayDecks.filter(d => d.is_cram_active);

  // 👉 ĐÃ SỬA: Ưu tiên đưa các bộ thẻ đang bật Cram Mode lên vị trí đầu tiên
  displayDecks.sort((a, b) => {
    const aCram = a.is_cram_active ? 1 : 0;
    const bCram = b.is_cram_active ? 1 : 0;
    if (aCram !== bCram) return bCram - aCram; // Đưa Cram Mode lên trên cùng

    if (sortMode === "priority") {
      return b.dueCount - a.dueCount;
    }
    const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
    const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
    return dateB - dateA;
  });

  const renderEmptyState = () => {
    if (filterMode === 'due') return (
      <div className="modern-empty-state" style={{ marginTop: "40px" }}>
        <div className="empty-illustration"><i className="fa-solid fa-champagne-glasses" style={{color: "#10b981"}}></i></div>
        <h2 style={{ color: "var(--text-dark)" }}>Tuyệt vời!</h2>
        <p style={{ color: "var(--text-gray)" }}>Bạn đã hoàn thành toàn bộ mục tiêu ôn tập của ngày hôm nay.</p>
      </div>
    );
    if (filterMode === 'overdue') return (
      <div className="modern-empty-state" style={{ marginTop: "40px" }}>
        <div className="empty-illustration"><i className="fa-solid fa-face-smile-wink" style={{color: "#3b82f6"}}></i></div>
        <h2 style={{ color: "var(--text-dark)" }}>Không có thẻ bị trễ</h2>
        <p style={{ color: "var(--text-gray)" }}>Bạn đang duy trì tiến độ học tập rất tốt. Hãy tiếp tục phát huy nhé!</p>
      </div>
    );
    if (filterMode === 'cram') return (
      <div className="modern-empty-state" style={{ marginTop: "40px" }}>
        <div className="empty-illustration"><i className="fa-solid fa-bolt" style={{color: "#f59e0b"}}></i></div>
        <h2 style={{ color: "var(--text-dark)" }}>Chưa có thẻ Cấp Tốc</h2>
        <p style={{ color: "var(--text-gray)" }}>Bật chế độ Cram Mode để nhồi nhét kiến thức trước kỳ thi.</p>
      </div>
    );
    return (
      <div className="modern-empty-state" style={{ marginTop: "40px" }}>
        <div className="empty-illustration"><i className="fa-solid fa-box-open" style={{color: "var(--border)"}}></i></div>
        <h2 style={{ color: "var(--text-dark)" }}>Không có bộ thẻ nào</h2>
        <p style={{ color: "var(--text-gray)" }}>Tạo bộ thẻ mới để bắt đầu hành trình học tập ngay!</p>
        <button className="btn-create-primary" onClick={() => onNavigate("create")}>+ Tạo bộ thẻ ngay</button>
      </div>
    );
  };

  return (
    <div className="dashboard-layout">
      <Sidebar currentView="review" onNavigate={onNavigate} />
      <main className="dashboard-content scrollable-content" style={{ backgroundColor: "var(--bg-main)" }}>
        <div className="page-wrapper" style={{ maxWidth: "1300px", margin: "0 auto", padding: "30px 40px" }}>
          
          <div className="modern-page-header">
            <div className="header-title-group">
              <h1 style={{ color: "var(--text-dark)", fontSize: "2rem", fontWeight: "800", display: "flex", alignItems: "center", gap: "10px" }}>
                Ôn tập 🧠
              </h1>
              <p style={{ color: "var(--text-gray)", marginTop: "5px" }}>Tiếp tục học với các bộ thẻ đến hạn hôm nay.</p>
            </div>
            
            <div className="header-actions-group"></div>
          </div>

          <div className="modern-stats-grid">
            <div className="modern-stat-card stat-blue" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}>
              <div className="stat-icon"><i className="fa-solid fa-layer-group"></i></div>
              <div className="stat-info">
                <h2 style={{ color: "var(--text-dark)" }}>{totalDecks}</h2>
                <p style={{ color: "var(--text-gray)" }}>Bộ thẻ</p>
              </div>
            </div>
            <div className="modern-stat-card stat-green" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}>
              <div className="stat-icon"><i className="fa-solid fa-file-lines"></i></div>
              <div className="stat-info">
                <h2 style={{ color: "var(--text-dark)" }}>{totalCards}</h2>
                <p style={{ color: "var(--text-gray)" }}>Flashcards</p>
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

          <div className="modern-tabs-container">
            <button className={`modern-tab ${filterMode === 'all' ? "active" : ""}`} onClick={() => setFilterMode('all')}>Tất cả</button>
            <button className={`modern-tab ${filterMode === 'due' ? "active" : ""}`} onClick={() => setFilterMode('due')}>Đến hạn</button>
            <button className={`modern-tab ${filterMode === 'overdue' ? "active" : ""}`} onClick={() => setFilterMode('overdue')}>Quá hạn</button>
            <button className={`modern-tab ${filterMode === 'cram' ? "active" : ""}`} onClick={() => setFilterMode('cram')}>Cấp tốc</button>
          </div>

          {isLoading ? (
            <div className="loading-state" style={{ textAlign: "center", padding: "50px", color: "var(--text-gray)" }}>
              <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: "2rem", margin: "0 auto 15px auto", display: "block" }}></i>
              <p>Đang tải dữ liệu...</p>
            </div>
          ) : displayDecks.length === 0 ? (
            renderEmptyState()
          ) : (
            <div className="review-list-container" style={{ display: "flex", flexDirection: "column", gap: "20px", paddingBottom: "50px" }}>
              {displayDecks.map(deck => {
                const total = deck.totalCards || 0;
                const due = deck.dueCount || 0;
                const mastered = deck.masteredCount || 0;
                const progress = total === 0 ? 0 : Math.round((mastered / total) * 100);
                const isCompleted = total > 0 && due === 0;

                const originalTitle = deck.title || deck.name || "Bộ thẻ không tên";
                const isAIGenerated = originalTitle.toLowerCase().includes("(ai generated)");
                const displayTitle = isAIGenerated ? originalTitle.replace(/\(ai generated\)/i, "").trim() : originalTitle;

                let btnText = "Ôn tập";
                
                if (deck.is_cram_active) {
                  btnText = "🔥 Vào lò luyện";
                } else if (total === 0) {
                  btnText = "Thêm thẻ";
                } else if (isCompleted) {
                  btnText = "👁 Xem lại";
                }

                return (
                  <div 
                    key={deck.id} 
                    className="review-list-item" 
                    style={{ 
                      backgroundColor: "var(--bg-card)", 
                      borderColor: deck.is_cram_active ? "#f59e0b" : "var(--border)", 
                      borderWidth: deck.is_cram_active ? "1.5px" : "1px", 
                      borderStyle: "solid",
                      borderRadius: "16px",
                      padding: "20px 25px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "20px",
                      boxShadow: "0 4px 15px rgba(0, 0, 0, 0.02)",
                      transition: "all 0.2s ease"
                    }}
                  >
                    <div className="rli-col-main" style={{ flex: 1 }}>
                      <div className="rli-title-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <h3 style={{ color: "var(--text-dark)", margin: 0, fontWeight: "800", fontSize: "1.2rem" }}>{displayTitle}</h3>
                          {isAIGenerated && (
                            <i className="fa-solid fa-robot" title="Tạo bằng AI" style={{ color: "#a855f7", fontSize: "1.1rem" }}></i>
                          )}
                        </div>
                        <div className="rli-badges" style={{ display: "flex", gap: "8px" }}>
                          {deck.is_cram_active && <span className="badge-cram" style={{ background: "rgba(245, 158, 11, 0.15)", color: "#d97706", padding: "4px 10px", borderRadius: "20px", fontSize: "0.75rem", fontWeight: "700" }}>🔥 CẤP TỐC</span>}
                          {isCompleted && !deck.is_cram_active && <span className="badge-done" style={{ background: "#dcfce7", color: "#166534", padding: "4px 10px", borderRadius: "20px", fontSize: "0.75rem", fontWeight: "700" }}><i className="fa-solid fa-check"></i> Hoàn thành</span>}
                        </div>
                      </div>
                      
                      <div className="rli-progress-wrapper" style={{ display: "flex", alignItems: "center", gap: "15px", margin: "12px 0" }}>
                        <div className="rli-progress-track" style={{ flex: 1, height: "8px", background: "var(--border)", borderRadius: "10px", overflow: "hidden" }}>
                          <div className="rli-progress-fill" style={{ height: "100%", width: `${progress}%`, background: isCompleted ? '#10b981' : 'var(--primary)' }}></div>
                        </div>
                        <span className="rli-progress-text" style={{ fontWeight: "800", color: isCompleted ? '#10b981' : 'var(--text-dark)', fontSize: "0.95rem" }}>{progress}%</span>
                      </div>

                      <div className="rli-stats-row" style={{ display: "flex", gap: "25px", color: "var(--text-gray)", fontSize: "0.9rem" }}>
                        <div className="stat-item"><i className="fa-solid fa-file-lines" style={{color: '#8b5cf6'}}></i> <strong style={{color: "var(--text-dark)"}}>{total}</strong> Thẻ</div>
                        <div className="stat-item"><i className="fa-solid fa-book-open" style={{color: '#10b981'}}></i> <strong style={{color: "var(--text-dark)"}}>{mastered}</strong> Đã học</div>
                        <div className="stat-item"><i className="fa-solid fa-clock" style={{color: '#f59e0b'}}></i> <strong style={{color: "var(--text-dark)"}}>{due}</strong> Cần ôn</div>
                      </div>
                    </div>

                    <div className="rli-col-exam" style={{ display: "flex", alignItems: "center", gap: "10px", color: "var(--text-gray)", fontSize: "0.9rem", minWidth: "140px", borderLeft: "1px solid var(--border)", borderRight: "1px solid var(--border)", padding: "0 20px" }}>
                      {deck.examDateToUse ? (
                        <>
                          <i className="fa-regular fa-calendar" style={{ fontSize: "1.3rem", color: "#f59e0b" }}></i>
                          <div>
                            <span className="exam-days-left" style={{ fontWeight: "700", color: "#d97706" }}>Thi sau {deck.daysLeft} ngày</span><br/>
                            <span className="exam-date" style={{ fontSize: "0.8rem" }}>{new Date(deck.examDateToUse).toLocaleDateString('vi-VN')}</span>
                          </div>
                        </>
                      ) : (
                        <span style={{color: 'var(--border)'}}>Không có lịch thi</span>
                      )}
                    </div>

                    <div className="rli-col-actions" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <button 
                        className="rli-study-btn"
                        style={deck.is_cram_active ? { background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)", color: "white", border: "none", padding: "12px 22px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", boxShadow: "0 4px 10px rgba(245, 158, 11, 0.3)", whiteSpace: "nowrap" } : { background: "var(--primary)", color: "white", border: "none", padding: "12px 22px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", whiteSpace: "nowrap" }}
                        onClick={() => {
                          if (deck.is_cram_active) {
                            if (onNavigate) onNavigate("cram-review", deck.id);
                          } else {
                            handleStudyClick(deck.id);
                          }
                        }}
                      >
                        {btnText}
                      </button>
                      
                      <button 
                        style={{ background: deck.is_cram_active ? "rgba(245, 158, 11, 0.15)" : "var(--bg-main)", border: "1px solid var(--border)", color: deck.is_cram_active ? "#f59e0b" : "var(--text-gray)", width: "42px", height: "42px", borderRadius: "10px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}
                        onClick={() => openCramModal(deck)}
                        title="Bật/Tắt Cram Mode"
                      >
                        <i className="fa-solid fa-bolt"></i>
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
                onClick={() => setForceModal({ isOpen: false, deck: null })}
              >
                Để sau
              </button>
              <button 
                style={{ flex: 1, padding: "14px", background: "var(--primary)", border: "none", borderRadius: "12px", color: "white", fontWeight: "700", cursor: "pointer", transition: "all 0.2s" }}
                onClick={() => {
                  const targetDeckId = forceModal.deck.id;
                  setForceModal({ isOpen: false, deck: null });
                  if (onNavigate) onNavigate("review", `${targetDeckId}?force=true`);
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
    </div>
  );
};

// =====================================================================
// BỘ ĐIỀU HƯỚNG CHÍNH CỦA TRANG (ROUTER)
// =====================================================================
const ReviewPage = ({ deckId, forceReview = false, onFinish, onNavigate }) => {
  if (!deckId) {
    return <ReviewDashboard onNavigate={onNavigate} />;
  }
  return <ActiveStudySession deckId={deckId} forceReview={forceReview} onFinish={onFinish} />;
};

export default ReviewPage;