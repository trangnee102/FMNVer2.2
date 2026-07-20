import React, { useState } from "react";
import Login from "./components/Auth/Login";
import Register from "./components/Auth/Register";
import DashboardPage from "./pages/DashboardPage";
import CreateCardPage from "./pages/CreateCardPage";
import CreateFlashcardManualPage from "./pages/CreateFlashcardManualPage";
import ReviewPage from "./pages/ReviewPage";
import MyDecksPage from "./pages/MyDecksPage";
import CramReviewPage from "./pages/CramReviewPage";
import StatisticsPage from "./pages/StatisticsPage";
import CommunityPage from "./pages/CommunityPage";
import CreateCardAIPage from "./pages/CreateCardAIPage";
import "./index.css";

import TimeMachineWidget from "./components/TimeMachineWidget";

// ========================================================
// HACK GIẢ LẬP THỜI GIAN (BẢN VÁ LỖI AN TOÀN TUYỆT ĐỐI 🛡️)
// ========================================================
const MOCK_DATE = localStorage.getItem("TIME_MACHINE");
if (MOCK_DATE) {
  const _originalDate = Date;

  window.Date = function (...args) {
    if (args.length === 0) {
      return new _originalDate(`${MOCK_DATE}T12:00:00`);
    }
    return new _originalDate(...args);
  };

  window.Date.prototype = _originalDate.prototype;
  Object.setPrototypeOf(window.Date, _originalDate);
  window.Date.now = () => new _originalDate(`${MOCK_DATE}T12:00:00`).getTime();
}
// ========================================================

function App() {
  const [currentView, setCurrentView] = useState("login");
  const [userName, setUserName] = useState("");
  const [activeDeckId, setActiveDeckId] = useState(null);

  // 👉 State lưu trữ cờ "Vượt rào"
  const [isForceReview, setIsForceReview] = useState(false);

  const handleLogin = () => {
    setUserName("Admin (Từ Database)");
    setCurrentView("dashboard");
  };

  const handleRegister = (nameFromRegister) => {
    setUserName(nameFromRegister);
    setCurrentView("dashboard");
  };

  const handleNavigate = (view, deckId = null) => {
    if (deckId) {
      setActiveDeckId(deckId);
    }
    setCurrentView(view);
  };

  // 👉 Hàm gánh cờ forceReview đi khắp nơi
  const handleStartStudy = (deckId, forceReview = false) => {
    setIsForceReview(forceReview);
    handleNavigate("study", deckId);
  };

  return (
    <>
      {currentView === "login" && (
        <Login
          onLogin={handleLogin}
          onNavigateToRegister={() => handleNavigate("register")}
        />
      )}

      {currentView === "register" && (
        <Register
          onRegister={handleRegister}
          onNavigateToLogin={() => handleNavigate("login")}
        />
      )}

      {currentView === "dashboard" && (
        <DashboardPage
          dynamicName={userName}
          onNavigate={handleNavigate}
          onStudy={handleStartStudy}
        />
      )}

      {currentView === "create" && (
        <CreateCardPage onNavigate={handleNavigate} />
      )}

      {currentView === "create-manual" && (
        <CreateFlashcardManualPage onNavigate={handleNavigate} />
      )}

      {currentView === "my-decks" && (
        <MyDecksPage onNavigate={handleNavigate} onStudy={handleStartStudy} />
      )}

      {(currentView === "study" || currentView === "review") && (
        <ReviewPage
          deckId={activeDeckId}
          forceReview={isForceReview}
          onNavigate={
            handleNavigate
          } /* 👉 ĐÃ FIX BUG: Truyền hàm này vào thì thanh Sidebar ở trang Ôn tập mới không bị sập! */
          onFinish={() => handleNavigate("my-decks")}
        />
      )}

      {currentView === "cram-review" && (
        <CramReviewPage
          deckId={activeDeckId}
          onFinish={() => handleNavigate("my-decks")}
        />
      )}

      {currentView === "stats" && (
        <StatisticsPage onNavigate={handleNavigate} />
      )}

      {currentView === "community" && (
        <CommunityPage onNavigate={handleNavigate} />
      )}

      {currentView === "create-ai" && (
        <CreateCardAIPage onNavigate={handleNavigate} />
      )}

      <TimeMachineWidget />
    </>
  );
}

export default App;
