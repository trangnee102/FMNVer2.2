// frontend/src/pages/ReviewPage.jsx
import React, { useState, useEffect, useRef } from "react";
import Sidebar from "../components/Layout/Sidebar";
import StatCard from "../components/Cards/StatCard";
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
  const [isSyncing, setIsSyncing] = useState(false); // 👉 State chờ đồng bộ mượt mà

  const actualDeckId = String(deckId).split('?')[0];
  const isForce = String(deckId).includes('force=true') || forceReview;

  const pendingRequests = useRef([]); // 👉 Hàng đợi lưu trữ các request gửi lên Server

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
      const t = new Date().getTime(); // Ép bỏ cache
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
        const t = new Date().getTime(); // Bắt buộc lấy dữ liệu tươi nhất
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

    // 👉 ĐÃ SỬA: Đưa request vào hàng đợi để chắc chắn không mất dữ liệu thời gian học
    const req = api.post("/study/review", {
      flashcard_id: currentCard.id,
      rating: rating,
      duration_ms: durationMs > 500 ? durationMs : 500, // Đảm bảo tốn ít nhất 0.5s để hệ thống ghi nhận
    }).catch((err) => console.error("Lỗi đồng bộ dữ liệu ngầm:", err));
    
    pendingRequests.current.push(req);

    if (rating === 1) {
      setSessionStats((prev) => ({ ...prev, forgotten: prev.forgotten + 1 }));
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

  // 👉 ĐÃ SỬA: Đợi API lưu xong 100% rồi mới cho thoát, tránh lỗi 0 phút bên Thống kê
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

  // 👉 ĐÃ SỬA: Giao diện kết thúc học tập siêu mượt và chuyên nghiệp (Giống y hệt bản thiết kế)
  if (isSessionFinished) {
    return (
      <div className="review-page-container" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "80vh" }}>
        <div style={{ background: "var(--bg-card)", padding: "40px", borderRadius: "20px", boxShadow: "0 10px 30px rgba(0,0,0,0.08)", textAlign: "center", maxWidth: "450px", width: "100%", border: "1px solid var(--border)" }}>
          <h2 style={{ color: "#10b981", fontSize: "2rem", marginBottom: "15px", fontWeight: "bold" }}>Hoàn thành phiên học</h2>
          <p style={{ color: "var(--text-gray)", fontSize: "1.1rem", marginBottom: "30px" }}>Bạn đã xem xét xong {initialTotal} thẻ.</p>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "20px", marginBottom: "35px" }}>
             <div style={{ flex: 1, background: "rgba(16, 185, 129, 0.1)", padding: "20px", borderRadius: "16px", border: "1px solid rgba(16, 185, 129, 0.2)" }}>
                 <div style={{ fontSize: "2.5rem", fontWeight: "900", color: "#10b981" }}>{sessionStats.passed}</div>
                 <div style={{ color: "#059669", fontSize: "0.95rem", fontWeight: "700", marginTop: "5px" }}>Thẻ đã nhớ</div>
             </div>
             <div style={{ flex: 1, background: "rgba(239, 68, 68, 0.1)", padding: "20px", borderRadius: "16px", border: "1px solid rgba(239, 68, 68, 0.2)" }}>
                 <div style={{ fontSize: "2.5rem", fontWeight: "900", color: "#ef4444" }}>{sessionStats.forgotten}</div>
                 <div style={{ color: "#b91c1c", fontSize: "0.95rem", fontWeight: "700", marginTop: "5px" }}>Thẻ đã quên</div>
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
// COMPONENT 2: GIAO DIỆN DASHBOARD TỔNG QUAN ÔN TẬP
// =====================================================================
const ReviewDashboard = ({ onNavigate }) => {
  const [decks, setDecks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMode, setFilterMode] = useState("all"); 
  const [sortMode, setSortMode] = useState("newest");
  const [openMenuId, setOpenMenuId] = useState(null); 
  
  // 👉 Custom Modal cho vụ "Vượt rào"
  const [forceModal, setForceModal] = useState({ isOpen: false, deck: null });

  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 👉 ĐÃ SỬA: Ép loại bỏ cache mỗi lần Component này hiện lên
  useEffect(() => {
    const fetchDecksData = async () => {
      try {
        const todayString = new Date().toISOString();
        const t = new Date().getTime(); // Timestamp phá vỡ Cache của Browser
        
        const [decksRes, summaryRes] = await Promise.all([
          api.get(`/decks?t=${t}`),
          api.get(`/dashboard/summary?currentDate=${encodeURIComponent(todayString)}&t=${t}`).catch(() => null)
        ]);

        let rawDecks = [];
        if (decksRes.success) {
          rawDecks = decksRes.data || [];
        }

        if (summaryRes && summaryRes.success !== false) {
          const summaryData = summaryRes.data || summaryRes;
          if (summaryData.decks) {
            rawDecks = rawDecks.map(deck => {
              const summaryDeck = summaryData.decks.find(sd => sd.id === deck.id);
              if (summaryDeck) {
                return {
                  ...deck,
                  dueCount: summaryDeck.dueCount ?? summaryDeck.dueCards ?? deck.dueCount ?? 0,
                  totalCards: summaryDeck.totalCards ?? summaryDeck._count?.Flashcards ?? deck.totalCards ?? 0,
                  masteredCount: summaryDeck.masteredCount ?? summaryDeck.masteredCards ?? deck.masteredCount ?? 0,
                  overdueCount: summaryDeck.overdueCount ?? deck.overdueCount ?? 0
                };
              }
              return deck;
            });
          }
        }

        const augmentedDecks = rawDecks.map(deck => {
          const savedSettings = JSON.parse(localStorage.getItem(`cram_settings_${deck.id}`));
          
          let activeExamDate = null;
          if (savedSettings && savedSettings.examDate) {
            activeExamDate = savedSettings.examDate;
          } else if (deck.is_cram_active === true && deck.exam_date) {
            activeExamDate = deck.exam_date;
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

          const total = deck.totalCards ?? deck.cards?.length ?? 0;
          const due = deck.dueCount ?? 0;
          const mastered = deck.masteredCount ?? 0;
          const overdue = deck.overdueCount ?? 0;

          return { 
            ...deck, 
            examDateToUse: activeExamDate,
            daysLeft: daysLeft,
            calculatedMastered: mastered,
            calculatedTotal: total,
            calculatedDue: due,
            calculatedOverdue: overdue,
            createdAtDate: deck.createdAt ? new Date(deck.createdAt) : new Date(0)
          };
        });

        setDecks(augmentedDecks);
      } catch (error) {
        console.error("Lỗi khi tải bộ thẻ:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDecksData();
  }, []);

  const handleStudyClick = (deck) => {
    const total = parseInt(deck.calculatedTotal) || 0;
    const due = parseInt(deck.calculatedDue) || 0;

    if (total === 0) {
      if (onNavigate) onNavigate("create"); 
      return;
    }

    if (due === 0) {
      // 👉 GỌI CUSTOM MODAL THAY CHO WINDOW.CONFIRM
      setForceModal({ isOpen: true, deck: deck });
    } else {
      if (onNavigate) onNavigate("review", deck.id);
    }
  };

  const totalDecks = decks.length;
  const totalCards = decks.reduce((sum, d) => sum + (d.calculatedTotal || 0), 0);
  const totalDue = decks.reduce((sum, d) => sum + (d.calculatedDue || 0), 0);
  const totalOverdue = decks.reduce((sum, d) => sum + (d.calculatedOverdue || 0), 0); 

  let displayDecks = decks.filter(d => (d.title || d.name || "").toLowerCase().includes(searchTerm.toLowerCase()));
  if (filterMode === 'due') displayDecks = displayDecks.filter(d => d.calculatedDue > 0);
  if (filterMode === 'overdue') displayDecks = displayDecks.filter(d => d.calculatedOverdue > 0); 
  if (filterMode === 'cram') displayDecks = displayDecks.filter(d => d.examDateToUse);

  displayDecks.sort((a, b) => {
    if (sortMode === "priority") {
      return b.calculatedDue - a.calculatedDue;
    }
    return b.createdAtDate - a.createdAtDate;
  });

  const renderEmptyState = () => {
    if (filterMode === 'due') {
      return (
        <div className="empty-review-state">
          <div className="empty-icon"><i className="fa-solid fa-champagne-glasses" style={{color: "#10b981"}}></i></div>
          <h3>Tuyệt vời!</h3>
          <p>Bạn đã hoàn thành toàn bộ mục tiêu ôn tập của ngày hôm nay.</p>
        </div>
      );
    }
    if (filterMode === 'overdue') {
      return (
        <div className="empty-review-state">
          <div className="empty-icon"><i className="fa-solid fa-face-smile-wink" style={{color: "#3b82f6"}}></i></div>
          <h3>Không có thẻ bị trễ</h3>
          <p>Bạn đang duy trì tiến độ học tập rất tốt. Hãy tiếp tục phát huy nhé!</p>
        </div>
      );
    }
    if (filterMode === 'cram') {
      return (
        <div className="empty-review-state">
          <div className="empty-icon"><i className="fa-solid fa-bolt" style={{color: "#f59e0b"}}></i></div>
          <h3>Chưa có thẻ Cấp Tốc</h3>
          <p>Bật chế độ Cram Mode để nhồi nhét kiến thức trước kỳ thi.</p>
        </div>
      );
    }
    return (
      <div className="empty-review-state">
        <div className="empty-icon"><i className="fa-solid fa-box-open"></i></div>
        <h3>Không có bộ thẻ nào</h3>
        <p>Tạo bộ thẻ mới để bắt đầu hành trình học tập ngay!</p>
        <Button text="+ Tạo bộ thẻ mới" variant="primary" onClick={() => onNavigate("create")} />
      </div>
    );
  };

  return (
    <div className="dashboard-layout">
      <Sidebar currentView="review" onNavigate={onNavigate} />
      <main className="dashboard-content" style={{ backgroundColor: "var(--bg-main)" }}>
        <div className="page-wrapper" style={{ maxWidth: "1200px", margin: "0 auto" }}>
          
          <header className="review-dashboard-header">
            <div>
              <h1 style={{ color: "var(--text-dark)", fontSize: "2rem", marginBottom: "5px", fontWeight: "bold" }}>Ôn tập</h1>
              <p style={{ color: "var(--text-gray)" }}>Tiếp tục học với các bộ thẻ đến hạn hôm nay.</p>
            </div>
            <div className="top-due-badge">
              🔥 <span>{totalDue}</span> thẻ cần ôn hôm nay
            </div>
          </header>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px", marginBottom: "30px" }}>
            <StatCard icon="fa-layer-group" label="Bộ thẻ" value={totalDecks} colorClass="bg-blue" />
            <StatCard icon="fa-file-lines" label="Flashcards" value={totalCards} colorClass="bg-green" />
            <StatCard icon="fa-clock" label="Cần ôn" value={totalDue} colorClass="bg-orange" />
            <StatCard icon="fa-circle-exclamation" label="Quá hạn" value={totalOverdue} colorClass="bg-red" />
          </div>

          <div className="review-filter-bar">
            <div className="search-box">
              <i className="fa-solid fa-magnifying-glass"></i>
              <input type="text" placeholder="Tìm kiếm bộ thẻ..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div className="filter-buttons">
              <button className={filterMode === 'all' ? 'active' : ''} onClick={() => setFilterMode('all')}>Tất cả</button>
              <button className={filterMode === 'due' ? 'active' : ''} onClick={() => setFilterMode('due')}>Đến hạn</button>
              <button className={filterMode === 'overdue' ? 'active' : ''} onClick={() => setFilterMode('overdue')}>Quá hạn</button>
              <button className={filterMode === 'cram' ? 'active' : ''} onClick={() => setFilterMode('cram')}>Cấp tốc</button>
            </div>
            <select className="sort-dropdown" value={sortMode} onChange={(e) => setSortMode(e.target.value)}>
              <option value="newest">Sắp xếp: Mới nhất</option>
              <option value="priority">Sắp xếp: Ưu tiên ôn</option>
            </select>
          </div>

          {isLoading ? (
            <div className="loading-state" style={{ textAlign: "center", padding: "50px", color: "var(--text-gray)" }}>
              <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: "2rem", margin: "0 auto 15px auto", display: "block" }}></i>
              <p>Đang tải dữ liệu...</p>
            </div>
          ) : displayDecks.length === 0 ? (
            renderEmptyState()
          ) : (
            <div className="review-list-container" ref={menuRef}>
              {displayDecks.map(deck => {
                const total = deck.calculatedTotal;
                const due = deck.calculatedDue;
                const mastered = deck.calculatedMastered;
                const progress = total === 0 ? 0 : Math.round((mastered / total) * 100);
                const isCompleted = total > 0 && due === 0;

                const originalTitle = deck.title || deck.name || "Bộ thẻ không tên";
                const isAIGenerated = originalTitle.toLowerCase().includes("(ai generated)");
                const displayTitle = isAIGenerated ? originalTitle.replace(/\(ai generated\)/i, "").trim() : originalTitle;

                let btnText = "Ôn tập";
                let btnVariant = "primary";
                
                if (total === 0) {
                  btnText = "Thêm thẻ";
                  btnVariant = "gray"; 
                } else if (isCompleted) {
                  btnText = "👁 Xem lại";
                  btnVariant = "outline";
                }

                return (
                  <div key={deck.id} className="review-list-item">
                    <div className="rli-col-main">
                      <div className="rli-title-row">
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <h3>{displayTitle}</h3>
                          {isAIGenerated && (
                            <i className="fa-solid fa-robot" title="Tạo bằng AI" style={{ color: "#a855f7", fontSize: "1.1rem" }}></i>
                          )}
                        </div>
                        <div className="rli-badges">
                          {deck.examDateToUse && <span className="badge-cram">🔥 CẤP TỐC</span>}
                          {isCompleted && <span className="badge-done"><i className="fa-solid fa-check"></i> Hoàn thành</span>}
                        </div>
                      </div>
                      
                      <div className="rli-progress-wrapper">
                        <div className="rli-progress-track">
                          <div className="rli-progress-fill" style={{ width: `${progress}%`, background: isCompleted ? '#10b981' : 'var(--primary)' }}></div>
                        </div>
                        <span className="rli-progress-text">{progress}%</span>
                      </div>

                      <div className="rli-stats-row">
                        <div className="stat-item"><i className="fa-solid fa-file-lines" style={{color: '#8b5cf6'}}></i> <strong>{total}</strong> Thẻ</div>
                        <div className="stat-item"><i className="fa-solid fa-book-open" style={{color: '#10b981'}}></i> <strong>{mastered}</strong> Đã học</div>
                        <div className="stat-item"><i className="fa-solid fa-clock" style={{color: '#f59e0b'}}></i> <strong>{due}</strong> Cần ôn</div>
                      </div>
                    </div>

                    <div className="rli-col-exam">
                      {deck.examDateToUse ? (
                        <>
                          <i className="fa-regular fa-calendar"></i>
                          <div>
                            <span className="exam-days-left">Thi sau {deck.daysLeft} ngày</span><br/>
                            <span className="exam-date">{new Date(deck.examDateToUse).toLocaleDateString('vi-VN')}</span>
                          </div>
                        </>
                      ) : (
                        <span style={{color: 'var(--border)'}}>---</span>
                      )}
                    </div>

                    <div className="rli-col-actions">
                      <Button 
                        text={btnText} 
                        variant={btnVariant} 
                        onClick={() => handleStudyClick(deck)} 
                      />
                      
                      <div className="rli-menu-wrapper">
                        <button className="rli-more-btn" onClick={() => setOpenMenuId(openMenuId === deck.id ? null : deck.id)}>...</button>
                        {openMenuId === deck.id && (
                          <div className="rli-dropdown">
                            <button><i className="fa-regular fa-eye"></i> Xem chi tiết</button>
                            <button><i className="fa-solid fa-pen"></i> Sửa bộ thẻ</button>
                            <button><i className="fa-regular fa-calendar-plus"></i> Đặt ngày thi</button>
                            <div className="divider"></div>
                            <button className="text-red"><i className="fa-regular fa-trash-can"></i> Xóa bộ thẻ</button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* 👉 CUSTOM MODAL THAY THẾ CHO WINDOW.CONFIRM THÔ KỆCH */}
      {forceModal.isOpen && (
        <div className="cram-modal-overlay" style={{ zIndex: 1000 }}>
          <div className="cram-modal" style={{ textAlign: "center", padding: "40px 30px", maxWidth: "420px" }}>
            <div style={{ fontSize: "3.5rem", marginBottom: "20px" }}>✨</div>
            <h3 style={{ color: "var(--text-dark)", fontSize: "1.5rem", marginBottom: "15px", fontWeight: "800" }}>Tuyệt vời!</h3>
            <p style={{ color: "var(--text-gray)", lineHeight: "1.6", marginBottom: "30px", fontSize: "1.05rem" }}>
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