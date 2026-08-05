import { useState, useEffect, useCallback, useRef } from "react";
import { io } from "socket.io-client";
import api, { quickTestAPI } from "../services/api";

export const useQuickTestSocket = () => {
  const [socket, setSocket] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [isStarted, setIsStarted] = useState(false);
  const [isEnded, setIsEnded] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [liveStats, setLiveStats] = useState({
    completedCount: 0,
    totalStudents: 0,
    participants: []
  });
  const [questions, setQuestions] = useState([]);
  const [totalTime, setTotalTime] = useState(0);
  const [questionTime, setQuestionTime] = useState(25);
  const [resultMode, setResultMode] = useState("SHOW_NOW");
  const [pacingMode, setPacingMode] = useState("SELF_PACED");
  const [error, setError] = useState("");

  // 👉 Trạng thái chế độ Đồng bộ (SYNC): câu hỏi hiện tại + đáp án đã công bố hay chưa
  const [syncQuestionIndex, setSyncQuestionIndex] = useState(0);
  const [questionStartedAt, setQuestionStartedAt] = useState(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [questionStats, setQuestionStats] = useState(null);

  const isStartedRef = useRef(false);
  const isEndedRef = useRef(false);

  useEffect(() => {
    isStartedRef.current = isStarted;
  }, [isStarted]);

  useEffect(() => {
    isEndedRef.current = isEnded;
  }, [isEnded]);

  useEffect(() => {
    return () => {
      if (socket) socket.disconnect();
    };
  }, [socket]);

  const syncParticipants = useCallback(async (roomCode) => {
    try {
      const res = await quickTestAPI.getRoom(roomCode);
      const roomData = res.data?.data || res.data;
      if (!roomData) return;

      const dbParticipants = roomData.Participants || roomData.participants || [];

      const dbStudents = dbParticipants.map(p => ({
        userRole: "STUDENT",
        userName: p.studentName || p.participantName || "Học sinh",
        participantId: p.id || p.participantId,
        score: p.score || 0
      }));

      setParticipants(prev => {
        const hosts = prev.filter(x => x.userRole === "HOST");
        return [...hosts, ...dbStudents];
      });

      setLiveStats(prev => ({
        ...prev,
        totalStudents: dbStudents.length
      }));
    } catch (err) {}
  }, []);

  const syncRoomStatus = useCallback(async (roomCode) => {
    try {
      const res = await quickTestAPI.getRoom(roomCode);
      const status = res.data?.data?.status || res.data?.status || res.data?.data?.roomStatus;
      if ((status === "IN_PROGRESS" || status === "STARTED") && !isStartedRef.current) {
        setIsStarted(true);
      } else if ((status === "FINISHED" || status === "ENDED") && !isEndedRef.current) {
        setIsEnded(true);
        setIsStarted(false);
      }
    } catch (err) {}
  }, []);

  const joinRoom = useCallback((roomCode, userRole, userName, settings = {}, initialQuestions = []) => {
    const socketUrl = import.meta.env.VITE_API_URL
      ? import.meta.env.VITE_API_URL.replace("/api", "")
      : "http://localhost:5000";

    const newSocket = io(socketUrl, { query: { userId: "guest" } });
    setSocket(newSocket);

    if (userRole === "HOST") {
      setQuestions(initialQuestions);
      setTotalTime(settings.totalTime || 600);
      setQuestionTime(settings.questionTimeLimit || settings.questionTime || 25);
      setResultMode(settings.resultMode || "SHOW_NOW");
    }
    setPacingMode(settings.pacingMode === "SYNC" ? "SYNC" : "SELF_PACED");

    newSocket.emit("join_quicktest", {
      roomCode,
      userType: userRole === "HOST" ? "teacher" : "student",
      userName,
    });

    newSocket.on("player_joined", (player) => {
      setParticipants((prev) => {
        if (prev.find(p => p.socketId === player.id || p.userName === player.name)) return prev;
        return [...prev, { userRole: "STUDENT", userName: player.name, socketId: player.id }];
      });
      setLiveStats(prev => ({ ...prev, totalStudents: prev.totalStudents + 1 }));
    });

    newSocket.on("test_started", () => setIsStarted(true));

    newSocket.on("live_update", (data) => {
      setLeaderboard(prev => {
        const existingIndex = prev.findIndex(p => p.participantId === data.participantId || p.studentName === data.studentName);
        let updated = [...prev];
        if (existingIndex >= 0) {
          updated[existingIndex] = {
            ...updated[existingIndex],
            score: data.score,
            correctCount: data.isCorrect ? (updated[existingIndex].correctCount || 0) + 1 : (updated[existingIndex].correctCount || 0)
          };
        } else {
          updated.push({
            participantId: data.participantId,
            studentName: data.studentName,
            score: data.score,
            correctCount: data.isCorrect ? 1 : 0
          });
        }
        return updated.sort((a, b) => b.score - a.score);
      });

      setLiveStats(prev => ({
        ...prev,
        completedCount: prev.completedCount + 1,
        participants: [...prev.participants, { selectedAnswer: data.selectedAnswer }]
      }));
    });

    newSocket.on("test_ended", () => {
      setIsEnded(true);
      setIsStarted(false);
    });

    // 👉 Chế độ Đồng bộ (SYNC): giáo viên chuyển câu -> mọi client (kể cả chính giáo viên) nhận cùng lúc
    newSocket.on("question_changed", (data) => {
      setSyncQuestionIndex(data.questionIndex);
      setQuestionStartedAt(data.questionStartedAt);
      setIsRevealed(false);
      setQuestionStats(null);
    });

    // 👉 Giáo viên công bố đáp án + thống kê -> mọi client nhận cùng lúc
    newSocket.on("question_revealed", (data) => {
      setIsRevealed(true);
      setQuestionStats(data);
    });
  }, []);

  const startTest = useCallback((roomCode, duration) => {
    if (socket) socket.emit("start_quicktest", roomCode);
    setTotalTime(duration);
    setIsStarted(true);
  }, [socket]);

  const endTest = useCallback((roomCode) => {
    if (socket) socket.emit("end_quicktest", roomCode);
    setIsEnded(true);
    setIsStarted(false);
  }, [socket]);

  const submitAnswer = useCallback(async ({ roomCode, participantId, studentName, questionId, selectedAnswer, answerTime }) => {
    try {
      const payload = { participantId, questionId, selectedAnswer, answerTime };
      const res = await api.post("/quicktest/submit", payload);
      const newScore = res.data?.data?.newScore || 0;
      // 👉 Dùng đúng kết quả chấm điểm thật từ server (gradeAnswer), không tự gán "true" nữa
      const isCorrect = !!res.data?.data?.isCorrect;

      if (socket) {
        socket.emit("submit_answer", {
          roomCode,
          participantId,
          studentName,
          score: newScore,
          isCorrect,
          selectedAnswer
        });
      }

      return { newScore, isCorrect };
    } catch (err) {
      setError("Không thể gửi câu trả lời.");
      return { newScore: 0, isCorrect: false };
    }
  }, [socket]);

  // 👉 Chế độ Đồng bộ: giáo viên chuyển câu / công bố đáp án cho cả phòng
  const advanceQuestion = useCallback(async (roomCode, questionIndex) => {
    try {
      await api.put(`/quicktest/rooms/${roomCode}/advance`, { questionIndex });
    } catch (err) {
      setError("Không thể chuyển câu hỏi.");
    }
  }, []);

  const revealQuestion = useCallback(async (roomCode, questionId) => {
    try {
      await api.put(`/quicktest/rooms/${roomCode}/reveal`, { questionId });
    } catch (err) {
      setError("Không thể công bố đáp án.");
    }
  }, []);

  return {
    participants,
    isStarted,
    isEnded,
    leaderboard,
    liveStats,
    questions,
    totalTime,
    questionTime,
    resultMode,
    pacingMode,
    error,
    syncQuestionIndex,
    questionStartedAt,
    isRevealed,
    questionStats,
    joinRoom,
    startTest,
    submitAnswer,
    endTest,
    syncParticipants,
    syncRoomStatus,
    advanceQuestion,
    revealQuestion,
  };
};
