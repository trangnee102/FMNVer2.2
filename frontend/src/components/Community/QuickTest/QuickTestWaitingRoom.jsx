import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../services/api";
import { io } from "socket.io-client";
import Sidebar from "../../Layout/Sidebar";
import "../../../pages/DashboardPage.css";

const QuickTestWaitingRoom = ({ onNavigate, participants: propParticipants }) => {
  const navigate = useNavigate();
  const isStandalone = !!onNavigate;

  const [roomCode, setRoomCode] = useState("");
  const [participantName, setParticipantName] = useState("");
  const [isJoined, setIsJoined] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [participants, setParticipants] = useState(propParticipants || []);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (propParticipants) {
      setParticipants(propParticipants);
    }
  }, [propParticipants]);

  useEffect(() => {
    const storedName = localStorage.getItem("current_user_name");
    if (storedName) setParticipantName(storedName);
  }, []);

  const handleJoinRoom = async (e) => {
    e.preventDefault();
    if (!roomCode.trim() || !participantName.trim()) {
      setError("Vui lòng nhập đầy đủ Mã phòng và Tên của bạn!");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const normalizedCode = roomCode.toUpperCase().trim();
      const res = await api.post("/quicktest/join", {
        roomCode: normalizedCode,
        participantName: participantName,
      });

      if (res.data && res.data.success) {
        setIsJoined(true);

        const socketUrl = import.meta.env.VITE_API_URL 
          ? import.meta.env.VITE_API_URL.replace("/api", "") 
          : "http://localhost:5000";
          
        const newSocket = io(socketUrl, {
          query: { userId: "guest" }, 
        });
        setSocket(newSocket);

        newSocket.emit("join_quicktest", {
          roomCode: normalizedCode,
          userType: "student",
          userName: participantName,
        });

        const roomRes = await api.get(`/quicktest/rooms/${normalizedCode}`);
        if (roomRes.data && roomRes.data.data) {
          const currentPlayers = roomRes.data.data.Participants.map((p) => ({
            userRole: "STUDENT",
            userName: p.studentName,
            socketId: p.id,
          }));
          setParticipants(currentPlayers);
        }

        newSocket.on("player_joined", (player) => {
          setParticipants((prev) => [
            ...prev,
            { userRole: "STUDENT", userName: player.name, socketId: player.id },
          ]);
        });

        newSocket.on("test_started", () => {
          navigate(`/quicktest/play/${normalizedCode}`);
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || "Mã phòng không tồn tại hoặc đã đóng!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (socket) socket.disconnect();
    };
  }, [socket]);

  const studentList = participants.filter((item) => item.userRole === "STUDENT");

  const content = (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 w-full">
      {!isJoined && isStandalone ? (
        <div className="w-full max-w-md bg-white rounded-3xl shadow-lg border border-gray-100 p-8 text-center animate-fade-in">
          <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
             <i className="fa-solid fa-gamepad text-4xl"></i>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 mb-2 tracking-tight">QuickTest</h1>
          <p className="text-slate-500 mb-8 font-medium">Sẵn sàng phản xạ, dẫn đầu cuộc đua!</p>

          <form onSubmit={handleJoinRoom} className="space-y-4">
            <div>
              <input
                type="text"
                placeholder="Mã phòng (VD: A1B2C3)"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
                className="w-full bg-slate-100 text-slate-900 font-bold text-center text-lg px-6 py-4 rounded-2xl border-2 border-transparent focus:border-indigo-500 focus:bg-white focus:outline-none transition-all uppercase"
                maxLength={12}
              />
            </div>
            <div>
              <input
                type="text"
                placeholder="Biệt danh của bạn"
                value={participantName}
                onChange={(e) => setParticipantName(e.target.value)}
                className="w-full bg-slate-100 text-slate-900 font-bold text-center text-lg px-6 py-4 rounded-2xl border-2 border-transparent focus:border-indigo-500 focus:bg-white focus:outline-none transition-all"
              />
            </div>

            {error && (
              <p className="text-red-500 font-semibold text-sm animate-pulse"><i className="fa-solid fa-circle-exclamation mr-1"></i>{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg px-6 py-4 rounded-2xl transition-all shadow-md hover:shadow-xl hover:-translate-y-1 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <i className="fa-solid fa-spinner fa-spin"></i> : "Vào Phòng Ngay"}
            </button>
          </form>
          
          <button onClick={() => onNavigate("dashboard")} className="mt-6 text-slate-400 hover:text-slate-600 font-medium text-sm transition-colors">
            &larr; Quay lại trang chủ
          </button>
        </div>
      ) : (
        <div className="w-full max-w-3xl animate-fade-in-up">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-indigo-500 uppercase tracking-[0.18em]">Phòng chờ QuickTest</p>
                <h2 className="text-xl font-bold text-slate-900">Học sinh đang chờ</h2>
              </div>
              <div className="rounded-2xl bg-indigo-50 px-4 py-2 text-indigo-700 font-semibold">
                {studentList.length} / {participants.length}
              </div>
            </div>

            {studentList.length === 0 ? (
              <div className="text-center border border-dashed border-slate-200 rounded-2xl py-12 text-slate-500">
                Chưa có học sinh nào tham gia. Gửi mã phòng cho học sinh ngay.
              </div>
            ) : (
              <div className="space-y-3">
                {studentList.map((student, idx) => (
                  <div
                    key={`${student.socketId}-${idx}`}
                    className="flex items-center justify-between rounded-2xl bg-slate-50 p-4 border border-slate-100"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full bg-indigo-100 text-indigo-700 font-semibold flex items-center justify-center">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{student.userName}</p>
                        <p className="text-xs text-slate-500">Chờ giáo viên bắt đầu</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-emerald-100 text-emerald-700 px-3 py-1 text-xs font-semibold animate-pulse">
                      Sẵn sàng
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {isStandalone && isJoined && (
            <div className="text-center mt-6">
               <p className="text-slate-500 font-medium">
                 <i className="fa-solid fa-spinner fa-spin mr-2"></i> Đang chờ máy chủ (Giáo viên) phát lệnh làm bài...
               </p>
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (isStandalone) {
    return (
      <div className="dashboard-layout">
        <Sidebar currentView="community" onNavigate={onNavigate} />
        <main className="dashboard-content" style={{ padding: 0 }}>
          {content}
        </main>
      </div>
    );
  }

  return content;
};

export default QuickTestWaitingRoom;