import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import Sidebar from "../components/Layout/Sidebar";
import DashboardHeader from "../components/Dashboard/DashboardHeader";
import DashboardStats from "../components/Dashboard/DashboardStats";
import DashboardActions from "../components/Dashboard/DashboardActions";
import DeckList from "../components/Dashboard/DeckList";
import CalendarWidget from "../components/Dashboard/CalendarWidget";
import CramModeModal from "../components/Modals/CramModeModal"; 
import "./DashboardPage.css";

const DashboardPage = ({ dynamicName, onNavigate, onStudy }) => {
  const getInitialName = () => {
    try {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const userObj = JSON.parse(userStr);
        if (userObj.full_name) return userObj.full_name;
      }
    } catch (e) {
      console.error("Lỗi đọc localStorage:", e);
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

  useEffect(() => {
    if (dynamicName && userData.name === "Người dùng") {
      setUserData((prev) => ({ ...prev, name: dynamicName }));
    }

    const fetchDashboardData = async () => {
      try {
        const token = localStorage.getItem("token") || "";
        const todayString = new Date().toISOString();

        const response = await fetch(
          `http://localhost:5000/api/dashboard/summary?currentDate=${encodeURIComponent(todayString)}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          
          if (data.user) {
            setUserData((prev) => ({
              ...prev,
              ...data.user,
              name: data.user.full_name || data.user.name || prev.name,
              streak: data.user.streak || 0,
            }));

            const existingUserStr = localStorage.getItem("user");
            if (existingUserStr) {
              const existingUser = JSON.parse(existingUserStr);
              existingUser.full_name = data.user.full_name || data.user.name;
              localStorage.setItem("user", JSON.stringify(existingUser));
            }
          }

          if (data.decks) {
            const augmentedDecks = data.decks.map((deck) => {
              const savedSettings = JSON.parse(localStorage.getItem(`cram_settings_${deck.id}`));
              
              // 👉 ĐÃ FIX LỖI CRAM MODE ẢO: 
              // Chỉ kích hoạt khi người dùng chủ động lưu ngày thi vào localStorage. 
              // Bỏ qua giá trị exam_date mặc định rác từ Backend để tránh bộ thẻ mới bị "cháy máy".
              let activeExamDate = null;
              if (savedSettings && savedSettings.examDate) {
                activeExamDate = savedSettings.examDate;
              } else if (deck.is_cram_active === true && deck.exam_date) {
                // Đề phòng sau này Backend có trường is_cram_active chuẩn
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

              // Tính toán Mastered chuẩn
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
      }
    };

    fetchDashboardData();
  }, [dynamicName]); 

  const totalDecks = decks.length;
  const totalDueCards = decks.reduce((sum, deck) => sum + deck.calculatedDue, 0);
  const totalMastered = decks.reduce((sum, deck) => sum + deck.calculatedMastered, 0);

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
      alert("Bạn chưa có bộ thẻ nào. Hãy tạo bộ thẻ mới nhé!");
      onNavigate("create");
    }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar currentView="dashboard" onNavigate={onNavigate} />

      <main className="dashboard-content" style={{ backgroundColor: "var(--bg-main)" }}>
        <div className="page-wrapper" style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <DashboardHeader userName={userData.name} />

          {/* 👉 ĐÃ FIX: Chuyển DashboardStats vào chung khung với ActionCard và DeckList */}
          <div className="main-grid" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "30px", marginTop: "10px" }}>
            
            {/* Cột trái: Thống kê + Hành động + Danh sách thẻ */}
            <div className="left-column" style={{ display: "flex", flexDirection: "column", gap: "30px" }}>
              <DashboardStats
                totalDueCards={totalDueCards}
                totalMastered={totalMastered}
                streak={userData.streak} 
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

            {/* Cột phải: Khối Tích lũy Streak + Lịch */}
            <div className="right-column">
              <CalendarWidget 
                examDates={examDates} 
                streak={userData.streak} 
              />
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
    </div>
  );
};

export default DashboardPage;