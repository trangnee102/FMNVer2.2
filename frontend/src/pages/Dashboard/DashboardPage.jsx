import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

import Sidebar from "../../components/Layout/Sidebar";
import DashboardHeader from "../../components/Dashboard/DashboardHeader";
import DashboardStats from "../../components/Dashboard/DashboardStats";
import DashboardActions from "../../components/Dashboard/DashboardActions";
import DeckList from "../../components/Dashboard/DeckList";
import CalendarWidget from "../../components/Dashboard/CalendarWidget";
import FlashcardSetupModal from "../../components/Modals/FlashcardSetupModal";

import StreakWidget from "../../components/Dashboard/StreakWidget";
import RecentExamsWidget from "../../components/Dashboard/RecentExamsWidget";

import api from "../../services/api";
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
      } catch (e) {}
    }

    if (currentUser) {
      return (
        currentUser.full_name ||
        currentUser.name ||
        currentUser.username ||
        "Người dùng"
      );
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

  const [checkInDates, setCheckInDates] = useState([]);
  const [lastCheckInDetail, setLastCheckInDetail] = useState(null);

  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  });

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 4500);
  };

  useEffect(() => {
    if (user) {
      setUserData((prev) => ({
        ...prev,
        name: user.full_name || user.name || user.username || prev.name,
      }));
    } else if (dynamicName && userData.name === "Người dùng") {
      setUserData((prev) => ({ ...prev, name: dynamicName }));
    }
  }, [user, dynamicName]);

  useEffect(() => {
    const checkAndResetStreak = () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = new Date(
        today.getTime() - today.getTimezoneOffset() * 60000,
      )
        .toISOString()
        .split("T")[0];

      const lastCheckInStr = localStorage.getItem("lastCheckInDate");
      const localStreakRaw = localStorage.getItem("localStreak");
      const detailedTimeStr = localStorage.getItem("lastCheckInDetail");

      let currentLocalStreak = localStreakRaw
        ? parseInt(localStreakRaw, 10)
        : 0;

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
        const todayString = new Date().toISOString().split("T")[0];

        const [response, examsResponse] = await Promise.all([
          api.get(
            `/dashboard/summary?currentDate=${encodeURIComponent(todayString)}`,
          ),
          api.get(`/decks?type=exam`).catch(() => null),
        ]);

        let fetchedExams = [];
        if (examsResponse && examsResponse.success !== false) {
          fetchedExams =
            examsResponse.data ||
            (Array.isArray(examsResponse) ? examsResponse : []);
        }

        const examIdsSet = new Set(fetchedExams.map((exam) => String(exam.id)));

        if (response && response.success !== false) {
          const data = response.data || response;

          if (data.user) {
            setUserData((prev) => {
              const localStreakRaw = localStorage.getItem("localStreak");
              const localStreak = localStreakRaw
                ? parseInt(localStreakRaw, 10)
                : null;
              const backendStreak = data.user.streak || 0;

              const finalStreak =
                localStreak !== null && localStreak >= backendStreak
                  ? localStreak
                  : backendStreak;

              localStorage.setItem("localStreak", finalStreak.toString());

              return {
                ...prev,
                ...data.user,
                name:
                  user?.full_name ||
                  data.user.full_name ||
                  data.user.name ||
                  prev.name,
                streak: finalStreak,
              };
            });

            const existingUserStr = localStorage.getItem("user");
            if (existingUserStr) {
              const existingUser = JSON.parse(existingUserStr);
              existingUser.full_name =
                user?.full_name || data.user.full_name || data.user.name;
              localStorage.setItem("user", JSON.stringify(existingUser));
            }
          }

          if (data.decks) {
            const pureFlashcardDecks = data.decks.filter(
              (deck) => !examIdsSet.has(String(deck.id)),
            );

            const augmentedDecks = pureFlashcardDecks.map((deck) => {
              const savedSettings = JSON.parse(
                localStorage.getItem(`cram_settings_${deck.id}`),
              );

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

              const total = Number(deck.totalCards ?? deck._count?.Flashcards ?? 0);
              const mastered = Number(deck.masteredCards ?? deck.masteredCount ?? 0);
              const learned = Number(deck.learnedCount ?? mastered);
              let due = Number(deck.dueCards ?? deck.dueCount ?? 0);

              const unlearnedCount = Math.max(0, total - learned);
              due = Math.max(due, unlearnedCount);

              return {
                ...deck,
                examDateToUse: activeExamDate,
                daysLeft: daysLeft,
                calculatedTotal: total,
                calculatedDue: due,
              };
            });

            setDecks(augmentedDecks);

            const extractedDates = augmentedDecks
              .map((d) => d.examDateToUse)
              .filter((date) => date !== null);
            setExamDates(extractedDates);
          }

          const augmentedExams = fetchedExams.map((exam) => {
            const dashStats = (data.decks || []).find((d) => String(d.id) === String(exam.id)) || {};
            const learnedCount = Number(dashStats.learnedCount || 0);
            const lastStudied = dashStats.last_studied || null;

            const total = Number(
              exam.totalCards ??
              exam._count?.Flashcards ??
              exam.cards?.length ??
              dashStats.totalCards ??
              0
            );

            let due = Number(dashStats.dueCards ?? exam.dueCount ?? exam.dueCards ?? total);
            const unlearnedCount = Math.max(0, total - learnedCount);
            due = Math.max(due, unlearnedCount);

            return {
              ...exam,
              calculatedTotal: total,
              calculatedDue: due,
              learnedCount,
              last_studied: lastStudied,
            };
          });

          setExams(augmentedExams);
        }
      } catch (error) {
        const errorMsg = error.message?.toLowerCase() || "";
        if (
          errorMsg.includes("token") ||
          errorMsg.includes("hết hạn") ||
          errorMsg.includes("invalid")
        ) {
          showToast(
            "Phiên đăng nhập đã hết hạn! Vui lòng đăng nhập lại.",
            "error",
          );
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
  const totalDueCards = decks.reduce(
    (sum, deck) => sum + deck.calculatedDue,
    0,
  );

  const totalExamsCount = exams.length;
  const totalDueExamsCount = exams.length;

  const handleStudyClick = async (deckId) => {
    try {
      const targetDeck = decks.find((d) => String(d.id) === String(deckId));
      const localDue = targetDeck ? targetDeck.calculatedDue : 0;

      const data = await api.get(`/study/deck/${deckId}/due-cards`);
      const apiDueCount = data.data
        ? data.data.length
        : Array.isArray(data)
          ? data.length
          : 0;

      const finalDueCount = Math.max(localDue, apiDueCount);

      if (finalDueCount === 0) {
        const userWantsToForce = window.confirm(
          "Bạn đã hoàn thành lịch ôn tập hôm nay cho bộ thẻ này.\n\nBạn có muốn tiếp tục ôn tập lại toàn bộ danh sách thẻ không?"
        );
        if (userWantsToForce) {
          onStudy(deckId, true);
        }
      } else {
        onStudy(deckId, false);
      }
    } catch {
      onStudy(deckId, false);
    }
  };

  const handleStartGlobalStudy = () => {
    const deckWithDueCards = decks.find((d) => d.calculatedDue > 0);

    if (deckWithDueCards) {
      handleStudyClick(deckWithDueCards.id);
    } else if (decks.length > 0) {
      const confirmForce = window.confirm(
        "Hôm nay bạn đã học xong toàn bộ thẻ rồi!\n\nBạn có muốn tiếp tục ôn tập lại từ đầu bộ thẻ đầu tiên không?",
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
      showToast(
        "Hôm nay bạn đã điểm danh rồi nhé, ngày mai quay lại nha! 😉",
        "info",
      );
      return;
    }

    const newStreak = currentStreak + 1;
    setUserData((prev) => ({ ...prev, streak: newStreak }));

    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;

    const timeString = `${hours.toString().padStart(2, "0")}:${minutes} ${ampm}`;
    const dateString = `${now.getDate().toString().padStart(2, "0")}/${(now.getMonth() + 1).toString().padStart(2, "0")}/${now.getFullYear()}`;
    const detailStr = `Hôm nay, ${timeString}|${dateString}`;

    localStorage.setItem("localStreak", newStreak.toString());
    localStorage.setItem("lastCheckInDate", todayStr);
    localStorage.setItem("lastCheckInDetail", detailStr);
    setLastCheckInDetail(detailStr);

    const formattedToday = new Date(
      now.getTime() - now.getTimezoneOffset() * 60000,
    )
      .toISOString()
      .split("T")[0];
    setCheckInDates((prev) => [...prev, formattedToday]);

    showToast(
      `🔥 Điểm danh thành công! Chuỗi học tập hiện tại: ${newStreak} ngày.`,
      "success",
    );

    try {
      await api.post("/dashboard/checkin", { streak: newStreak });
    } catch (error) {}
  };

  const displayExams = [...exams].sort((a, b) => {
    const aDue = a.calculatedDue || 0;
    const bDue = b.calculatedDue || 0;
    if (aDue !== bDue) return bDue - aDue;
    return (b.calculatedTotal || 0) - (a.calculatedTotal || 0);
  });

  return (
    <div className="dashboard-layout">
      <Sidebar currentView="dashboard" onNavigate={onNavigate} />

      <main
        className="dashboard-content scrollable-content"
        style={{
          backgroundColor: "var(--bg-main)",
          overflowY: "auto",
          height: "100vh",
          padding: "0 20px",
        }}
      >
        <div
          className="page-wrapper"
          style={{ maxWidth: "1400px", margin: "0 auto", padding: "30px 0" }}
        >
          <DashboardHeader userName={userData.name} />

          <div
            className="dashboard-rows-container"
            style={{ display: "flex", flexDirection: "column", gap: "30px" }}
          >
            <div
              className="new-dashboard-layout"
              style={{ marginTop: 0, alignItems: "stretch" }}
            >
              <div
                className="dashboard-left-col"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "25px",
                }}
              >
                <DashboardActions
                  totalDueCards={totalDueCards}
                  totalExams={totalDueExamsCount}
                  onNavigate={onNavigate}
                  onStartStudy={handleStartGlobalStudy}
                  onOpenCramModal={() => setIsCramModalOpen(true)}
                />
                <div
                  className="widget-card stats-widget-new"
                  style={{ marginTop: 0, marginBottom: 0 }}
                >
                  <h3 className="widget-title">Tuần này</h3>
                  <DashboardStats
                    totalDueCards={totalDueCards}
                    totalDecks={totalDueExamsCount}
                  />
                </div>
              </div>

              <div
                className="dashboard-right-col"
                style={{ display: "flex", flexDirection: "column" }}
              >
                <StreakWidget
                  streak={userData.streak}
                  lastCheckInDetail={lastCheckInDetail}
                  onCheckIn={handleCheckIn}
                />
              </div>
            </div>

            <div
              className="new-dashboard-layout"
              style={{ marginTop: 0, alignItems: "start" }}
            >
              <div
                className="dashboard-left-col"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "25px",
                }}
              >
                <div
                  className="dashboard-lists-row"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "25px",
                    alignItems: "stretch",
                  }}
                >
                  <DeckList
                    decks={decks}
                    onStudy={handleStudyClick}
                    onNavigate={onNavigate}
                  />

                  <RecentExamsWidget exams={displayExams} onNavigate={onNavigate} />
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "20px",
                  }}
                >
                  <div
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(168, 85, 247, 0.05) 100%)",
                      border: "1px dashed rgba(99, 102, 241, 0.3)",
                      borderRadius: "16px",
                      padding: "20px",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "15px",
                    }}
                  >
                    <div
                      style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "12px",
                        background: "#e0e7ff",
                        color: "#4f46e5",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        fontSize: "1.2rem",
                        flexShrink: 0,
                      }}
                    >
                      <i className="fa-solid fa-bullseye"></i>
                    </div>
                    <div>
                      <h4
                        style={{
                          margin: "0 0 6px 0",
                          color: "#1e293b",
                          fontSize: "1rem",
                          fontWeight: "700",
                        }}
                      >
                        Mục tiêu hôm nay
                      </h4>
                      <p
                        style={{
                          margin: 0,
                          fontSize: "0.85rem",
                          color: "#64748b",
                          lineHeight: "1.4",
                        }}
                      >
                        {totalDueCards > 0
                          ? `Hãy cố gắng hoàn thành ${totalDueCards} thẻ đang chờ để duy trì phong độ nhé!`
                          : "Tuyệt vời! Bạn đã hoàn thành hết mục tiêu ôn tập của ngày hôm nay."}
                      </p>
                    </div>
                  </div>

                  <div
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, rgba(249, 115, 22, 0.05) 100%)",
                      border: "1px dashed rgba(249, 115, 22, 0.3)",
                      borderRadius: "16px",
                      padding: "20px",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "15px",
                    }}
                  >
                    <div
                      style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "12px",
                        background: "#ffedd5",
                        color: "#ea580c",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        fontSize: "1.2rem",
                        flexShrink: 0,
                      }}
                    >
                      <i className="fa-solid fa-robot"></i>
                    </div>
                    <div>
                      <h4
                        style={{
                          margin: "0 0 6px 0",
                          color: "#1e293b",
                          fontSize: "1rem",
                          fontWeight: "700",
                        }}
                      >
                        Phân tích AI
                      </h4>
                      <p
                        style={{
                          margin: 0,
                          fontSize: "0.85rem",
                          color: "#64748b",
                          lineHeight: "1.4",
                        }}
                      >
                        {totalExamsCount < 2
                          ? "Bạn nên làm thêm đề thi để cọ xát kiến thức thực tế tốt hơn."
                          : "Bạn đang có sự cân bằng tốt giữa việc ôn Flashcard và Luyện đề!"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="study-tip-banner">
                  <div className="tip-icon">💡</div>
                  <div className="tip-content">
                    <strong>Mẹo học tập:</strong> Ôn tập đều đặn mỗi ngày giúp
                    bạn ghi nhớ lâu hơn 90% kiến thức!
                  </div>
                </div>
              </div>

              <div
                className="dashboard-right-col"
                style={{ display: "flex", flexDirection: "column" }}
              >
                <div className="widget-card calendar-widget-container">
                  <h3 className="widget-title">
                    <i className="fa-regular fa-calendar"></i> Lịch học tập
                  </h3>
                  <CalendarWidget
                    examDates={examDates}
                    checkInDates={checkInDates}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <FlashcardSetupModal
        isOpen={isCramModalOpen}
        onClose={() => setIsCramModalOpen(false)}
        decks={decks}
        onNavigate={onNavigate}
      />

      {toast.show && (
        <div
          style={{
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
            animation: "slideInUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards",
          }}
        >
          <span style={{ fontSize: "1.2rem" }}>
            {toast.type === "success" ? "🎉" : "🚨"}
          </span>
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;