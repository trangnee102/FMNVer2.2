import React, { useState, useEffect, useRef } from "react";
import Sidebar from "../components/Layout/Sidebar";
import StatCard from "../components/Cards/StatCard";
import Button from "../components/common/Button";
import "./ReviewPage.css";

// =====================================================================
// COMPONENT 1: GIAO DIỆN LẬT THẺ (GIỮ NGUYÊN 100% LOGIC CŨ CỦA BẠN)
// =====================================================================
const ActiveStudySession = ({ deckId, forceReview, onFinish }) => {
  const [cards, setCards] = useState([]);
  const [initialTotal, setInitialTotal] = useState(0);
  const [sessionStats, setSessionStats] = useState({ passed: 0, forgotten: 0 });
  const [isSessionFinished, setIsSessionFinished] = useState(false);

  // Xử lý "vượt rào" nếu được truyền qua URL trick
  const actualDeckId = String(deckId).split('?')[0];
  const isForce = String(deckId).includes('force=true') || forceReview;

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
      const token = localStorage.getItem("token") || "";
      const todayString = new Date().toISOString();
      const url = `http://localhost:5000/api/study/deck/${actualDeckId}/due-cards?force=true&currentDate=${encodeURIComponent(todayString)}`;
      
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      
      const loadedCards = data.data || [];
      setCards(loadedCards);
      setInitialTotal(loadedCards.length);
    } catch (err) {
      console.error("Lỗi khi tải lại danh sách thẻ:", err);
      setErrorMsg(err.message || "Đã xảy ra sự cố trong quá trình tải dữ liệu.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const fetchDueCards = async () => {
      try {
        const token = localStorage.getItem("token") || "";
        const todayString = new Date().toISOString();
        const endpoint = isForce
          ? `/study/deck/${actualDeckId}/due-cards?force=true&currentDate=${encodeURIComponent(todayString)}`
          : `/study/deck/${actualDeckId}/due-cards?currentDate=${encodeURIComponent(todayString)}`;

        const response = await fetch(`http://localhost:5000/api${endpoint}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) {
          if (response.status === 401) throw new Error("401");
          throw new Error("Lỗi kết nối máy chủ");
        }

        const data = await response.json();
        const loadedCards = data.data || [];
        setCards(loadedCards);
        setInitialTotal(loadedCards.length);

        const savedIndex = localStorage.getItem(`review_progress_${actualDeckId}`);
        if (savedIndex) {
          setSessionStats({ passed: parseInt(savedIndex, 10), forgotten: 0 });
        }
      } catch (error) {
        console.error("Lỗi khi tải dữ liệu:", error);
        if (error.message === "401") {
          setErrorMsg("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        } else {
          setErrorMsg("Mất kết nối với máy chủ. Vui lòng thử lại sau.");
        }
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
    const token = localStorage.getItem("token") || "";

    // Gửi dữ liệu lưu trữ ngầm lên Server bằng fetch đồng bộ
    fetch("http://localhost:5000/api/study/review", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        flashcard_id: currentCard.id,
        rating: rating,
        duration_ms: durationMs,
      })
    }).catch((err) => console.error("Lỗi đồng bộ dữ liệu ngầm:", err));

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
      if (onFinish) onFinish();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isSessionFinished) return;
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
  }, [isFlipped, currentIndex, cards, startTime, isSessionFinished]);

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
                <button onClick={onFinish} style={{ flex: 1, padding: "12px", cursor: "pointer", background: "var(--bg-main)", color: "var(--text-gray)", border: "1px solid var(--border)", borderRadius: "8px", fontWeight: "bold" }}>Trở về</button>
                <button onClick={handleReviewAllAgain} style={{ flex: 1, padding: "12px", cursor: "pointer", background: "var(--primary)", color: "white", border: "none", borderRadius: "8px", fontWeight: "bold" }}>Tiếp tục ôn tập</button>
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
        <div style={{ background: "var(--bg-card)", padding: "40px", borderRadius: "16px", boxShadow: "0 10px 25px rgba(0,0,0,0.1)", textAlign: "center", maxWidth: "400px", width: "100%", border: "1px solid var(--border)" }}>
          <h2 style={{ color: "#10b981", fontSize: "1.8rem", marginBottom: "10px", fontWeight: "bold" }}>Hoàn thành phiên học</h2>
          <p style={{ color: "var(--text-gray)", fontSize: "1rem", marginBottom: "30px" }}>Bạn đã xem xét xong {initialTotal} thẻ.</p>
          <div style={{ display: "flex", justifyContent: "space-around", marginBottom: "30px" }}>
            <div style={{ background: "rgba(16, 185, 129, 0.1)", padding: "15px", borderRadius: "12px", width: "45%" }}>
              <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#059669" }}>{sessionStats.passed}</div>
              <div style={{ color: "#047857", fontSize: "0.9rem", fontWeight: "bold" }}>Thẻ đã nhớ</div>
            </div>
            <div style={{ background: "rgba(239, 68, 68, 0.1)", padding: "15px", borderRadius: "12px", width: "45%" }}>
              <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#dc2626" }}>{sessionStats.forgotten}</div>
              <div style={{ color: "#b91c1c", fontSize: "0.9rem", fontWeight: "bold" }}>Thẻ đã quên</div>
            </div>
          </div>
          <button onClick={onFinish} style={{ width: "100%", padding: "14px", background: "var(--primary)", color: "white", border: "none", borderRadius: "10px", fontWeight: "bold", fontSize: "1rem", cursor: "pointer" }}>Trở về Trang chủ</button>
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
// COMPONENT 2: GIAO DIỆN DASHBOARD TỔNG QUAN ÔN TẬP (ĐÃ ĐỒNG BỘ FETCH)
// =====================================================================
const ReviewDashboard = ({ onNavigate }) => {
  const [decks, setDecks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMode, setFilterMode] = useState("all"); 
  const [openMenuId, setOpenMenuId] = useState(null); 

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

  useEffect(() => {
    const fetchDecks = async () => {
      try {
        const token = localStorage.getItem("token") || "";
        const res = await fetch("http://localhost:5000/api/decks", {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (res.ok && data.success) {
          const augmentedDecks = (data.data || []).map(deck => {
            // 👉 ĐÃ FIX: Chỉ kích hoạt Cram Mode khi người dùng chủ động cài đặt
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

            const total = parseInt(deck.totalCards) || 0;
            const due = parseInt(deck.dueCards) || 0;
            const mastered = deck.masteredCards !== undefined ? parseInt(deck.masteredCards) : Math.max(0, total - due);

            return { 
              ...deck, 
              examDateToUse: activeExamDate,
              daysLeft: daysLeft,
              calculatedMastered: mastered,
              calculatedTotal: total,
              calculatedDue: due
            };
          });
          setDecks(augmentedDecks);
        }
      } catch (error) {
        console.error("Lỗi khi tải bộ thẻ:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDecks();
  }, []);

  const handleStudyClick = (deck) => {
    const due = parseInt(deck.calculatedDue) || 0;
    if (due === 0) {
      const userWantsToForce = window.confirm("Cậu đã học xong bài môn này rồi!\nCậu có muốn 'vượt rào' ôn trước các thẻ chưa đến hạn không?");
      if (userWantsToForce && onNavigate) {
        onNavigate("review", `${deck.id}?force=true`); 
      }
    } else {
      if (onNavigate) onNavigate("review", deck.id);
    }
  };

  const totalDecks = decks.length;
  const totalCards = decks.reduce((sum, d) => sum + (d.calculatedTotal || 0), 0);
  const totalDue = decks.reduce((sum, d) => sum + (d.calculatedDue || 0), 0);
  const totalOverdue = 0; 

  let displayDecks = decks.filter(d => (d.title || d.name).toLowerCase().includes(searchTerm.toLowerCase()));
  if (filterMode === 'due') displayDecks = displayDecks.filter(d => d.calculatedDue > 0);
  if (filterMode === 'overdue') displayDecks = displayDecks.filter(d => false); 
  if (filterMode === 'cram') displayDecks = displayDecks.filter(d => d.examDateToUse);

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
            <select className="sort-dropdown">
              <option>Sắp xếp: Mới nhất</option>
              <option>Sắp xếp: Ưu tiên ôn</option>
            </select>
          </div>

          {isLoading ? (
            <p style={{ textAlign: "center", color: "var(--text-gray)", padding: "40px" }}><i className="fa-solid fa-spinner fa-spin"></i> Đang tải dữ liệu...</p>
          ) : displayDecks.length === 0 ? (
            <div className="empty-review-state">
              <div className="empty-icon"><i className="fa-solid fa-box-open"></i></div>
              <h3>Không có bộ thẻ nào khác</h3>
              <p>Tạo bộ thẻ mới để bắt đầu học ngay!</p>
              <Button text="+ Tạo bộ thẻ mới" variant="primary" onClick={() => onNavigate("create")} />
            </div>
          ) : (
            <div className="review-list-container" ref={menuRef}>
              {displayDecks.map(deck => {
                const total = deck.calculatedTotal;
                const due = deck.calculatedDue;
                const mastered = deck.calculatedMastered;
                const progress = total === 0 ? 0 : Math.round((mastered / total) * 100);
                const isCompleted = total > 0 && due === 0;

                return (
                  <div key={deck.id} className="review-list-item">
                    <div className="rli-col-main">
                      <div className="rli-title-row">
                        <h3>{deck.title || deck.name}</h3>
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
                        <div className="stat-item"><i className="fa-solid fa-book-open" style={{color: '#3b82f6'}}></i> <strong>{mastered}</strong> Đã học</div>
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
                        text={total === 0 ? "Thêm thẻ" : (isCompleted ? "👁 Xem lại" : "Ôn luyện")} 
                        variant={total === 0 ? "green" : (isCompleted ? "outline" : "primary")} 
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