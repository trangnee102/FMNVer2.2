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
      // 👉 Gửi kèm participantId thật (chốt lúc join, có thể khác chuỗi tên do trim/khoảng
      // trắng) để về sau khớp với leaderboard bằng ID thay vì so tên — so tên từng bị lệch
      // (VD: tên lúc join đã trim, nhưng state participantName dùng lúc nộp bài lại chưa
      // chắc đã trim), khiến "Quá trình làm bài" không bao giờ khớp được với leaderboard
      participantId: settings.participantId || null,
    });

    newSocket.on("player_joined", (player) => {
      setParticipants((prev) => {
        if (prev.find(p => p.socketId === player.id || p.userName === player.name)) return prev;
        return [...prev, { userRole: "STUDENT", userName: player.name, socketId: player.id, participantId: player.participantId || null }];
      });
      setLiveStats(prev => ({ ...prev, totalStudents: prev.totalStudents + 1 }));
    });

    newSocket.on("test_started", () => setIsStarted(true));

    newSocket.on("live_update", (data) => {
      setLeaderboard(prev => {
        const existingIndex = prev.findIndex(p => p.participantId === data.participantId || p.studentName === data.studentName);
        let updated = [...prev];
        const answerTime = Number(data.answerTime) || 0;
        if (existingIndex >= 0) {
          const item = updated[existingIndex];
          // 👉 wrongCount/averageAnswerTime trước đây chưa từng được tính (luôn undefined ->
          // cột "Sai"/"Tốc độ TB" ở bảng xếp hạng luôn hiện 0/0.0s bất kể thực tế) — giờ cộng
          // dồn đúng, và tính trung bình động dựa trên tổng số câu ĐÃ trả lời trước đó
          const prevAnsweredCount = (item.correctCount || 0) + (item.wrongCount || 0);
          const newAnsweredCount = prevAnsweredCount + 1;
          const newAvgAnswerTime = ((item.averageAnswerTime || 0) * prevAnsweredCount + answerTime) / newAnsweredCount;
          updated[existingIndex] = {
            ...item,
            score: data.score,
            correctCount: data.isCorrect ? (item.correctCount || 0) + 1 : (item.correctCount || 0),
            wrongCount: !data.isCorrect ? (item.wrongCount || 0) + 1 : (item.wrongCount || 0),
            averageAnswerTime: newAvgAnswerTime,
          };
        } else {
          updated.push({
            participantId: data.participantId,
            studentName: data.studentName,
            score: data.score,
            correctCount: data.isCorrect ? 1 : 0,
            wrongCount: !data.isCorrect ? 1 : 0,
            averageAnswerTime: answerTime,
          });
        }
        return updated.sort((a, b) => b.score - a.score);
      });

      setLiveStats(prev => ({
        ...prev,
        participants: [...prev.participants, { selectedAnswer: data.selectedAnswer }]
      }));
    });

    // 👉 Chế độ Tự do: đánh dấu học sinh đã nộp TOÀN BỘ bài (khác "live_update" ở trên vốn
    // bắn mỗi câu) — dùng để "Tỉ lệ nộp bài"/"Đã hoàn thành" đếm đúng số HỌC SINH xong bài,
    // không phải đếm số CÂU TRẢ LỜI, và để bảng "Quá trình làm bài" hiện đúng "Đã nộp bài"
    // thay vì luôn kẹt ở "Đang làm..." (isFinished trước đây không bao giờ được set)
    newSocket.on("student_finished", (data) => {
      setLeaderboard(prev => {
        const idx = prev.findIndex(p => p.participantId === data.participantId || p.studentName === data.studentName);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], isFinished: true };
          return updated;
        }
        return [...prev, { participantId: data.participantId, studentName: data.studentName, score: 0, correctCount: 0, isFinished: true }];
      });
      setLiveStats(prev => ({ ...prev, completedCount: prev.completedCount + 1 }));
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

  // 👉 Học sinh (chế độ Tự do) báo cho cả phòng biết mình đã làm xong TOÀN BỘ bài
  const finishTest = useCallback((roomCode, participantId, studentName) => {
    if (socket) socket.emit("student_finished", { roomCode, participantId, studentName });
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
      // 👉 api.js đã unwrap response.data 1 lần rồi (xem interceptor), nên res chính là
      // { success, data: { newScore, isCorrect }, message } — giá trị thật nằm ở res.data.newScore,
      // KHÔNG PHẢI res.data.data.newScore (bug cũ khiến newScore/isCorrect luôn undefined -> luôn
      // fallback về false, làm mọi câu trả lời — kể cả trả lời đúng — đều bị báo "sai" trên giao diện)
      const newScore = res.data?.newScore || 0;
      // 👉 Dùng đúng kết quả chấm điểm thật từ server (gradeAnswer), không tự gán "true" nữa
      const isCorrect = !!res.data?.isCorrect;

      if (socket) {
        socket.emit("submit_answer", {
          roomCode,
          participantId,
          studentName,
          score: newScore,
          isCorrect,
          selectedAnswer,
          // 👉 Cần gửi kèm để tính "Tốc độ TB" ở bảng xếp hạng — trước đây thiếu, khiến
          // cột này luôn hiện 0.0s bất kể học sinh trả lời nhanh hay chậm
          answerTime,
        });
      }

      return { newScore, isCorrect };
    } catch (err) {
      const tooLate = !!err?.tooLate;
      setError(tooLate ? "Câu này đã được công bố đáp án!" : "Không thể gửi câu trả lời.");
      return { newScore: 0, isCorrect: false, tooLate };
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
    finishTest,
    syncParticipants,
    syncRoomStatus,
    advanceQuestion,
    revealQuestion,
  };
};
