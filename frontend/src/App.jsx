// frontend/src/App.jsx
import React, { useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Login from "./components/Auth/Login";
import Register from "./components/Auth/Register";
import ProtectedRoute from "./components/Auth/ProtectedRoute";

import DashboardPage from "./pages/DashboardPage";
import CreateCardPage from "./pages/CreateCardPage";
import CreateFlashcardManualPage from "./pages/CreateFlashcardManualPage";
import ReviewPage from "./pages/ReviewPage";
import MyDecksPage from "./pages/MyDecksPage";
// 👉 ĐÃ THÊM: Import trang Kho Đề Thi mới
import MyExamsPage from "./pages/MyExamsPage";
import CramReviewPage from "./pages/CramReviewPage";
import StatisticsPage from "./pages/StatisticsPage";
import CommunityPage from "./pages/CommunityPage";
import CreateCardAIPage from "./pages/CreateCardAIPage";
import CreateExamPage from "./pages/CreateExamPage";
import SettingsPage from "./pages/SettingsPage";
import ExamPage from "./pages/ExamPage";
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
    const defaultName = "Nguyễn Khắc Tuấn Đạt";
    setUserName(defaultName);

    // Lưu thông calculations vào bộ nhớ để Sidebar và SettingsPage lấy ra dùng
    localStorage.setItem("current_user_name", defaultName);
    localStorage.setItem("current_user_email", "nguyenkhactdat2007@gmail.com");

    navigate("/dashboard");
  };

  const handleRegister = (nameFromRegister) => {
    setUserName(nameFromRegister);
    navigate("/dashboard");
  };

  const handleNavigate = (view, deckId = null) => {
    setActiveDeckId(deckId);

    const routeMap = {
      login: "/login",
      register: "/register",
      dashboard: "/dashboard",
      create: "/create",
      "create-manual": "/create-manual",
      "my-decks": "/my-decks",
      "my-exams": "/my-exams", // 👉 ĐÃ THÊM: Map route cho Kho Đề Thi
      study: "/study",
      review: "/study",
      "cram-review": "/cram-review",
      stats: "/stats",
      community: "/community",
      "create-ai": "/create-ai",
      "create-exam": "/create-exam",
      settings: "/settings",
      exam: "/exam",
    };

    const path = routeMap[view] || `/${view}`;
    navigate(path);
  };

  const handleStartStudy = (deckId, forceReview = false) => {
    setIsForceReview(forceReview);
    setActiveDeckId(deckId);
    navigate("/study");
  };

  const handleStartExam = (deckId) => {
    setActiveDeckId(deckId);
    navigate("/exam");
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
                onExam={handleStartExam}
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
                onExam={handleStartExam}
              />
            }
          />

          {/* 👉 ĐÃ THÊM: Route gọi component MyExamsPage */}
          <Route
            path="/my-exams"
            element={
              <MyExamsPage
                onNavigate={handleNavigate}
                onExam={handleStartExam}
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
            path="/exam"
            element={
              <ExamPage
                deckId={activeDeckId}
                onNavigate={handleNavigate}
                onFinish={() => handleNavigate("my-exams")}
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

          <Route
            path="/create-exam"
            element={<CreateExamPage onNavigate={handleNavigate} />}
          />

          <Route
            path="/settings"
            element={<SettingsPage onNavigate={handleNavigate} />}
          />
        </Route>
      </Routes>

      <TimeMachineWidget />
    </AuthProvider>
  );
}

export default App;
