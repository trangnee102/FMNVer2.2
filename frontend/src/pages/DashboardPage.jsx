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
  const [examDates, setExamDates] = useState([]);
  const [isCramModalOpen, setIsCramModalOpen] = useState(false);

  // 👉 Toast Notification State (Thay thế alert thô kệch bằng giao diện chuyên nghiệp)
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
      
      const lastCheckInStr = localStorage.getItem("lastCheckInDate");
      const localStreakRaw = localStorage.getItem("localStreak");
      let currentLocalStreak = localStreakRaw ? parseInt(localStreakRaw, 10) : 0;

      if (lastCheckInStr) {
        const lastCheckInDate = new Date(lastCheckInStr);
        lastCheckInDate.setHours(0, 0, 0, 0);
        
        const diffTime = today - lastCheckInDate;
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

        // Nếu quá 1 ngày chưa điểm danh thì reset về 0
        if (diffDays > 1) {
          currentLocalStreak = 0;
          localStorage.setItem("localStreak", "0");
        }
      }
      
      setUserData((prev) => ({ ...prev, streak: currentLocalStreak }));
    };

    checkAndResetStreak();
  }, []);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Chỉ lấy ngày tháng chuẩn YYYY-MM-DD để tránh lỗi Backend Strict Validation
        const todayString = new Date().toISOString().split('T')[0]; 
        
        // 👉 ĐÃ SỬA: Loại bỏ hoàn toàn &t=... để không bị lỗi 400 Bad Request
        const response = await api.get(`/dashboard/summary?currentDate=${encodeURIComponent(todayString)}`);

        if (response && response.success !== false) {
          const data = response.data || response; 
          
          if (data.user) {
            setUserData((prev) => {
              // LOGIC STREAK THÔNG MINH HƠN: Luôn ưu tiên Backend nếu Backend có dữ liệu chuẩn hơn Local
              const localStreakRaw = localStorage.getItem("localStreak");
              const localStreak = localStreakRaw ? parseInt(localStreakRaw, 10) : null;
              const backendStreak = data.user.streak || 0;
              
              // Nếu localStreak bị kẹt (tài khoản cũ) nhưng backend báo = 0, thì lấy số 0
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
            const augmentedDecks = data.decks.map((deck) => {
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

            augmentedDecks.sort((a, b) => {
              const isACram = a.daysLeft !== null;
              const isBCram = b.daysLeft !== null;

              if (isACram && !isBCram) return -1;
              if (!isACram && isBCram) return 1;
              if (isACram && isBCram) return a.daysLeft - b.daysLeft;
              return 0;
            });

            setDecks(augmentedDecks);

            const extractedDates = augmentedDecks
              .map((d) => d.examDateToUse)
              .filter((date) => date !== null);
            setExamDates(extractedDates);
          }
        }
      } catch (error) {
        console.error("Lỗi đứt cáp, không gọi được Backend:", error);
        
        // 👉 ĐÃ FIX: Tự động "bắt" lỗi Token hết hạn dù Backend trả về mã 400
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

  const handleStudyClick = (deckId) => {
    const targetDeck = decks.find((d) => d.id === deckId);
    const dueCount = targetDeck ? targetDeck.calculatedDue : 0;

    if (dueCount === 0) {
      const userWantsToForce = window.confirm(
        "Bạn đã hoàn thành lịch ôn tập hôm hôm nay cho bộ thẻ này.\n\nBạn có muốn tiếp tục ôn tập lại toàn bộ danh sách thẻ không?"
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
    localStorage.setItem("localStreak", newStreak.toString());
    localStorage.setItem("lastCheckInDate", todayStr);
    
    showToast(`🔥 Điểm danh thành công! Chuỗi học tập hiện tại: ${newStreak} ngày.`, "success");

    try {
      await api.post("/dashboard/checkin", { streak: newStreak });
    } catch (error) {
      console.warn("Lưu ý: Backend chưa mở hoặc lỗi mạng. Streak đã được lưu an toàn tại Local Storage.");
    }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar currentView="dashboard" onNavigate={onNavigate} />

      <main className="dashboard-content scrollable-content" style={{ backgroundColor: "var(--bg-main)", overflowY: "auto", height: "100vh" }}>
        <div className="page-wrapper" style={{ maxWidth: "1300px", margin: "0 auto", padding: "30px 40px" }}>
          
          <DashboardHeader userName={userData.name} />
          
          <div className="main-dashboard-grid">
            
            <div className="dashboard-left-col">
              <DashboardStats
                totalDueCards={totalDueCards}
                totalCards={totalCards}
                totalDecks={totalDecks}
              />
              
              <DashboardActions
                totalDueCards={totalDueCards}
                onNavigate={onNavigate}
                onStartStudy={handleStartGlobalStudy}
                onOpenCramModal={() => setIsCramModalOpen(true)}
              />
              
              <DeckList
                decks={decks}
                onStudy={handleStudyClick}
                onNavigate={onNavigate}
              />
            </div>

            <div className="dashboard-right-col">
              
              <div className="widget-card streak-widget-large">
                <div className="streak-header">
                  <h3>Tích Lũy Streak 🔥</h3>
                  <p>Bấm điểm danh mỗi ngày để duy trì chuỗi học tập.</p>
                </div>
                <div className="streak-body">
                  <h2>🔥 Streak: {userData.streak} ngày</h2>
                </div>
                <button className="btn-checkin-large" onClick={handleCheckIn}>
                  <i className="fa-solid fa-bullseye"></i> Điểm danh hôm nay
                </button>
              </div>

              <div className="widget-card calendar-widget-container" style={{ marginTop: "25px" }}>
                <h3 className="widget-title">Lịch học tập & Thi cử</h3>
                <CalendarWidget examDates={examDates} />
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
          position: "fixed",
          bottom: "30px",
          right: "30px",
          backgroundColor: toast.type === "success" ? "#10b981" : "#ef4444",
          color: "#fff",
          padding: "16px 24px",
          borderRadius: "14px",
          boxShadow: "0 10px 25px rgba(0, 0, 0, 0.15)",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          zIndex: 9999,
          fontWeight: "600",
          fontSize: "0.95rem",
          animation: "slideInUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards"
        }}>
          <span style={{ fontSize: "1.2rem" }}>{toast.type === "success" ? "🎉" : "🚨"}</span>
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;