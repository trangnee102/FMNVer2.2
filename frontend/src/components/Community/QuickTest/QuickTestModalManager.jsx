import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import QuickTestLeaderboardCard from "./QuickTestLeaderboardCard";
import QuickTestQuestionPanel from "./QuickTestQuestionPanel";
import { useQuickTestSocket } from "../../../hooks/useQuickTestSocket";
import api, { quickTestAPI } from "../../../services/api";
import Sidebar from "../../Layout/Sidebar";

// 👉 ĐÃ FIX: Cập nhật đường dẫn vào đúng thư mục Dashboard mới của bạn
import "../../../pages/Dashboard/DashboardPage.css";
import "./quicktest.css";

const DEFAULT_SETTINGS = {
  questionCount: 20,
  randomQuestions: true,
  randomAnswers: true,
  totalTime: 600,
  questionTime: 25,
  difficulty: "MEDIUM",
  resultMode: "SHOW_NOW",
};

const shuffleArray = (array) => {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

const parseOptions = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return [String(parsed)];
  } catch {
    return String(raw)
      .split(/[|,;\n]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
};

const formatDeckCount = (deck) => {
  return deck?.totalCards || deck?._count?.Flashcards || deck?.cards?.length || deck?.cardCount || deck?.questions?.length || 0;
};

const QuickTestModalManager = ({ 
  open = true, 
  onClose, 
  initialRole = null, 
  initialStep = null, 
  isRouteMode = false, 
  embed = false,
  roomCode: propRoomCode,
  onNavigate: propOnNavigate
}) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(initialStep || "role");
  const [role, setRole] = useState(initialRole || null);
  const [roomCode, setRoomCode] = useState(propRoomCode || "");
  const [participantName, setParticipantName] = useState("");
  const [joinError, setJoinError] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);
  const [roomLoading, setRoomLoading] = useState(false);
  const [roomError, setRoomError] = useState("");
  const [decks, setDecks] = useState([]);
  const [selectedDeckId, setSelectedDeckId] = useState("");
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [roomCreated, setRoomCreated] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const [roomQuestions, setRoomQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answerFeedback, setAnswerFeedback] = useState(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [hostActuallyStarted, setHostActuallyStarted] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const inputRef = useRef(null);
  const startTimeRef = useRef(null);

  const {
    participants,
    isStarted,
    isEnded,
    leaderboard,
    liveStats,
    questions,
    totalTime,
    resultMode,
    joinRoom,
    startTest,
    submitAnswer,
    endTest,
    syncParticipants,
    syncRoomStatus
  } = useQuickTestSocket();

  const currentQuestions = questions?.length > 0 ? questions : roomQuestions;
  const currentQuestion = currentQuestions?.[currentQuestionIndex] || null;
  const studentCount = participants.filter((item) => item.userRole === "STUDENT").length;
  const selectedDeck = useMemo(() => decks.find((item) => item.id === Number(selectedDeckId)) || null, [decks, selectedDeckId]);
  const actualTotalTime = totalTime > 0 ? totalTime : (settings.totalTime > 0 ? settings.totalTime : 600);

  const getCleanTitle = (titleRaw) => {
    if (!titleRaw) return "Bài thi QuickTest";
    return titleRaw.replace(/\(ai generated\)/ig, "").trim();
  };

  const selectedDeckTitle = getCleanTitle(selectedDeck?.title || selectedDeck?.name);

  const fetchQuestionsForRoom = async (code) => {
    let fetchedCards = [];
    try {
      const roomRes = await quickTestAPI.getRoom(code);
      const roomData = roomRes?.data?.data || roomRes?.data || {};

      if (roomData.duration) {
        const dt = parseInt(roomData.duration, 10);
        if (!isNaN(dt) && dt > 0) {
          setSettings(prev => ({ ...prev, totalTime: dt }));
        }
      }

      if (Array.isArray(roomData.questions) && roomData.questions.length > 0) fetchedCards = roomData.questions;
      else if (Array.isArray(roomData.Questions) && roomData.Questions.length > 0) fetchedCards = roomData.Questions;
      else if (Array.isArray(roomData.exam?.Flashcards) && roomData.exam.Flashcards.length > 0) fetchedCards = roomData.exam.Flashcards;
      else if (Array.isArray(roomData.Exam?.Flashcards) && roomData.Exam.Flashcards.length > 0) fetchedCards = roomData.Exam.Flashcards;
      else if (Array.isArray(roomData.exam?.cards) && roomData.exam.cards.length > 0) fetchedCards = roomData.exam.cards;
      else if (Array.isArray(roomData.Exam?.cards) && roomData.Exam.cards.length > 0) fetchedCards = roomData.Exam.cards;
      else if (Array.isArray(roomData.exam?.questions) && roomData.exam.questions.length > 0) fetchedCards = roomData.exam.questions;
      else if (Array.isArray(roomData.Exam?.questions) && roomData.Exam.questions.length > 0) fetchedCards = roomData.Exam.questions;
    } catch (e) {}

    if (fetchedCards.length === 0) {
      try {
        const qRes = await api.get(`/quicktest/rooms/${code}/questions`);
        const qData = qRes?.data?.data || qRes?.data || [];
        if (Array.isArray(qData) && qData.length > 0) {
          fetchedCards = qData;
        }
      } catch (e) {}
    }

    if (fetchedCards.length > 0) {
      const prepared = fetchedCards.map((card) => {
        const options = parseOptions(card.options || card.Options || card.choices || []);
        return {
          id: card.id,
          text: card.question || card.front_content || card.prompt || "",
          options: options.length > 0 ? shuffleArray(options) : options,
          correctAnswers: card.correct_answers || card.correctAnswer || card.answer || "",
          correctAnswer: card.correct_answers || card.correctAnswer || card.answer || "",
          answer: card.answer || card.correct_answers || "",
          type: card.question_type || card.QuestionType || "SINGLE_CHOICE",
          explanation: card.explanation || card.Explanation || card.note || card.reason || ""
        };
      });
      setRoomQuestions(prepared);
      return prepared;
    }
    return [];
  };

  useEffect(() => {
    if (propRoomCode) setRoomCode(propRoomCode);
  }, [propRoomCode]);

  useEffect(() => {
    if (!open) return;
    if (initialRole === "STUDENT") {
      setRole("STUDENT");
      setStep(initialStep || "join");
    } else if (initialRole === "TEACHER") {
      setRole("TEACHER");
      setStep(initialStep || "hostStep1_select");
    } else {
      setRole(null);
      setStep(initialStep || "role");
    }
  }, [open, initialRole, initialStep]);

  useEffect(() => {
    if (!open || role !== "TEACHER" || decks.length > 0) return;
    const fetchDecks = async () => {
      try {
        const response = await api.get("/decks?type=exam");
        let list = response?.data?.data || response?.data || response || [];
        
        if (Array.isArray(list) && list.length > 0) {
          const examsOnly = list.filter(d => d.type === 'exam' || d.is_exam || d.is_exam === 1 || d.is_exam === true);
          if (examsOnly.length > 0) {
            list = examsOnly;
          }
        }
        
        setDecks(Array.isArray(list) ? list : []);
      } catch (err) {}
    };
    fetchDecks();
  }, [open, role, decks.length]);

  useEffect(() => {
    let isMounted = true;
    if (role === "STUDENT" && isStarted) {
      if (currentQuestions.length > 0) {
        setHostActuallyStarted(true);
      } else {
        fetchQuestionsForRoom(roomCode).then(prepared => {
          if (isMounted && prepared.length > 0) {
            setHostActuallyStarted(true);
          }
        });
      }
    }
    return () => { isMounted = false; };
  }, [role, isStarted, currentQuestions.length, roomCode]);

  useEffect(() => {
    if (!open || role !== "STUDENT" || !hostActuallyStarted || actualTotalTime <= 0 || startTimeRef.current !== null) return undefined;
    startTimeRef.current = Date.now();
    setRemainingSeconds(actualTotalTime);
    const timer = setInterval(() => {
      const elapsedSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setRemainingSeconds(Math.max(actualTotalTime - elapsedSeconds, 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [open, role, hostActuallyStarted, actualTotalTime]);

  useEffect(() => {
    if (!open) return;
    if (step === "join" || step === "name") {
      inputRef.current?.focus();
    }
  }, [open, step]);

  useEffect(() => {
    setQuestionStartTime(Date.now());
  }, [currentQuestionIndex]);

  useEffect(() => {
    if (role === "TEACHER") {
      if (isEnded && step !== "result" && step !== "leaderboard") {
        setStep("result");
      } else if (roomCreated && isStarted && !isEnded && step !== "hostLive") {
        setStep("hostLive");
      } else if (roomCreated && !isStarted && !isEnded && step !== "hostStep4_waiting") {
        setStep("hostStep4_waiting");
      }
    } else if (role === "STUDENT") {
      if (hasJoined && isEnded && step !== "result" && step !== "leaderboard") {
        setStep("result");
      } else if (hasJoined && hostActuallyStarted && !isEnded && step !== "live") {
        setStep("live");
      } else if (hasJoined && !hostActuallyStarted && !isEnded && step !== "waiting") {
        setStep("waiting");
      }
    }
  }, [role, roomCreated, hasJoined, isStarted, isEnded, step, hostActuallyStarted]);

  useEffect(() => {
    let interval;
    if (roomCode && !isEnded) {
      interval = setInterval(() => {
        if (role === "TEACHER" && step === "hostStep4_waiting") {
          syncParticipants(roomCode);
        }
        if (role === "STUDENT" && (step === "waiting" || step === "live")) {
          syncRoomStatus(roomCode);
        }
      }, 2000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [role, step, roomCode, isEnded, syncParticipants, syncRoomStatus]);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape" && (step === "role" || step === "join" || step === "name" || step === "hostStep1_select")) {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [step, open]);

  const handleClose = () => {
    if (embed) {
      if (onClose) onClose();
      return;
    }
    if (isRouteMode) {
      if (propOnNavigate) {
        propOnNavigate("dashboard");
      } else {
        navigate("/community");
      }
    } else if (onClose) {
      onClose();
    }
  };

  const resetStudentSession = () => {
    setHasJoined(false);
    setJoinError("");
    setCurrentQuestionIndex(0);
    setAnswerFeedback(null);
    setRemainingSeconds(0);
    setHostActuallyStarted(false);
    startTimeRef.current = null;
  };

  const resetHostSession = () => {
    setRoomCreated(false);
    setRoomCode("");
    setRoomQuestions([]);
    setCurrentQuestionIndex(0);
    setRoomError("");
  };

  const loadQuestionsForDeck = (cards) => {
    const filtered = (cards || []).filter((card) => {
      if (settings.difficulty !== "ALL" && card.difficulty) {
        if (String(card.difficulty).toUpperCase() !== settings.difficulty) {
          return false;
        }
      }
      return true;
    });

    const prepared = filtered.map((card) => {
      const options = parseOptions(card.options || card.Options || card.choices || []);
      return {
        id: card.id,
        text: card.question || card.front_content || card.prompt || "",
        options: settings.randomAnswers && options.length > 0 ? shuffleArray(options) : options,
        correctAnswers: card.correct_answers || card.correctAnswer || card.answer || "",
        correctAnswer: card.correct_answers || card.correctAnswer || card.answer || "",
        answer: card.answer || card.correct_answers || "",
        type: card.question_type || card.QuestionType || "SINGLE_CHOICE",
      };
    });

    const selected = settings.randomQuestions ? shuffleArray(prepared) : prepared;
    return selected.slice(0, Math.max(1, Number(settings.questionCount) || 1));
  };

  const handleSelectRole = (selectedRole) => {
    setRole(selectedRole);
    setRoomError("");
    setJoinError("");
    if (selectedRole === "STUDENT") {
      setStep("join");
      resetStudentSession();
    } else {
      setStep("hostStep1_select");
      resetHostSession();
    }
  };

  const handleCheckRoom = async (event) => {
    event?.preventDefault();
    const normalizedCode = roomCode.trim().toUpperCase();
    if (!normalizedCode) {
      setJoinError("Vui lòng nhập mã phòng.");
      return;
    }
    setJoinLoading(true);
    setJoinError("");
    try {
      await quickTestAPI.getRoom(normalizedCode);
      setStep("name");
    } catch (err) {
      setJoinError("Mã phòng không tồn tại hoặc đã kết thúc.");
    } finally {
      setJoinLoading(false);
    }
  };

  const handleStudentJoin = async (event) => {
    event?.preventDefault();
    const normalizedCode = roomCode.trim().toUpperCase();
    const normalizedName = participantName.trim();
    if (!normalizedName) {
      setJoinError("Vui lòng nhập tên của bạn.");
      return;
    }

    setJoinLoading(true);
    setJoinError("");
    try {
      await fetchQuestionsForRoom(normalizedCode);
      await quickTestAPI.joinRoom(normalizedCode, normalizedName);
      joinRoom(normalizedCode, "STUDENT", normalizedName);
      setRoomCode(normalizedCode);
      setHasJoined(true);
      setStep("waiting");
    } catch (err) {
      setJoinError(err?.message || "Không thể tham gia phòng. Vui lòng thử lại.");
    } finally {
      setJoinLoading(false);
    }
  };

  const handleCreateRoom = async () => {
    if (!selectedDeckId) {
      setRoomError("Vui lòng chọn bộ đề thi.");
      return;
    }

    setRoomLoading(true);
    setRoomError("");

    try {
      const deckResponse = await quickTestAPI.getDeckQuestions(selectedDeckId);
      const cards = deckResponse?.data || deckResponse || [];
      const selectedQuestions = loadQuestionsForDeck(Array.isArray(cards) ? cards : []);

      if (selectedQuestions.length === 0) {
        throw new Error("Không có câu hỏi hợp lệ trong bộ đề đã chọn.");
      }

      const payload = {
        examId: selectedDeckId,
        title: selectedDeckTitle,
        duration: settings.totalTime
      };

      let response;
      try {
        response = await api.post("/quicktest/rooms", payload);
      } catch (e) {
        response = await quickTestAPI.createRoom(payload);
      }

      const code = response?.data?.data?.roomCode || response?.data?.roomCode || response?.roomCode || "";
      if (!code) {
        throw new Error("Không lấy được mã phòng.");
      }

      setRoomCode(code);
      setRoomQuestions(selectedQuestions);
      setRoomCreated(true);
      joinRoom(code, "HOST", "Giáo Viên", { ...settings, resultMode: settings.resultMode }, selectedQuestions);
    } catch (err) {
      const backendMessage = err?.message || err?.data?.message || err?.response?.data?.message;
      setRoomError(backendMessage || "Không thể tạo phòng QuickTest.");
    } finally {
      setRoomLoading(false);
    }
  };

  const handleStartHost = async () => {
    if (!roomCode) return;
    try {
      await api.put(`/quicktest/rooms/${roomCode}/start`);
    } catch (e) {}
    startTest(roomCode, settings.totalTime, roomQuestions);
  };

  const handleEndHost = async () => {
    if (!roomCode) return;
    try {
      await api.put(`/quicktest/rooms/${roomCode}/end`);
    } catch (e) {}
    endTest(roomCode);
  };

  const handleStudentAnswer = (answer) => {
    if (!currentQuestion) return;
    const timeTaken = Math.floor((Date.now() - questionStartTime) / 1000);
    submitAnswer({
      roomCode,
      questionId: currentQuestion.id,
      selectedAnswer: answer,
      answerTime: timeTaken > 0 ? timeTaken : 1,
    });

    const isCorrect = currentQuestion.correctAnswers
      ? String(answer).trim().toLowerCase() === String(currentQuestion.correctAnswer || currentQuestion.answer || currentQuestion.correctAnswers).trim().toLowerCase()
      : false;

    if (resultMode === "SHOW_NOW") {
      setAnswerFeedback({ isCorrect, answer });
    } else {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const handleNextQuestion = () => {
    setAnswerFeedback(null);
    setCurrentQuestionIndex((prev) => prev + 1);
  };

  if (!open) return null;

  const btnCloseStyle = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: '56px', height: '56px', borderRadius: '50%',
    fontSize: '2rem', border: 'none', backgroundColor: '#f1f5f9',
    color: '#64748b', cursor: 'pointer', transition: 'all 0.2s ease',
    boxShadow: '0 4px 10px rgba(0,0,0,0.08)'
  };

  const renderModalContent = () => {
    if (step === "role") {
      return (
        <div className="quicktest-modal-card quicktest-role-card" style={{ marginTop: '40px', position: 'relative' }}>
          <button style={{ ...btnCloseStyle, position: 'absolute', top: '24px', right: '24px' }} onClick={handleClose} onMouseOver={(e) => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#dc2626'; e.currentTarget.style.borderColor = '#fca5a5'; }} onMouseOut={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#64748b'; e.currentTarget.style.borderColor = '#cbd5e1'; }}>
            <i className="fa-solid fa-xmark"></i>
          </button>
          <div className="quicktest-header-group quicktest-center">
            <div className="quicktest-pill" style={{ marginBottom: '16px' }}>⚡ QuickTest</div>
            <h2>Hãy chọn vai trò của bạn</h2>
            <p>Nền tảng kiểm tra trực tuyến Real-time đỉnh cao dành cho lớp học.</p>
          </div>
          <div className="quicktest-role-grid">
            <button className="quicktest-role-card-btn" onClick={() => handleSelectRole("TEACHER")}>
              <div className="quicktest-role-icon">👨‍🏫</div>
              <h3>Giáo viên</h3>
              <p>Tạo phòng thi từ Bộ đề, quản lý học sinh và theo dõi kết quả Live.</p>
            </button>
            <button className="quicktest-role-card-btn" onClick={() => handleSelectRole("STUDENT")}>
              <div className="quicktest-role-icon">👨‍🎓</div>
              <h3>Học sinh</h3>
              <p>Nhập mã phòng để tham gia làm bài ngay lập tức cùng bạn bè.</p>
            </button>
          </div>
        </div>
      );
    }

    if (step === "join") {
      return (
        <div className="quicktest-modal-card quicktest-compact-card" style={{ marginTop: '60px', position: 'relative' }}>
          <button style={{ ...btnCloseStyle, position: 'absolute', top: '24px', right: '24px' }} onClick={handleClose} onMouseOver={(e) => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#dc2626'; e.currentTarget.style.borderColor = '#fca5a5'; }} onMouseOut={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#64748b'; e.currentTarget.style.borderColor = '#cbd5e1'; }}>
            <i className="fa-solid fa-xmark"></i>
          </button>
          <div className="quicktest-modal-topbar">
            <button className="quicktest-back-btn" onClick={() => setStep("role")}>← Quay lại</button>
          </div>
          <div className="quicktest-header-group quicktest-center">
            <div className="quicktest-role-icon" style={{ fontSize: '3rem', marginBottom: '10px' }}>🎮</div>
            <h2>Tham gia thi</h2>
            <p>Nhập mã phòng do giáo viên cung cấp</p>
          </div>
          <form onSubmit={handleCheckRoom} className="quicktest-form-stack">
            <label className="quicktest-input-group">
              <input
                ref={inputRef}
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="VD: FMN5821"
                maxLength={12}
                style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.2em' }}
              />
            </label>
            {joinError && <div className="quicktest-inline-error">{joinError}</div>}
            <button type="submit" className="quicktest-primary-btn" disabled={joinLoading || !roomCode}>
              {joinLoading ? "⏳ Đang kiểm tra..." : "Tiếp tục"}
            </button>
          </form>
        </div>
      );
    }

    if (step === "name") {
      return (
        <div className="quicktest-modal-card quicktest-compact-card" style={{ marginTop: '60px', position: 'relative' }}>
          <button style={{ ...btnCloseStyle, position: 'absolute', top: '24px', right: '24px' }} onClick={handleClose} onMouseOver={(e) => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#dc2626'; e.currentTarget.style.borderColor = '#fca5a5'; }} onMouseOut={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#64748b'; e.currentTarget.style.borderColor = '#cbd5e1'; }}>
            <i className="fa-solid fa-xmark"></i>
          </button>
          <div className="quicktest-modal-topbar">
            <button className="quicktest-back-btn" onClick={() => setStep("join")}>← Quay lại</button>
          </div>
          <div className="quicktest-header-group quicktest-center">
            <div className="quicktest-role-icon" style={{ fontSize: '3rem', marginBottom: '10px' }}>😉</div>
            <h2>Tên của bạn</h2>
            <p>Tên sẽ hiển thị trên bảng xếp hạng</p>
          </div>
          <form onSubmit={handleStudentJoin} className="quicktest-form-stack">
            <label className="quicktest-input-group">
              <input
                ref={inputRef}
                value={participantName}
                onChange={(e) => setParticipantName(e.target.value)}
                placeholder="Ví dụ: Nguyễn Văn A"
                style={{ textAlign: 'center', fontSize: '1.2rem' }}
              />
            </label>
            {joinError && <div className="quicktest-inline-error">{joinError}</div>}
            <button type="submit" className="quicktest-primary-btn" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }} disabled={joinLoading || !participantName}>
              {joinLoading ? "⏳ Đang tham gia..." : "Vào Phòng Ngay"}
            </button>
          </form>
        </div>
      );
    }

    if (step === "hostStep1_select") {
      return (
        <div className="quicktest-modal-card quicktest-wide-card" style={{ marginTop: '20px', position: 'relative' }}>
          <button style={{ ...btnCloseStyle, position: 'absolute', top: '24px', right: '24px' }} onClick={() => setStep("role")} onMouseOver={(e) => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#dc2626'; e.currentTarget.style.borderColor = '#fca5a5'; }} onMouseOut={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#64748b'; e.currentTarget.style.borderColor = '#cbd5e1'; }}>
            <i className="fa-solid fa-xmark"></i>
          </button>
          <div className="quicktest-modal-topbar" style={{ marginBottom: '24px' }}>
            <div className="quicktest-header-group" style={{ margin: 0 }}>
              <h2 style={{ fontSize: '1.8rem' }}>Bước 1: Chọn Bộ đề thi</h2>
              <p>Dữ liệu được lấy trực tiếp từ kho đề thi của bạn.</p>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', maxHeight: '55vh', overflowY: 'auto', padding: '10px 4px' }}>
            {decks.length === 0 ? (
              <div className="quicktest-empty-state" style={{ gridColumn: '1 / -1', padding: '40px' }}>Bạn chưa có đề thi nào trong thư viện.</div>
            ) : (
              decks.map(deck => {
                const rawTitle = deck.title || deck.name || "Đề thi";
                const cleanTitle = getCleanTitle(rawTitle);

                return (
                  <div
                    key={deck.id}
                    onClick={() => {
                      setSelectedDeckId(deck.id);
                      const maxQ = formatDeckCount(deck);
                      setSettings(prev => ({ ...prev, questionCount: Math.min(20, maxQ > 0 ? maxQ : 20) }));
                    }}
                    style={{
                      padding: '24px', borderRadius: '20px', cursor: 'pointer', border: '2px solid',
                      borderColor: selectedDeckId === deck.id ? '#4f46e5' : '#e2e8f0',
                      backgroundColor: selectedDeckId === deck.id ? '#eef2ff' : '#fff',
                      transition: 'all 0.2s ease',
                      boxShadow: selectedDeckId === deck.id ? '0 10px 25px rgba(79, 70, 229, 0.15)' : 'none'
                    }}
                  >
                    <h3 style={{ margin: '0 0 8px 0', color: '#0f172a', fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {cleanTitle}
                    </h3>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>{formatDeckCount(deck)} Questions • {deck.difficulty || "Mixed"}</p>
                  </div>
                );
              })
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
            <button className="quicktest-primary-btn" disabled={!selectedDeckId} onClick={() => setStep("hostStep2_settings")}>
              Tiếp tục →
            </button>
          </div>
        </div>
      );
    }

    if (step === "hostStep2_settings") {
      const maxQuestions = formatDeckCount(selectedDeck);
      return (
        <div className="quicktest-modal-card quicktest-wide-card" style={{ maxWidth: '800px', marginTop: '20px' }}>
          <div className="quicktest-modal-topbar" style={{ marginBottom: '24px' }}>
            <button className="quicktest-back-btn" onClick={() => setStep("hostStep1_select")}>← Quay lại</button>
            <div className="quicktest-header-group" style={{ textAlign: 'right', margin: 0 }}>
              <h2 style={{ fontSize: '1.8rem' }}>Bước 2: Cài đặt bài thi</h2>
            </div>
          </div>
          <div className="quicktest-host-panel" style={{ padding: '30px' }}>
            <div className="quicktest-grid-2">
              <label className="quicktest-input-group">
                <span>Số lượng câu hỏi (Tối đa {maxQuestions})</span>
                <input 
                  type="number" 
                  min="1" 
                  max={maxQuestions}
                  value={settings.questionCount} 
                  onChange={(e) => {
                    let val = Number(e.target.value);
                    if (val > maxQuestions) val = maxQuestions;
                    if (val < 1) val = 1;
                    setSettings({ ...settings, questionCount: val });
                  }} 
                />
              </label>
              <label className="quicktest-input-group">
                <span>Thời gian thi (Phút)</span>
                <input type="number" min="1" value={Math.ceil(settings.totalTime / 60)} onChange={(e) => setSettings({ ...settings, totalTime: Number(e.target.value) * 60 })} />
              </label>
            </div>
            <div className="quicktest-grid-2" style={{ marginTop: '20px' }}>
              <label className="quicktest-input-group">
                <span>Độ khó ưu tiên</span>
                <select value={settings.difficulty} onChange={(e) => setSettings({ ...settings, difficulty: e.target.value })}>
                  <option value="ALL">Trộn lẫn (Tất cả)</option>
                  <option value="EASY">Dễ</option>
                  <option value="MEDIUM">Trung bình</option>
                  <option value="HARD">Khó</option>
                </select>
              </label>
              <label className="quicktest-input-group">
                <span>Chế độ hiển thị</span>
                <select value={settings.resultMode} onChange={(e) => setSettings({ ...settings, resultMode: e.target.value })}>
                  <option value="SHOW_NOW">Hiện đáp án ngay</option>
                  <option value="SHOW_END">Chỉ hiện cuối bài</option>
                </select>
              </label>
            </div>
            <div className="quicktest-toggle-stack" style={{ marginTop: '30px', flexDirection: 'row', gap: '30px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
              <label className="quicktest-toggle-row">
                <input type="checkbox" checked={settings.randomQuestions} onChange={(e) => setSettings({ ...settings, randomQuestions: e.target.checked })} style={{ width: '20px', height: '20px' }} />
                <span style={{ fontSize: '1.1rem' }}>Đảo câu hỏi</span>
              </label>
              <label className="quicktest-toggle-row">
                <input type="checkbox" checked={settings.randomAnswers} onChange={(e) => setSettings({ ...settings, randomAnswers: e.target.checked })} style={{ width: '20px', height: '20px' }} />
                <span style={{ fontSize: '1.1rem' }}>Đảo đáp án</span>
              </label>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
            <button className="quicktest-primary-btn" onClick={() => setStep("hostStep3_preview")}>
              Tiếp tục →
            </button>
          </div>
        </div>
      );
    }

    if (step === "hostStep3_preview") {
      return (
        <div className="quicktest-modal-card quicktest-wide-card" style={{ maxWidth: '800px', marginTop: '20px' }}>
          <div className="quicktest-modal-topbar" style={{ marginBottom: '24px' }}>
            <button className="quicktest-back-btn" onClick={() => setStep("hostStep2_settings")}>← Quay lại</button>
            <div className="quicktest-header-group" style={{ textAlign: 'right', margin: 0 }}>
              <h2 style={{ fontSize: '1.8rem' }}>Bước 3: Tổng quan & Bắt đầu</h2>
            </div>
          </div>
          <div className="quicktest-host-panel quicktest-host-side-panel" style={{ padding: '32px' }}>
            <h3 style={{ fontSize: '1.6rem', color: '#1e40af', marginBottom: '20px', marginTop: 0 }}>{selectedDeckTitle}</h3>
            <ul className="quicktest-info-list" style={{ fontSize: '1.15rem', lineHeight: '2.2', paddingLeft: 0, listStyle: 'none' }}>
              <li style={{ borderBottom: '1px solid #c7d2fe', display: 'flex', justifyContent: 'space-between' }}><strong>Số câu hỏi:</strong> <span>{settings.questionCount}</span></li>
              <li style={{ borderBottom: '1px solid #c7d2fe', display: 'flex', justifyContent: 'space-between' }}><strong>Thời gian:</strong> <span>{Math.ceil(settings.totalTime / 60)} phút</span></li>
              <li style={{ borderBottom: '1px solid #c7d2fe', display: 'flex', justifyContent: 'space-between' }}><strong>Độ khó:</strong> <span>{settings.difficulty === "ALL" ? "Tất cả" : settings.difficulty}</span></li>
              <li style={{ borderBottom: '1px solid #c7d2fe', display: 'flex', justifyContent: 'space-between' }}><strong>Trộn câu hỏi:</strong> <span>{settings.randomQuestions ? "Bật" : "Tắt"}</span></li>
              <li style={{ display: 'flex', justifyContent: 'space-between' }}><strong>Đảo đáp án:</strong> <span>{settings.randomAnswers ? "Bật" : "Tắt"}</span></li>
            </ul>
          </div>
          {roomError && <div className="quicktest-inline-error" style={{ marginTop: '20px' }}>{roomError}</div>}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '32px' }}>
            <button className="quicktest-primary-btn" style={{ padding: '18px 40px', fontSize: '1.3rem', width: '100%', maxWidth: '400px' }} onClick={handleCreateRoom} disabled={roomLoading}>
              {roomLoading ? "⏳ Đang tạo..." : "🚀 TẠO PHÒNG QUICKTEST"}
            </button>
          </div>
        </div>
      );
    }

    if (step === "hostStep4_waiting") {
      return (
        <div className="quicktest-modal-card quicktest-wide-card" style={{ marginTop: '20px' }}>
          <div className="quicktest-modal-topbar">
            <button className="quicktest-secondary-btn" style={{ color: '#b91c1c' }} onClick={resetHostSession}>Hủy phòng</button>
            <div className="quicktest-pill quicktest-pill-success">Đang chờ học sinh...</div>
          </div>
          <div className="quicktest-header-group quicktest-center" style={{ margin: '30px 0' }}>
            <p style={{ textTransform: 'uppercase', letterSpacing: '0.15em', color: '#4f46e5', fontWeight: 'bold', margin: '0 0 10px 0' }}>Mã phòng tham gia</p>
            <div style={{ background: '#f8fafc', display: 'inline-block', padding: '20px 60px', borderRadius: '30px', border: '2px solid #e2e8f0', cursor: 'pointer' }} onClick={() => navigator.clipboard.writeText(roomCode)}>
              <h1 style={{ fontSize: '6rem', margin: 0, color: '#0f172a', letterSpacing: '0.15em', lineHeight: 1 }}>{roomCode}</h1>
              <p style={{ margin: '10px 0 0 0', color: '#64748b', fontSize: '0.95rem' }}>Nhấp để sao chép mã</p>
            </div>
          </div>
          <div className="quicktest-room-summary" style={{ justifyContent: 'center', marginBottom: '20px' }}>
            <div className="quicktest-room-stat-card" style={{ maxWidth: '300px', textAlign: 'center', background: '#eef2ff', borderColor: '#c7d2fe' }}>
              <span style={{ color: '#4f46e5' }}>Học sinh đã tham gia</span>
              <strong style={{ fontSize: '2.5rem', color: '#312e81' }}>{studentCount}</strong>
            </div>
          </div>
          <div className="quicktest-host-panel" style={{ minHeight: '150px', maxHeight: '250px', overflowY: 'auto', marginBottom: '30px', background: '#fff' }}>
            {studentCount === 0 ? (
              <div className="quicktest-empty-state" style={{ background: 'transparent' }}>Đang chờ học sinh truy cập...</div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', padding: '10px' }}>
                {participants.filter(p => p.userRole === "STUDENT").map((p, i) => (
                  <div key={i} className="quicktest-pill" style={{ background: '#f1f5f9', color: '#1e293b', border: '1px solid #cbd5e1', fontSize: '1.05rem', padding: '10px 20px' }}>
                    👤 {p.userName}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button 
              className="quicktest-primary-btn" 
              style={{ padding: '20px 60px', fontSize: '1.4rem' }} 
              onClick={() => {
                if (studentCount === 0) {
                  if(!window.confirm("Chưa có học sinh nào. Bạn có chắc chắn muốn bắt đầu không?")) return;
                }
                handleStartHost();
              }}
            >
              BẮT ĐẦU KIỂM TRA ▶
            </button>
          </div>
        </div>
      );
    }

    if (step === "hostLive") {
      const studentsList = participants.filter(p => p.userRole === "STUDENT");
      return (
        <div className="quicktest-modal-card quicktest-live-card" style={{ maxWidth: '1200px', marginTop: '10px', background: '#f8fafc', padding: '30px' }}>
          <div className="quicktest-modal-topbar" style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '20px', marginBottom: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div className="quicktest-pill quicktest-pill-success" style={{ background: '#fee2e2', color: '#dc2626', fontSize: '1.1rem', padding: '8px 16px', fontWeight: '800', border: '1px solid #fca5a5' }}>
                <i className="fa-solid fa-circle" style={{ fontSize: '0.6rem', marginRight: '6px', animation: 'pulse 1.5s infinite' }}></i> LIVE
              </div>
              <div style={{ fontSize: '1.2rem', color: '#1e293b', fontWeight: '700' }}>PIN: <span style={{ letterSpacing: '2px', color: '#4f46e5' }}>{roomCode}</span></div>
            </div>
            
            <div style={{ display: 'flex', gap: '15px' }}>
              <button className="quicktest-secondary-btn" style={{ borderColor: '#e2e8f0', color: '#475569', borderRadius: '12px', padding: '12px 24px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }} onClick={() => setStep("leaderboard")}>
                <i className="fa-solid fa-trophy" style={{ color: '#f59e0b' }}></i> Bảng Xếp Hạng
              </button>
              <button className="quicktest-close-btn" style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: '12px', padding: '12px 24px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 15px rgba(239,68,68,0.3)' }} onClick={handleEndHost}>
                <i className="fa-solid fa-stop"></i> Kết thúc bài thi
              </button>
            </div>
          </div>

          <div className="quicktest-header-group" style={{ marginBottom: '30px' }}>
            <h2 style={{ fontSize: '2rem', margin: '0 0 8px 0', color: '#0f172a', fontWeight: '900' }}>{selectedDeckTitle}</h2>
            <p style={{ margin: 0, color: '#64748b', fontSize: '1.1rem' }}>Giám sát tiến độ học sinh trực tiếp theo thời gian thực</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div className="quicktest-dashboard-panel" style={{ padding: '24px', background: '#fff', borderRadius: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9' }}>
                <h3 style={{ fontSize: '1.2rem', margin: '0 0 20px 0', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <i className="fa-solid fa-chart-pie" style={{color: '#4f46e5'}}></i> Thống kê tổng quan
                </h3>
                <div className="quicktest-grid-2">
                  <div className="quicktest-room-stat-card" style={{ background: '#eff6ff', borderColor: '#bfdbfe', padding: '20px', borderRadius: '16px' }}>
                    <span style={{ color: '#2563eb', fontSize: '1rem', fontWeight: '700' }}>Đã hoàn thành</span>
                    <div style={{ margin: '12px 0', display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                      <strong style={{ color: '#1e3a8a', fontSize: '2.5rem', lineHeight: 1 }}>{liveStats.completedCount}</strong>
                      <span style={{ fontSize: '1.2rem', color: '#60a5fa', fontWeight: 'bold' }}>/ {studentCount}</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: '#dbeafe', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: '#3b82f6', width: `${studentCount > 0 ? (liveStats.completedCount / studentCount) * 100 : 0}%`, transition: 'width 0.5s ease' }}></div>
                    </div>
                  </div>
                  <div className="quicktest-room-stat-card" style={{ background: '#ecfdf5', borderColor: '#a7f3d0', padding: '20px', borderRadius: '16px' }}>
                    <span style={{ color: '#059669', fontSize: '1rem', fontWeight: '700' }}>Tỷ lệ nộp bài</span>
                    <div style={{ margin: '12px 0', display: 'flex', alignItems: 'baseline' }}>
                      <strong style={{ color: '#064e3b', fontSize: '2.5rem', lineHeight: 1 }}>{studentCount > 0 ? Math.round((liveStats.completedCount / studentCount) * 100) : 0}%</strong>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: '#d1fae5', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: '#10b981', width: `${studentCount > 0 ? (liveStats.completedCount / studentCount) * 100 : 0}%`, transition: 'width 0.5s ease' }}></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="quicktest-dashboard-panel" style={{ padding: '24px', flex: 1, background: '#fff', borderRadius: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9' }}>
                <h3 style={{ fontSize: '1.2rem', margin: '0 0 20px 0', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <i className="fa-solid fa-users" style={{color: '#10b981'}}></i> Quá trình làm bài ({studentCount})
                </h3>
                <div style={{ maxHeight: '250px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '6px' }}>
                  {studentsList.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                      <i className="fa-solid fa-user-slash" style={{ fontSize: '2rem', marginBottom: '10px' }}></i>
                      <p style={{ margin: 0 }}>Chưa có học sinh trong phòng</p>
                    </div>
                  ) : (
                    studentsList.map((st, idx) => {
                      const lbItem = leaderboard.find(l => l.userName === st.userName || l.studentName === st.userName);
                      const isDone = lbItem?.isFinished || false;
                      
                      return (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', background: isDone ? '#f8fafc' : '#fff', borderRadius: '14px', border: `1px solid ${isDone ? '#e2e8f0' : '#cbd5e1'}`, transition: 'all 0.2s', boxShadow: isDone ? 'none' : '0 2px 8px rgba(0,0,0,0.02)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: isDone ? '#e2e8f0' : '#e0e7ff', color: isDone ? '#64748b' : '#4f46e5', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: '900', fontSize: '1.1rem' }}>
                              {st.userName ? st.userName.charAt(0).toUpperCase() : "S"}
                            </div>
                            <span style={{ fontWeight: '700', color: '#1e293b', fontSize: '1.05rem' }}>{st.userName}</span>
                          </div>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <div style={{ fontWeight: '800', color: isDone ? '#64748b' : '#4f46e5', fontSize: '1.05rem', minWidth: '50px', textAlign: 'right' }}>
                               {lbItem ? `${lbItem.score ?? 0} đ` : '0 đ'}
                            </div>
                            <div style={{ background: isDone ? '#dcfce7' : '#d1fae5', color: isDone ? '#166534' : '#065f46', fontSize: '0.85rem', padding: '6px 12px', borderRadius: '8px', fontWeight: '700', width: '110px', textAlign: 'center' }}>
                              {isDone ? 'Đã nộp bài ✅' : 'Đang làm... 🟢'}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="quicktest-leaderboard-preview" style={{ padding: '24px', background: '#fff', borderRadius: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', height: '100%' }}>
              <h3 style={{ fontSize: '1.3rem', margin: '0 0 20px 0', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px' }}>
                 <i className="fa-solid fa-trophy" style={{color: '#f59e0b'}}></i> Bảng xếp hạng Live
              </h3>
              <div className="quicktest-leaderboard-list" style={{ flex: 1, overflowY: 'auto', minHeight: '320px', paddingRight: '5px' }}>
                {leaderboard.length === 0 ? (
                  <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                    <i className="fa-solid fa-ranking-star" style={{ fontSize: '3rem', marginBottom: '15px', opacity: 0.5 }}></i>
                    <p style={{ margin: 0, fontWeight: '600' }}>Chưa có dữ liệu điểm số</p>
                  </div>
                ) : (
                  leaderboard.slice(0, 10).map((item, idx) => (
                    <div key={item.participantId || idx} style={{ padding: '16px 20px', marginBottom: '12px', background: idx === 0 ? '#fffbeb' : idx === 1 ? '#f8fafc' : idx === 2 ? '#fff7ed' : '#fff', border: `1px solid ${idx === 0 ? '#fde68a' : idx === 1 ? '#e2e8f0' : idx === 2 ? '#ffedd5' : '#f1f5f9'}`, borderRadius: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <span style={{ fontSize: '1.4rem', fontWeight: '900', color: idx === 0 ? '#d97706' : idx === 1 ? '#64748b' : idx === 2 ? '#b45309' : '#94a3b8', minWidth: '25px', textAlign: 'center' }}>
                          {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}`}
                        </span>
                        <strong style={{ fontSize: '1.1rem', color: '#1e293b' }}>{item.studentName || item.userName || "Học sinh"}</strong>
                      </div>
                      <em style={{ fontStyle: 'normal', color: '#4f46e5', fontWeight: '900', fontSize: '1.25rem' }}>{item.score ?? 0} đ</em>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (step === "waiting") {
      return (
        <div className="quicktest-modal-card quicktest-wide-card" style={{ maxWidth: '600px', marginTop: '60px', position: 'relative' }}>
          <button style={{ ...btnCloseStyle, position: 'absolute', top: '24px', right: '24px' }} onClick={() => { resetStudentSession(); setStep("join"); }} onMouseOver={(e) => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#dc2626'; e.currentTarget.style.borderColor = '#fca5a5'; }} onMouseOut={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#64748b'; e.currentTarget.style.borderColor = '#cbd5e1'; }}>
            <i className="fa-solid fa-xmark"></i>
          </button>
          <div className="quicktest-modal-topbar">
            <div className="quicktest-pill quicktest-pill-success">🟢 Phòng chờ</div>
          </div>
          <div className="quicktest-header-group quicktest-center" style={{ margin: '40px 0' }}>
            <div className="quicktest-role-icon" style={{ fontSize: '5rem', marginBottom: '20px' }}>⏳</div>
            <h2 style={{ fontSize: '2.5rem' }}>Bạn đã vào phòng!</h2>
            <p style={{ fontSize: '1.2rem' }}>Xin chào <strong style={{ color: '#4f46e5' }}>{participantName}</strong>, hãy chuẩn bị sẵn sàng.<br/>Giáo viên sẽ bắt đầu bài thi trong giây lát...</p>
          </div>
          <div className="quicktest-center" style={{ marginTop: '40px', padding: '20px', background: '#f8fafc', borderRadius: '20px' }}>
             <p style={{ color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '10px' }}>Mã phòng hiện tại</p>
             <div className="quicktest-pill" style={{ fontSize: '2rem', padding: '16px 40px', letterSpacing: '0.15em', background: '#fff', border: '2px solid #e2e8f0' }}>{roomCode}</div>
          </div>
        </div>
      );
    }

    if (step === "live") {
      if (!hostActuallyStarted || currentQuestions.length === 0) {
        return (
          <div className="quicktest-modal-card quicktest-live-card" style={{ marginTop: '20px', minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
               <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '3rem', color: '#4f46e5', marginBottom: '20px' }}></i>
               <h2 style={{ fontSize: '1.8rem', color: '#1e293b' }}>Đang đồng bộ dữ liệu...</h2>
               <p style={{ fontSize: '1.1rem', color: '#64748b' }}>Vui lòng giữ nguyên màn hình.</p>
            </div>
          </div>
        );
      }

      return (
        <div className="quicktest-modal-card quicktest-live-card" style={{ marginTop: '20px', padding: '0', overflow: 'hidden', background: '#f8fafc' }}>
          <div style={{ background: '#fff', padding: '20px 30px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{ background: '#eef2ff', color: '#4f46e5', padding: '8px 16px', borderRadius: '30px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-user"></i> {participantName}
              </div>
              <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#1e293b' }}>{selectedDeckTitle}</h2>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{ fontWeight: 'bold', color: '#64748b', fontSize: '1.1rem' }}>
                Câu {currentQuestion ? currentQuestionIndex + 1 : 0} <span style={{ color: '#cbd5e1' }}>/</span> {currentQuestions.length || 0}
              </div>
              <div style={{ background: remainingSeconds <= 10 ? '#fee2e2' : '#f1f5f9', color: remainingSeconds <= 10 ? '#dc2626' : '#334155', padding: '10px 20px', borderRadius: '12px', fontWeight: '900', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px', border: `2px solid ${remainingSeconds <= 10 ? '#fca5a5' : '#e2e8f0'}` }}>
                <i className="fa-solid fa-clock"></i> {remainingSeconds}s
              </div>
            </div>
          </div>

          <div style={{ width: '100%', height: '6px', background: '#e2e8f0' }}>
            <div style={{ height: '100%', background: 'linear-gradient(90deg, #4f46e5 0%, #8b5cf6 100%)', width: `${((currentQuestionIndex) / (currentQuestions.length || 1)) * 100}%`, transition: 'width 0.4s ease' }}></div>
          </div>

          <div style={{ padding: '40px' }}>
            {currentQuestion ? (
              <QuickTestQuestionPanel
                question={currentQuestion}
                progress={currentQuestionIndex + 1}
                total={currentQuestions.length}
                timeLeft={remainingSeconds}
                resultMode={resultMode}
                onAnswer={handleStudentAnswer}
                answerFeedback={answerFeedback}
                onNext={handleNextQuestion}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
                 <div style={{ fontSize: '5rem', marginBottom: '20px' }}>🏁</div>
                 <h2 style={{ fontSize: '2.2rem', color: '#1e293b', marginBottom: '10px' }}>Bạn đã hoàn thành bài thi!</h2>
                 <p style={{ fontSize: '1.2rem', color: '#64748b' }}>Hệ thống đã ghi nhận kết quả. Đợi giáo viên kết thúc để xem Bảng Xếp Hạng nhé.</p>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (step === "result") {
      return (
        <div className="quicktest-modal-card quicktest-wide-card" style={{ maxWidth: '700px', marginTop: '60px' }}>
          <div className="quicktest-header-group quicktest-center" style={{ padding: '40px 0' }}>
            <div className="quicktest-role-icon" style={{ fontSize: '6rem', marginBottom: '24px' }}>🎉</div>
            <h2 style={{ fontSize: '3rem', color: '#0f172a', marginBottom: '16px' }}>Bài thi kết thúc!</h2>
            <p style={{ fontSize: '1.3rem', color: '#64748b' }}>Hệ thống đang tổng hợp kết quả của tất cả mọi người.</p>
          </div>
          <div className="quicktest-center" style={{ paddingBottom: '40px' }}>
            <button className="quicktest-primary-btn" style={{ fontSize: '1.4rem', padding: '20px 48px', borderRadius: '20px' }} onClick={() => setStep("leaderboard")}>
              🏆 Xem Bảng Xếp Hạng Ngay
            </button>
          </div>
        </div>
      );
    }

    if (step === "leaderboard") {
      return (
        <div className="quicktest-modal-card quicktest-wide-card" style={{ marginTop: '20px', position: 'relative' }}>
          <button style={{ ...btnCloseStyle, position: 'absolute', top: '24px', right: '24px', zIndex: 10 }} onClick={handleClose} onMouseOver={(e) => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.color = '#0f172a'; }} onMouseOut={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#64748b'; }}>
            <i className="fa-solid fa-xmark"></i>
          </button>
          <div className="quicktest-modal-topbar" style={{ marginBottom: '24px' }}>
            <div className="quicktest-pill" style={{ fontSize: '1.2rem', padding: '12px 24px', background: '#fffbeb', color: '#d97706' }}>🏆 Bảng xếp hạng chung cuộc</div>
          </div>
          <QuickTestLeaderboardCard results={leaderboard} />
          <div className="quicktest-center" style={{ marginTop: '30px' }}>
             <button className="quicktest-secondary-btn" style={{ padding: '16px 32px', fontSize: '1.1rem' }} onClick={handleClose}>Quay lại Trang chủ</button>
          </div>
        </div>
      );
    }

    return null;
  };

  if (isRouteMode) {
    return (
      <div className="dashboard-layout">
        <Sidebar currentView="community" onNavigate={propOnNavigate || navigate} />
        <main className="dashboard-content scrollable-content" style={{ padding: '20px', backgroundColor: 'var(--bg-main)', minHeight: '100vh', overflowY: 'auto' }}>
          <div style={{ maxWidth: '1100px', margin: '0 auto', paddingTop: '20px' }}>
            {renderModalContent()}
          </div>
        </main>
      </div>
    );
  }

  if (embed) {
    return <div className="quicktest-embed-shell" style={{ padding: '20px' }}>{renderModalContent()}</div>;
  }

  return (
    <div className="quicktest-overlay" role="dialog" aria-modal="true" aria-label="QuickTest Modal">
      <div className="quicktest-backdrop" />
      <div className="quicktest-modal-shell">{renderModalContent()}</div>
    </div>
  );
};
 
export default QuickTestModalManager;