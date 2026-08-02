// frontend/src/pages/DashboardPage.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

import Sidebar from "../components/Layout/Sidebar";
import DashboardHeader from "../components/Dashboard/DashboardHeader";
import DashboardStats from "../components/Dashboard/DashboardStats";
import DashboardActions from "../components/Dashboard/DashboardActions";
import DeckList from "../components/Dashboard/DeckList";
import CalendarWidget from "../components/Dashboard/CalendarWidget";
import CramModeModal from "../components/Modals/CramModeModal"; 
import api from "../services/api"; 
import "./DashboardPage.css";

const DashboardPage = ({ dynamicName, onNavigate, onStudy }) => {
  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();

  const getInitialName = () => {
    let currentUser = user;
    if (!currentUser) {
      try {
        const userStr = localStorage.getItem("user");
        if (userStr) currentUser = JSON.parse(userStr);
      } catch (e) {
        console.error("Lỗi đọc localStorage:", e);
      }
    }
    
    if (currentUser) {
      return currentUser.full_name || currentUser.name || currentUser.username || "Người dùng";
    }
    return dynamicName || "Người dùng";
  };

  const [userData, setUserData] = useState({
    name: getInitialName(),
    streak: 0,
  });

  const [decks, setDecks] = useState([]);
  const [exams, setExams] = useState([]); 
  const [examDates, setExamDates] = useState([]);
  const [isCramModalOpen, setIsCramModalOpen] = useState(false);
  
  const [examSearchTerm, setExamSearchTerm] = useState("");
  const [examFilterMode, setExamFilterMode] = useState("all");
  const [showExamFilters, setShowExamFilters] = useState(false);

  const [checkInDates, setCheckInDates] = useState([]);
  const [lastCheckInDetail, setLastCheckInDetail] = useState(null);

  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 4500);
  };

  useEffect(() => {
    if (user) {
      setUserData(prev => ({
        ...prev,
        name: user.full_name || user.name || user.username || prev.name
      }));
    } else if (dynamicName && userData.name === "Người dùng") {
      setUserData(prev => ({ ...prev, name: dynamicName }));
    }
  }, [user, dynamicName]);

  useEffect(() => {
    const checkAndResetStreak = () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().split("T")[0];
      
      const lastCheckInStr = localStorage.getItem("lastCheckInDate");
      const localStreakRaw = localStorage.getItem("localStreak");
      const detailedTimeStr = localStorage.getItem("lastCheckInDetail"); 
      
      let currentLocalStreak = localStreakRaw ? parseInt(localStreakRaw, 10) : 0;

      if (lastCheckInStr) {
        const lastCheckInDate = new Date(lastCheckInStr);
        lastCheckInDate.setHours(0, 0, 0, 0);
        
        const diffTime = today - lastCheckInDate;
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays > 1) {
          currentLocalStreak = 0;
          localStorage.setItem("localStreak", "0");
        } else if (diffDays === 0) {
          setCheckInDates([todayStr]);
          if (detailedTimeStr) setLastCheckInDetail(detailedTimeStr);
        } else if (diffDays === 1) {
           if (detailedTimeStr) setLastCheckInDetail(detailedTimeStr);
        }
      }
      
      setUserData((prev) => ({ ...prev, streak: currentLocalStreak }));
    };

    checkAndResetStreak();
  }, []);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const todayString = new Date().toISOString().split('T')[0]; 
        
        const [response, examsResponse] = await Promise.all([
          api.get(`/dashboard/summary?currentDate=${encodeURIComponent(todayString)}`),
          api.get(`/decks?type=exam`).catch(() => null)
        ]);

        let fetchedExams = [];
        if (examsResponse && examsResponse.success !== false) {
          fetchedExams = examsResponse.data || (Array.isArray(examsResponse) ? examsResponse : []);
        }
        
        const examIdsSet = new Set(fetchedExams.map(exam => exam.id));

        if (response && response.success !== false) {
          const data = response.data || response; 
          
          if (data.user) {
            setUserData((prev) => {
              const localStreakRaw = localStorage.getItem("localStreak");
              const localStreak = localStreakRaw ? parseInt(localStreakRaw, 10) : null;
              const backendStreak = data.user.streak || 0;
              
              const finalStreak = (localStreak !== null && localStreak >= backendStreak) ? localStreak : backendStreak;
              
              localStorage.setItem("localStreak", finalStreak.toString());

              return {
                ...prev,
                ...data.user,
                name: user?.full_name || data.user.full_name || data.user.name || prev.name,
                streak: finalStreak,
              };
            });

            const existingUserStr = localStorage.getItem("user");
            if (existingUserStr) {
              const existingUser = JSON.parse(existingUserStr);
              existingUser.full_name = user?.full_name || data.user.full_name || data.user.name;
              localStorage.setItem("user", JSON.stringify(existingUser));
            }
          }

          if (data.decks) {
            const pureFlashcardDecks = data.decks.filter(deck => !examIdsSet.has(deck.id));

            const augmentedDecks = pureFlashcardDecks.map((deck) => {
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

              const total = deck.totalCards ?? deck._count?.Flashcards ?? 0;
              const due = deck.dueCount ?? deck.dueCards ?? 0;

              return {
                ...deck,
                examDateToUse: activeExamDate,
                daysLeft: daysLeft,
                calculatedTotal: total,
                calculatedDue: due
              };
            });

            setDecks(augmentedDecks);

            const extractedDates = augmentedDecks
              .map((d) => d.examDateToUse)
              .filter((date) => date !== null);
            setExamDates(extractedDates);
          }
        }
        
        const augmentedExams = fetchedExams.map(exam => {
          const total = exam.totalCards ?? exam._count?.Flashcards ?? exam.cards?.length ?? 0;
          const due = exam.dueCount ?? exam.dueCards ?? total; 
          return {
            ...exam,
            calculatedTotal: total,
            calculatedDue: due
          };
        });

        setExams(augmentedExams);

      } catch (error) {
        console.error("Lỗi đứt cáp, không gọi được Backend:", error);
        const errorMsg = error.message?.toLowerCase() || "";
        if (errorMsg.includes("token") || errorMsg.includes("hết hạn") || errorMsg.includes("invalid")) {
          showToast("Phiên đăng nhập đã hết hạn! Vui lòng đăng nhập lại.", "error");
          setTimeout(() => {
            if (logoutUser) logoutUser();
            localStorage.clear();
            navigate("/login");
          }, 2000);
        }
      }
    };

    fetchDashboardData();
  }, [user, logoutUser, navigate]);

  const totalDecks = decks.length;
  const totalDueCards = decks.reduce((sum, deck) => sum + deck.calculatedDue, 0);
  const totalCards = decks.reduce((sum, deck) => sum + deck.calculatedTotal, 0);
  
  // 👉 Định nghĩa đầy đủ cả 2 biến để tránh lỗi Undefined
  const totalExamsCount = exams.length; 
  const totalDueExamsCount = exams.filter(exam => exam.calculatedDue > 0).length;

  const handleStudyClick = (deckId) => {
    const targetDeck = decks.find((d) => d.id === deckId);
    const dueCount = targetDeck ? targetDeck.calculatedDue : 0;

    if (dueCount === 0) {
      const userWantsToForce = window.confirm(
        "Bạn đã hoàn thành lịch ôn tập hôm nay cho bộ thẻ này.\n\nBạn có muốn tiếp tục ôn tập lại toàn bộ danh sách thẻ không?"
      );
      if (userWantsToForce) {
        onStudy(deckId, true);
      }
    } else {
      onStudy(deckId, false);
    }
  };

  const handleStartGlobalStudy = () => {
    const deckWithDueCards = decks.find((d) => d.calculatedDue > 0);
    
    if (deckWithDueCards) {
      onStudy(deckWithDueCards.id, false);
    } else if (decks.length > 0) {
      const confirmForce = window.confirm(
        "Hôm nay bạn đã học xong toàn bộ thẻ rồi!\n\nBạn có muốn tiếp tục ôn tập lại từ đầu bộ thẻ đầu tiên không?"
      );
      if (confirmForce) {
        onStudy(decks[0].id, true);
      }
    } else {
      showToast("Bạn chưa có bộ thẻ nào. Hãy tạo bộ thẻ mới nhé!", "info");
      onNavigate("create");
    }
  };

  const handleCheckIn = async () => {
    const todayStr = new Date().toDateString();
    const lastCheckIn = localStorage.getItem("lastCheckInDate");
    let currentStreak = parseInt(userData.streak || "0", 10);

    if (lastCheckIn === todayStr) {
      showToast("Hôm nay bạn đã điểm danh rồi nhé, ngày mai quay lại nha! 😉", "info");
      return;
    }

    const newStreak = currentStreak + 1;
    setUserData(prev => ({ ...prev, streak: newStreak }));
    
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; 
    
    const timeString = `${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`;
    const dateString = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth()+1).toString().padStart(2, '0')}/${now.getFullYear()}`;
    const detailStr = `Hôm nay, ${timeString}|${dateString}`;
    
    localStorage.setItem("localStreak", newStreak.toString());
    localStorage.setItem("lastCheckInDate", todayStr);
    localStorage.setItem("lastCheckInDetail", detailStr);
    setLastCheckInDetail(detailStr);
    
    const formattedToday = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split("T")[0];
    setCheckInDates(prev => [...prev, formattedToday]);
    
    showToast(`🔥 Điểm danh thành công! Chuỗi học tập hiện tại: ${newStreak} ngày.`, "success");

    try {
      await api.post("/dashboard/checkin", { streak: newStreak });
    } catch (error) {
      console.warn("Lưu ý: Backend chưa mở hoặc lỗi mạng.");
    }
  };

  let filteredExams = exams.filter(exam => 
    (exam.title || exam.name || "").toLowerCase().includes(examSearchTerm.toLowerCase())
  );

  switch (examFilterMode) {
    case "ai":
      filteredExams = filteredExams.filter(exam => 
        (exam.title || exam.name || "").toLowerCase().includes("(ai generated)")
      );
      break;
    default:
      break;
  }

  const processedExams = filteredExams.sort((a, b) => {
    const aCards = a.calculatedTotal;
    const bCards = b.calculatedTotal;
    
    if (examFilterMode === "most") return bCards - aCards;
    if (examFilterMode === "least") return aCards - bCards;
    
    return bCards - aCards;
  }).slice(0, 5); 

  return (
    <div className="dashboard-layout">
      <Sidebar currentView="dashboard" onNavigate={onNavigate} />

      <main className="dashboard-content scrollable-content" style={{ backgroundColor: "var(--bg-main)", overflowY: "auto", height: "100vh", padding: "0 20px" }}>
        <div className="page-wrapper" style={{ maxWidth: "1400px", margin: "0 auto", padding: "30px 0" }}>
          
          <DashboardHeader userName={userData.name} />
          
          <div className="dashboard-rows-container" style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            
            {/* === HÀNG 1 === */}
            <div className="new-dashboard-layout" style={{ marginTop: 0, alignItems: "stretch" }}>
              
              <div className="dashboard-left-col" style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                <DashboardActions
                  totalDueCards={totalDueCards}
                  totalExams={totalDueExamsCount} 
                  onNavigate={onNavigate}
                  onStartStudy={handleStartGlobalStudy}
                  onOpenCramModal={() => setIsCramModalOpen(true)}
                />
                <div className="widget-card stats-widget-new" style={{ marginTop: 0, marginBottom: 0 }}>
                  <h3 className="widget-title">Tuần này</h3>
                  <DashboardStats
                    totalDueCards={totalDueCards}
                    totalDecks={totalDueExamsCount} 
                  />
                </div>
              </div>

              <div className="dashboard-right-col" style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="widget-card streak-widget-new" style={{ 
                  flex: 1, display: 'flex', flexDirection: 'column',
                  padding: '24px', 
                  background: 'linear-gradient(180deg, #fffcf9 0%, #ffffff 100%)', 
                  borderRadius: '20px', 
                  border: '1px solid #ffedd5', 
                  boxShadow: '0 10px 30px rgba(249, 115, 22, 0.05)' 
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '25px' }}>
                    <div style={{ width: '45px', height: '45px', background: '#fff', borderRadius: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '0 4px 12px rgba(249, 115, 22, 0.15)', border: '1px solid #ffedd5' }}>
                      <i className="fa-solid fa-fire" style={{ fontSize: '1.4rem', color: '#f97316' }}></i>
                    </div>
                    <div>
                      <h3 style={{ color: '#ea580c', fontSize: '1.2rem', margin: '0 0 2px 0', fontWeight: '800', letterSpacing: '-0.5px' }}>Streak</h3>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', fontWeight: '500' }}>Duy trì thói quen mỗi ngày</p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '35px' }}>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                      <span style={{ fontSize: '4.5rem', fontWeight: '900', color: '#f97316', lineHeight: '0.8', letterSpacing: '-2px' }}>
                        {userData.streak}
                      </span>
                      <span style={{ fontSize: '1rem', color: '#475569', lineHeight: '1.2', fontWeight: '700', textTransform: 'lowercase' }}>
                        ngày<br/>liên tiếp
                      </span>
                    </div>
                    <div style={{ width: '2px', height: '50px', background: '#ffedd5', margin: '0 20px' }}></div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '24px', height: '24px', background: '#fff7ed', borderRadius: '6px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#f97316' }}>
                          <i className="fa-regular fa-calendar-check" style={{ fontSize: '0.85rem' }}></i>
                        </div>
                        <span style={{ fontSize: '0.8rem', color: '#1e293b', fontWeight: '600' }}>Lần điểm danh gần nhất</span>
                      </div>
                      {lastCheckInDetail ? (
                        <>
                          <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#0f172a' }}>{lastCheckInDetail.split('|')[0]}</div>
                          <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '500' }}>{lastCheckInDetail.split('|')[1]}</div>
                        </>
                      ) : (
                        <div style={{ fontSize: '0.9rem', color: '#94a3b8', fontStyle: 'italic', marginTop: '4px' }}>Chưa có dữ liệu</div>
                      )}
                    </div>
                  </div>

                  <div style={{ position: 'relative', marginBottom: '35px', padding: '0 10px' }}>
                    <div style={{ position: 'absolute', top: '19px', left: '25px', right: '25px', height: '2px', borderTop: '2px dashed #fed7aa', zIndex: 1 }}></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', zIndex: 2 }}>
                      {[...Array(7)].map((_, i) => {
                        const isActive = i < (userData.streak % 7 || (userData.streak === 0 ? 0 : 7));
                        return (
                          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                            <div style={{ 
                              width: isActive ? '42px' : '38px', height: isActive ? '42px' : '38px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center',
                              background: isActive ? '#fff' : '#f8fafc', border: isActive ? '2px solid #f97316' : '2px solid transparent',
                              boxShadow: isActive ? '0 4px 10px rgba(249, 115, 22, 0.2)' : 'none', transition: 'all 0.3s ease'
                            }}>
                              <i className="fa-solid fa-fire" style={{ fontSize: '1.2rem', color: isActive ? '#f97316' : '#cbd5e1' }}></i>
                            </div>
                            <span style={{ fontSize: '0.75rem', fontWeight: isActive ? '700' : '600', color: isActive ? '#ea580c' : '#94a3b8' }}>Ngày {i + 1}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  <button 
                    className="btn-checkin-new" 
                    onClick={handleCheckIn}
                    style={{ 
                      width: '100%', padding: '16px', borderRadius: '14px', border: 'none', 
                      background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', color: 'white', fontWeight: '800', 
                      fontSize: '1rem', cursor: 'pointer', transition: 'all 0.3s ease', boxShadow: '0 6px 20px rgba(234, 88, 12, 0.3)',
                      display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', textTransform: 'uppercase', 
                      letterSpacing: '0.5px', marginTop: 'auto'
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(234, 88, 12, 0.45)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(234, 88, 12, 0.3)'; }}
                    onMouseDown={(e) => { e.currentTarget.style.transform = 'translateY(1px)'; }}
                  >
                    <i className="fa-solid fa-circle-check" style={{ fontSize: '1.2rem' }}></i>
                    ĐIỂM DANH HÔM NAY
                  </button>

                  <div style={{ textAlign: 'center', marginTop: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}>
                    <i className="fa-solid fa-circle-info" style={{ color: '#ea580c', fontSize: '0.85rem' }}></i>
                    <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '500' }}>Bạn có thể điểm danh 1 lần mỗi ngày</span>
                  </div>
                </div>
              </div>
            </div>

            {/* === HÀNG 2 === */}
            <div className="new-dashboard-layout" style={{ marginTop: 0, alignItems: "start" }}>
              
              <div className="dashboard-left-col" style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                <div className="dashboard-lists-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px', alignItems: 'stretch' }}>
                  
                  <DeckList
                    decks={decks}
                    onStudy={handleStudyClick}
                    onNavigate={onNavigate}
                  />
                  
                  <div className="widget-card list-widget" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                    <div className="list-header" style={{ flexShrink: 0, marginBottom: "15px" }}>
                      <h3>Bộ đề đã luyện gần đây</h3>
                      <button className="btn-view-all" onClick={() => onNavigate("my-exams")}>Xem tất cả →</button>
                    </div>
                    
                    <div style={{ display: "flex", gap: "10px", marginBottom: showExamFilters ? "10px" : "15px", flexShrink: 0 }}>
                      <div className="deck-search-box" style={{ flex: 1, margin: 0 }}>
                        <i className="fa-solid fa-magnifying-glass"></i>
                        <input 
                          type="text" 
                          placeholder="Tìm bộ đề thi nhanh..." 
                          value={examSearchTerm}
                          onChange={(e) => setExamSearchTerm(e.target.value)}
                        />
                      </div>
                      <button 
                        onClick={() => setShowExamFilters(!showExamFilters)}
                        style={{
                          background: showExamFilters ? "#6366f1" : "var(--bg-main)",
                          color: showExamFilters ? "white" : "var(--text-gray)",
                          border: "1px solid var(--border)",
                          borderRadius: "10px",
                          padding: "0 15px",
                          cursor: "pointer",
                          transition: "all 0.2s",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          boxShadow: showExamFilters ? "0 4px 10px rgba(99, 102, 241, 0.3)" : "none"
                        }}
                        title="Lọc Nâng Cao"
                      >
                        <i className="fa-solid fa-filter"></i>
                      </button>
                    </div>

                    {showExamFilters && (
                      <div style={{ 
                        display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "15px", flexShrink: 0,
                        padding: "12px", background: "var(--bg-main)", borderRadius: "10px", border: "1px dashed var(--border)"
                      }}>
                        {[
                          { id: "all", label: "Tất cả", icon: "fa-layer-group" },
                          { id: "most", label: "Nhiều câu nhất", icon: "fa-arrow-up-9-1" },
                          { id: "least", label: "Ít câu nhất", icon: "fa-arrow-down-1-9" },
                          { id: "ai", label: "AI tạo", icon: "fa-robot" }
                        ].map(filter => (
                          <button
                            key={filter.id}
                            onClick={() => setExamFilterMode(filter.id)}
                            style={{
                              background: examFilterMode === filter.id ? "rgba(99, 102, 241, 0.15)" : "transparent",
                              color: examFilterMode === filter.id ? "#4f46e5" : "var(--text-gray)",
                              border: examFilterMode === filter.id ? "1px solid #818cf8" : "1px solid transparent",
                              padding: "6px 12px",
                              borderRadius: "20px",
                              fontSize: "0.75rem",
                              fontWeight: "600",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "5px",
                              transition: "all 0.2s"
                            }}
                          >
                            <i className={`fa-solid ${filter.icon}`}></i> {filter.label}
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="list-body custom-deck-scrollbar" style={{ flex: 1, overflowY: "auto", minHeight: "150px", maxHeight: "320px", paddingRight: "8px", paddingBottom: "10px" }}>
                      {processedExams.length > 0 ? (
                        processedExams.map((exam, index) => {
                          const totalCards = exam.calculatedTotal;
                          const scoreColor = index % 2 === 0 ? "score-green" : "score-orange";
                          const displayTitle = exam.title || exam.name || "Đề thi không tên";
                          const isAIGenerated = displayTitle.toLowerCase().includes("(ai generated)");
                          const cleanTitle = isAIGenerated ? displayTitle.replace(/\(ai generated\)/i, "").trim() : displayTitle;

                          return (
                            <div 
                              className="list-item exam-item" 
                              key={exam.id}
                              style={{ cursor: "pointer", display: "flex", alignItems: "center" }}
                              onClick={() => onNavigate("my-exams")} 
                            >
                              <div className="item-info-wrapper" style={{ display: "flex", alignItems: "center", flex: 1, minWidth: 0 }}>
                                <div className="item-icon bg-red-light" style={{ width: '40px', height: '40px', borderRadius: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0, marginRight: '10px' }}>
                                  <i className="fa-solid fa-file-contract text-red"></i>
                                </div>
                                <div className="item-info" style={{ overflow: "hidden", paddingRight: "10px" }}>
                                  <h4 title={cleanTitle} style={{ 
                                    margin: 0, 
                                    whiteSpace: "nowrap", 
                                    overflow: "hidden", 
                                    textOverflow: "ellipsis", 
                                    maxWidth: "180px"
                                  }}>
                                    {cleanTitle}
                                    {isAIGenerated && (
                                      <i className="fa-solid fa-robot" style={{ color: "#ea580c", marginLeft: "6px", fontSize: "0.85rem" }} title="Đề thi tạo bởi AI"></i>
                                    )}
                                  </h4>
                                </div>
                              </div>
                              
                              <div style={{ flexShrink: 0 }}>
                                <div className={`item-score ${scoreColor}`}>
                                  {totalCards} câu
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div style={{ textAlign: "center", padding: "30px 0", color: "var(--text-gray)" }}>
                          <div style={{ background: "var(--bg-main)", width: "50px", height: "50px", margin: "0 auto 10px auto", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem" }}>
                            <i className={examFilterMode !== "all" ? "fa-solid fa-filter-circle-xmark" : "fa-solid fa-folder-open"}></i>
                          </div>
                          <p style={{ margin: 0, fontSize: "0.9rem" }}>
                            {examFilterMode !== "all" ? "Không có đề thi nào khớp với bộ lọc." : "Chưa có đề thi nào."}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(168, 85, 247, 0.05) 100%)', border: '1px dashed rgba(99, 102, 241, 0.3)', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'flex-start', gap: '15px'
                  }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#e0e7ff', color: '#4f46e5', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
                      <i className="fa-solid fa-bullseye"></i>
                    </div>
                    <div>
                      <h4 style={{ margin: '0 0 6px 0', color: '#1e293b', fontSize: '1rem', fontWeight: '700' }}>Mục tiêu hôm nay</h4>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', lineHeight: '1.4' }}>
                        {totalDueCards > 0 ? `Hãy cố gắng hoàn thành ${totalDueCards} thẻ đang chờ để duy trì phong độ nhé!` : "Tuyệt vời! Bạn đã hoàn thành hết mục tiêu ôn tập của ngày hôm nay."}
                      </p>
                    </div>
                  </div>

                  <div style={{
                    background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, rgba(249, 115, 22, 0.05) 100%)', border: '1px dashed rgba(249, 115, 22, 0.3)', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'flex-start', gap: '15px'
                  }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#ffedd5', color: '#ea580c', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
                      <i className="fa-solid fa-robot"></i>
                    </div>
                    <div>
                      <h4 style={{ margin: '0 0 6px 0', color: '#1e293b', fontSize: '1rem', fontWeight: '700' }}>Phân tích AI</h4>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', lineHeight: '1.4' }}>
                        {totalExamsCount < 2 ? "Bạn nên làm thêm đề thi để cọ xát kiến thức thực tế tốt hơn." : "Bạn đang có sự cân bằng tốt giữa việc ôn Flashcard và Luyện đề!"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="study-tip-banner">
                  <div className="tip-icon">💡</div>
                  <div className="tip-content">
                    <strong>Mẹo học tập:</strong> Ôn tập đều đặn mỗi ngày giúp bạn ghi nhớ lâu hơn 90% kiến thức!
                  </div>
                </div>
              </div>

              <div className="dashboard-right-col" style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="widget-card calendar-widget-container">
                  <h3 className="widget-title"><i className="fa-regular fa-calendar"></i> Lịch học tập</h3>
                  <CalendarWidget examDates={examDates} checkInDates={checkInDates} />
                </div>
              </div>

            </div>
          </div>
        </div>
      </main>

      <CramModeModal
        isOpen={isCramModalOpen}
        onClose={() => setIsCramModalOpen(false)}
        decks={decks}
        onNavigate={onNavigate}
      />

      {toast.show && (
        <div style={{
          position: "fixed", bottom: "30px", right: "30px", backgroundColor: toast.type === "success" ? "#10b981" : "#ef4444", color: "#fff",
          padding: "16px 24px", borderRadius: "14px", boxShadow: "0 10px 25px rgba(0, 0, 0, 0.15)", display: "flex", alignItems: "center",
          gap: "12px", zIndex: 9999, fontWeight: "600", fontSize: "0.95rem", animation: "slideInUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards"
        }}>
          <span style={{ fontSize: "1.2rem" }}>{toast.type === "success" ? "🎉" : "🚨"}</span>
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;