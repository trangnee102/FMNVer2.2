import React, { useState, useEffect } from "react";
import Sidebar from "../components/Layout/Sidebar";
import DashboardHeader from "../components/Dashboard/DashboardHeader";
import DashboardStats from "../components/Dashboard/DashboardStats";
import DashboardActions from "../components/Dashboard/DashboardActions";
import DeckList from "../components/Dashboard/DeckList";
import CalendarWidget from "../components/Dashboard/CalendarWidget";
import CramModeModal from "../components/Modals/CramModeModal";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import "./DashboardPage.css";

const DashboardPage = ({ onNavigate, onStudy }) => {
  const { user, loginUser } = useAuth();

  const [userData, setUserData] = useState({
    name: user?.full_name || user?.name || "Người dùng",
    streak: 0,
  });

  const [decks, setDecks] = useState([]);
  const [examDates, setExamDates] = useState([]);
  const [isCramModalOpen, setIsCramModalOpen] = useState(false);

  useEffect(() => {
    if (user) {
      setUserData((prev) => ({
        ...prev,
        name: user.full_name || user.name || prev.name,
      }));
    }

    const fetchDashboardData = async () => {
      try {
        const todayString = new Date().toISOString();

        const res = await api.get(
          `/dashboard/summary?currentDate=${encodeURIComponent(todayString)}`,
        );

        // 👉 ĐÃ SỬA: Bóc tách lớp vỏ data của Axios an toàn tuyệt đối
        const payload = res.data?.data || res.data || {};

        if (payload.user) {
          const fetchedName = payload.user.full_name || payload.user.name;

          setUserData((prev) => ({
            ...prev,
            ...payload.user,
            name: fetchedName || prev.name,
            streak: payload.user.streak || 0,
          }));

          // 👉 ĐÃ SỬA (CHỐNG BUG INFINITE LOOP): Chỉ cập nhật Két sắt nếu Tên thực sự bị đổi trên Server
          if (
            user &&
            fetchedName &&
            user.full_name !== fetchedName &&
            user.name !== fetchedName
          ) {
            loginUser({
              ...user,
              full_name: fetchedName,
            });
          }
        }

        if (payload.decks) {
          const augmentedDecks = payload.decks.map((deck) => {
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
      } catch (error) {
        console.error("Lỗi đứt cáp, không gọi được Backend:", error);
      }
    };

    fetchDashboardData();
    // 👉 LƯU Ý: Vẫn giữ [user] ở đây nhưng vì đã có chốt chặn "if" ở trên nên an toàn 100%!
  }, [user]);

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
        "Bạn đã hoàn thành lịch ôn tập hôm nay cho bộ thẻ này.\n\nBạn có muốn tiếp tục ôn tập lại toàn bộ danh sách thẻ không?",
      );
      if (userWantsToForce) {
        onStudy(deckId, true);
      }
    } else {
      onStudy(deckId, false);
    }
  };

  const handleStartGlobalStudy = () => {
    const deckWithDueCards = decks.find((d) => (d.dueCards || 0) > 0);

    if (deckWithDueCards) {
      onStudy(deckWithDueCards.id, false);
    } else if (decks.length > 0) {
      const confirmForce = window.confirm(
        "Hôm nay bạn đã học xong toàn bộ thẻ rồi!\n\nBạn có muốn tiếp tục ôn tập lại từ đầu bộ thẻ đầu tiên không?",
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

      <main className="dashboard-content">
        <div className="page-wrapper">
          <DashboardHeader userName={userData.name} />

          <DashboardStats
            totalDueCards={totalDueCards}
            totalMastered={totalMastered}
            streak={userData.streak}
            totalDecks={totalDecks}
          />

          <div className="main-grid">
            <div className="left-column">
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

            <div className="right-column">
              <CalendarWidget examDates={examDates} />
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
