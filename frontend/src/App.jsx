import React, { useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Login from "./components/Auth/Login";
import Register from "./components/Auth/Register";
import ProtectedRoute from "./components/Auth/ProtectedRoute";
import ResetPassword from "./components/Auth/ResetPassword"; // 👉 ĐÃ BỔ SUNG

import DashboardPage from "./pages/Dashboard/DashboardPage";
import CreateCardPage from "./pages/Create/Flashcard/CreateCardPage";
import CreateFlashcardManualPage from "./pages/Create/Flashcard/CreateFlashcardManualPage";
import ReviewPage from "./pages/Study/ReviewPage";
import MyDecksPage from "./pages/Library/MyDecksPage";
import MyExamsPage from "./pages/Library/MyExamsPage";
import CramReviewPage from "./pages/Study/CramReviewPage";
import StatisticsPage from "./pages/Dashboard/StatisticsPage";
import CommunityPage from "./pages/Community/CommunityPage";
import CreateCardAIPage from "./pages/Create/Flashcard/CreateCardAIPage";
import CreateExamPage from "./pages/Study/CreateExamPage";
import CreateExamManualPage from "./pages/Create/Exam/CreateExamManualPage";
import SettingsPage from "./pages/Settings/SettingsPage";
import ExamPage from "./pages/Study/ExamPage";
import "./index.css";

import TimeMachineWidget from "./components/TimeMachineWidget";
import { AuthProvider } from "./context/AuthContext";

import QuickTestWaitingRoom from "./components/Community/QuickTest/QuickTestWaitingRoom";
import QuickTestHostPage from "./components/Community/QuickTest/QuickTestHostPage";
import QuickTestStudentPage from "./components/Community/QuickTest/QuickTestStudentPage";
import QuickTestModalManager from "./components/Community/QuickTest/QuickTestModalManager";

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

function App() {
  const navigate = useNavigate();

  const [userName, setUserName] = useState("");
  const [activeDeckId, setActiveDeckId] = useState(null);
  const [isForceReview, setIsForceReview] = useState(false);

  const handleLogin = () => {
    const defaultName = "Nguyễn Khắc Tuấn Đạt";
    setUserName(defaultName);

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
      "my-exams": "/my-exams", 
      study: "/study",
      review: "/study",
      "cram-review": "/cram-review",
      stats: "/stats",
      community: "/community",
      explore: "/community",
      contacts: "/community",
      "create-ai": "/create-ai",
      "create-exam": "/create-exam",
      "create-exam-manual": "/create-exam/manual",
      settings: "/settings",
      exam: "/exam",
      quicktest: "/quicktest", 
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

        {/* 👉 ĐÃ BỔ SUNG: Route để bắt link Khôi phục mật khẩu */}
        <Route
          path="/reset-password"
          element={<ResetPassword onNavigate={() => handleNavigate("login")} />}
        />

        <Route 
          path="/quicktest" 
          element={<QuickTestModalManager open={true} isRouteMode={true} onNavigate={handleNavigate} />} 
        />
        
        <Route 
          path="/quicktest/host/:roomCode" 
          element={<QuickTestHostPage onNavigate={handleNavigate} />} 
        />
        
        <Route 
          path="/quicktest/play/:roomCode" 
          element={<QuickTestStudentPage onNavigate={handleNavigate} />} 
        />

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
            path="/explore"
            element={<CommunityPage onNavigate={handleNavigate} />}
          />

          <Route
            path="/contacts"
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
            path="/create-exam/manual"
            element={<CreateExamManualPage onNavigate={handleNavigate} />}
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