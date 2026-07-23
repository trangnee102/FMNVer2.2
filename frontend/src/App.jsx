import React, { useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Login from "./components/Auth/Login";
import Register from "./components/Auth/Register";
import ProtectedRoute from "./components/Auth/ProtectedRoute"; // 👉 ĐÃ THÊM: Import Trạm gác an ninh

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
import { AuthProvider } from "./context/AuthContext";

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
  const navigate = useNavigate();

  const [userName, setUserName] = useState("");
  const [activeDeckId, setActiveDeckId] = useState(null);
  const [isForceReview, setIsForceReview] = useState(false);

  const handleLogin = () => {
    setUserName("Admin (Từ Database)");
    navigate("/dashboard");
  };

  const handleRegister = (nameFromRegister) => {
    setUserName(nameFromRegister);
    navigate("/dashboard");
  };

  const handleNavigate = (view, deckId = null) => {
    if (deckId) {
      setActiveDeckId(deckId);
    }

    const routeMap = {
      login: "/login",
      register: "/register",
      dashboard: "/dashboard",
      create: "/create",
      "create-manual": "/create-manual",
      "my-decks": "/my-decks",
      study: "/study",
      review: "/study",
      "cram-review": "/cram-review",
      stats: "/stats",
      community: "/community",
      "create-ai": "/create-ai",
    };

    const path = routeMap[view] || `/${view}`;
    navigate(path);
  };

  const handleStartStudy = (deckId, forceReview = false) => {
    setIsForceReview(forceReview);
    setActiveDeckId(deckId);
    navigate("/study");
  };

  return (
    <AuthProvider>
      <Routes>
        {/* ========================================== */}
        {/* KHU VỰC TỰ DO: Ai cũng có thể vào          */}
        {/* ========================================== */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        <Route
          path="/login"
          element={
            <Login
              onLogin={handleLogin}
              onNavigateToRegister={() => handleNavigate("register")}
            />
          }
        />

        <Route
          path="/register"
          element={
            <Register
              onRegister={handleRegister}
              onNavigateToLogin={() => handleNavigate("login")}
            />
          }
        />

        {/* ========================================== */}
        {/* KHU VỰC BẢO MẬT: Bắt buộc phải có Token    */}
        {/* ========================================== */}
        <Route element={<ProtectedRoute />}>
          <Route
            path="/dashboard"
            element={
              <DashboardPage
                dynamicName={userName}
                onNavigate={handleNavigate}
                onStudy={handleStartStudy}
              />
            }
          />

          <Route
            path="/create"
            element={<CreateCardPage onNavigate={handleNavigate} />}
          />

          <Route
            path="/create-manual"
            element={<CreateFlashcardManualPage onNavigate={handleNavigate} />}
          />

          <Route
            path="/my-decks"
            element={
              <MyDecksPage
                onNavigate={handleNavigate}
                onStudy={handleStartStudy}
              />
            }
          />

          <Route
            path="/study"
            element={
              <ReviewPage
                deckId={activeDeckId}
                forceReview={isForceReview}
                onNavigate={handleNavigate}
                onFinish={() => handleNavigate("my-decks")}
              />
            }
          />

          <Route
            path="/cram-review"
            element={
              <CramReviewPage
                deckId={activeDeckId}
                onFinish={() => handleNavigate("my-decks")}
              />
            }
          />

          <Route
            path="/stats"
            element={<StatisticsPage onNavigate={handleNavigate} />}
          />

          <Route
            path="/community"
            element={<CommunityPage onNavigate={handleNavigate} />}
          />

          <Route
            path="/create-ai"
            element={<CreateCardAIPage onNavigate={handleNavigate} />}
          />
        </Route>

        {/* ========================================== */}
        {/* BẮT LỖI 404: Gõ bậy bạ thì về Login        */}
        {/* ========================================== */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>

      <TimeMachineWidget />
    </AuthProvider>
  );
}

export default App;
