import React, { useState, useEffect } from "react";
import Sidebar from "../components/Layout/Sidebar";
import DashboardHeader from "../components/Dashboard/DashboardHeader";
import DashboardStats from "../components/Dashboard/DashboardStats";
import DashboardActions from "../components/Dashboard/DashboardActions";
import DeckList from "../components/Dashboard/DeckList";
import CalendarWidget from "../components/Dashboard/CalendarWidget";
import "./DashboardPage.css";

const DashboardPage = ({ dynamicName, onNavigate, onStudy }) => {
  // 👉 ĐÃ SỬA: Ưu tiên lấy tên thật từ localStorage ngay khi trang vừa load
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
    name: getInitialName(), // Gọi hàm lấy tên
    streak: 0,
  });

  const [decks, setDecks] = useState([]);
  const [examDates, setExamDates] = useState([]);

  useEffect(() => {
    // Nếu App.js đẩy tên mới vào và localStorage không có, thì cập nhật
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
          },
        );

        if (response.ok) {
          const data = await response.json();
          if (data.user) {
            setUserData((prev) => ({
              ...prev,
              ...data.user,
              // 👉 ĐÃ SỬA: Luôn ưu tiên tên mới nhất từ Database trả về
              name: data.user.full_name || data.user.name || prev.name,
            }));

            // 👉 Cập nhật luôn lại vào localStorage cho chắc cốp
            const existingUserStr = localStorage.getItem("user");
            if (existingUserStr) {
              const existingUser = JSON.parse(existingUserStr);
              existingUser.full_name = data.user.full_name || data.user.name;
              localStorage.setItem("user", JSON.stringify(existingUser));
            }
          }

          if (data.decks) {
            const augmentedDecks = data.decks.map((deck) => {
              const savedSettings =
                JSON.parse(localStorage.getItem(`cram_settings_${deck.id}`)) ||
                {};
              const activeExamDate =
                savedSettings.examDate || deck.exam_date || null;

              let daysLeft = null;
              if (activeExamDate) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const exam = new Date(activeExamDate);
                exam.setHours(0, 0, 0, 0);
                const diff = Math.ceil((exam - today) / (1000 * 60 * 60 * 24));
                daysLeft = diff > 0 ? diff : 0;
              }

              return {
                ...deck,
                examDateToUse: activeExamDate,
                daysLeft: daysLeft,
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
  }, [dynamicName]); // Bỏ userData.name ra khỏi mảng này để tránh loop vô hạn

  const totalDecks = decks.length;
  const totalDueCards = decks.reduce(
    (sum, deck) => sum + (deck.dueCards || 0),
    0,
  );
  const totalMastered = decks.reduce(
    (sum, deck) => sum + (deck.masteredCards || 0),
    0,
  );

  const handleStudyClick = (deckId) => {
    const targetDeck = decks.find((d) => d.id === deckId);
    const dueCount = targetDeck ? targetDeck.dueCards || 0 : 0;

    if (dueCount === 0) {
      const userWantsToForce = window.confirm(
        "✨ Cậu đã học xong bài hôm nay rồi!\n\nCậu có muốn 'vượt rào' học trước các thẻ chưa đến hạn của bộ này không?",
      );
      if (userWantsToForce) {
        onStudy(deckId, true);
      }
    } else {
      onStudy(deckId, false);
    }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar currentView="dashboard" onNavigate={onNavigate} />

      <main className="dashboard-content">
        <div className="page-wrapper">
          <DashboardHeader userName={userData.name} />

          <DashboardStats
            totalDueCards={totalDueCards}
            totalMastered={totalMastered}
            streak={`${userData.streak} ngày`}
            totalDecks={totalDecks}
          />

          <div className="main-grid">
            <div className="left-column">
              <DashboardActions
                totalDueCards={totalDueCards}
                onNavigate={onNavigate}
              />
              <DeckList
                decks={decks}
                onStudy={handleStudyClick}
                onNavigate={onNavigate}
              />
            </div>

            <div className="right-column">
              <CalendarWidget examDates={examDates} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardPage;
