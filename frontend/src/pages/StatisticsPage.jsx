import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Sidebar from "../components/Layout/Sidebar";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { statisticsAPI } from "../services/api";
import "./StatisticsPage.css";

const StatisticsPage = ({ onNavigate }) => {
  const navigate = useNavigate();
  const { logoutUser } = useAuth();
  const [timeFilter, setTimeFilter] = useState("7day");
  const [statsData, setStatsData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const [highestStreak, setHighestStreak] = useState(() => {
    return parseInt(localStorage.getItem("highestStreak") || "0", 10);
  });

  const tips = [
    "Mỗi ngày ôn tập từ 20–30 phút sẽ giúp cải thiện khả năng ghi nhớ theo đường cong lãng quên.",
    "Làm đề thi ngẫu nhiên giúp bạn cọ xát kiến thức thực tế tốt hơn.",
    "Sử dụng kỹ thuật Active Recall bằng cách tự trả lời trước khi lật thẻ.",
    "Duy trì chuỗi điểm danh đều đặn là chìa khóa để xây dựng thói quen học tập vững chắc.",
  ];
  const [randomTip, setRandomTip] = useState(tips[0]);

  useEffect(() => {
    setRandomTip(tips[Math.floor(Math.random() * tips.length)]);
  }, []);

  const fetchStatistics = async () => {
    try {
      const filterMap = {
        today: "today",
        "7day": "week",
        "30day": "month",
        "90day": "year",
        custom: "all",
      };
      const backendFilter = filterMap[timeFilter] || "week";

      const json = await statisticsAPI.getStats(backendFilter);
      const dataPayload = json.data || json;

      if (json && json.success !== false) {
        setStatsData(dataPayload);
        const currentStreak = dataPayload.kpis?.streak || 0;
        if (currentStreak > highestStreak) {
          setHighestStreak(currentStreak);
          localStorage.setItem("highestStreak", currentStreak.toString());
        }
      }
    } catch (error) {
      const errorText = (error.message || error.error || "").toLowerCase();
      if (
        errorText.includes("token") ||
        errorText.includes("hết hạn") ||
        errorText.includes("invalid")
      ) {
        if (logoutUser) logoutUser();
        localStorage.clear();
        navigate("/login");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    fetchStatistics();

    const interval = setInterval(() => {
      fetchStatistics();
    }, 5000);

    return () => clearInterval(interval);
  }, [timeFilter, highestStreak, logoutUser, navigate]);

  const { kpis, dailyActivity, deckPerformance } = statsData || {};

  const flashcardDecks = (deckPerformance || []).filter(
    (d) => !d.is_exam && !d.isExam
  );
  const examDecks = (deckPerformance || []).filter(
    (d) => d.is_exam || d.isExam
  );

  const totalFcCards = flashcardDecks.reduce(
    (sum, d) => sum + (d.total || 0),
    0
  );
  const learnedFcCards = flashcardDecks.reduce(
    (sum, d) => sum + (d.learned || 0),
    0
  );
  const dueFcCards = Math.max(0, totalFcCards - learnedFcCards);
  const fcProgress =
    totalFcCards > 0 ? Math.round((learnedFcCards / totalFcCards) * 100) : 0;

  const totalExams = examDecks.length;
  const examsDone = examDecks.filter(
    (d) => (d.learned || 0) > 0 || (d.percent || 0) > 0
  ).length;
  const examsDue = Math.max(0, totalExams - examsDone);
  const examProgress =
    totalExams > 0 ? Math.round((examsDone / totalExams) * 100) : 0;

  const topFlashcards = [...flashcardDecks]
    .sort((a, b) => {
      const dueA = Math.max(0, (a.total || 0) - (a.learned || 0));
      const dueB = Math.max(0, (b.total || 0) - (b.learned || 0));
      return dueB - dueA;
    })
    .slice(0, 5);

  const recentExams = [...examDecks]
    .sort((a, b) => (b.learned || 0) - (a.learned || 0))
    .slice(0, 5);

  const daysOfWeek = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
  const activityData = dailyActivity || [];

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        backgroundColor: "#F8FAFC",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <Sidebar currentView="statistics" onNavigate={onNavigate} />

      <main
        style={{
          flex: 1,
          padding: "30px 40px",
          overflowY: "auto",
          height: "100vh",
          marginLeft: "260px",
          boxSizing: "border-box",
        }}
      >
        <div style={{ maxWidth: "1280px", margin: "0 auto", paddingBottom: "40px" }}>
          <header
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "30px",
            }}
          >
            <div>
              <h1
                style={{
                  fontSize: "28px",
                  fontWeight: "700",
                  color: "#111827",
                  margin: "0 0 8px 0",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                }}
              >
                <i className="fa-solid fa-chart-simple" style={{ color: "#4F46E5" }}></i>
                Thống kê học tập
              </h1>
              <p style={{ fontSize: "15px", color: "#6B7280", margin: 0 }}>
                Theo dõi tiến độ học Flashcard và kết quả luyện đề của bạn.
              </p>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                background: "#FFFFFF",
                border: "1px solid #E5E7EB",
                padding: "8px 16px",
                borderRadius: "10px",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
              }}
            >
              <i className="fa-regular fa-calendar" style={{ color: "#6B7280" }}></i>
              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
                style={{
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#111827",
                  cursor: "pointer",
                }}
              >
                <option value="today">Hôm nay</option>
                <option value="7day">7 ngày</option>
                <option value="30day">30 ngày</option>
                <option value="90day">90 ngày</option>
                <option value="custom">Tùy chỉnh</option>
              </select>
            </div>
          </header>

          {isLoading && !statsData ? (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "60vh",
              }}
            >
              <i
                className="fa-solid fa-spinner fa-spin"
                style={{ fontSize: "2rem", color: "#4F46E5" }}
              ></i>
            </div>
          ) : (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "20px",
                  marginBottom: "30px",
                }}
              >
                <div
                  style={{
                    background: "#FFFFFF",
                    borderRadius: "16px",
                    padding: "24px",
                    border: "1px solid #E5E7EB",
                    transition: "transform 0.2s",
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.transform = "scale(1.01)")}
                  onMouseOut={(e) => (e.currentTarget.style.transform = "scale(1)")}
                >
                  <div style={{ display: "flex", gap: "16px", marginBottom: "20px" }}>
                    <div
                      style={{
                        width: "48px",
                        height: "48px",
                        borderRadius: "12px",
                        background: "rgba(79, 70, 229, 0.1)",
                        color: "#4F46E5",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "1.2rem",
                      }}
                    >
                      <i className="fa-solid fa-layer-group"></i>
                    </div>
                    <div>
                      <div style={{ fontSize: "15px", color: "#111827", fontWeight: "600" }}>
                        Flashcard
                      </div>
                      <div style={{ fontSize: "13px", color: "#6B7280" }}>Thẻ cần ôn</div>
                    </div>
                  </div>
                  <div style={{ fontSize: "28px", fontWeight: "700", color: "#4F46E5", marginBottom: "4px" }}>
                    {dueFcCards} <span style={{ fontSize: "15px", color: "#6B7280", fontWeight: "500" }}>thẻ</span>
                  </div>
                  <div style={{ fontSize: "14px", color: "#111827", marginBottom: "16px" }}>
                    Đã ôn: {learnedFcCards} thẻ
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ flex: 1, height: "6px", background: "#E5E7EB", borderRadius: "4px" }}>
                      <div style={{ width: `${fcProgress}%`, height: "100%", background: "#4F46E5", borderRadius: "4px" }}></div>
                    </div>
                    <div style={{ fontSize: "13px", fontWeight: "600", color: "#6B7280" }}>{fcProgress}%</div>
                  </div>
                </div>

                <div
                  style={{
                    background: "#FFFFFF",
                    borderRadius: "16px",
                    padding: "24px",
                    border: "1px solid #E5E7EB",
                    transition: "transform 0.2s",
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.transform = "scale(1.01)")}
                  onMouseOut={(e) => (e.currentTarget.style.transform = "scale(1)")}
                >
                  <div style={{ display: "flex", gap: "16px", marginBottom: "20px" }}>
                    <div
                      style={{
                        width: "48px",
                        height: "48px",
                        borderRadius: "12px",
                        background: "rgba(239, 68, 68, 0.1)",
                        color: "#EF4444",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "1.2rem",
                      }}
                    >
                      <i className="fa-solid fa-file-contract"></i>
                    </div>
                    <div>
                      <div style={{ fontSize: "15px", color: "#111827", fontWeight: "600" }}>
                        Bộ đề thi
                      </div>
                      <div style={{ fontSize: "13px", color: "#6B7280" }}>Đề chưa làm</div>
                    </div>
                  </div>
                  <div style={{ fontSize: "28px", fontWeight: "700", color: "#EF4444", marginBottom: "4px" }}>
                    {examsDue} <span style={{ fontSize: "15px", color: "#6B7280", fontWeight: "500" }}>đề</span>
                  </div>
                  <div style={{ fontSize: "14px", color: "#111827", marginBottom: "16px" }}>
                    Đã làm: {examsDone} đề
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ flex: 1, height: "6px", background: "#E5E7EB", borderRadius: "4px" }}>
                      <div style={{ width: `${examProgress}%`, height: "100%", background: "#EF4444", borderRadius: "4px" }}></div>
                    </div>
                    <div style={{ fontSize: "13px", fontWeight: "600", color: "#6B7280" }}>{examProgress}%</div>
                  </div>
                </div>

                <div
                  style={{
                    background: "#FFFFFF",
                    borderRadius: "16px",
                    padding: "24px",
                    border: "1px solid #E5E7EB",
                    transition: "transform 0.2s",
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.transform = "scale(1.01)")}
                  onMouseOut={(e) => (e.currentTarget.style.transform = "scale(1)")}
                >
                  <div style={{ display: "flex", gap: "16px", marginBottom: "20px" }}>
                    <div
                      style={{
                        width: "48px",
                        height: "48px",
                        borderRadius: "12px",
                        background: "rgba(245, 158, 11, 0.1)",
                        color: "#F59E0B",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "1.2rem",
                      }}
                    >
                      <i className="fa-solid fa-fire"></i>
                    </div>
                    <div>
                      <div style={{ fontSize: "15px", color: "#111827", fontWeight: "600" }}>
                        Streak
                      </div>
                      <div style={{ fontSize: "13px", color: "#6B7280" }}>Ngày học liên tiếp</div>
                    </div>
                  </div>
                  <div style={{ fontSize: "28px", fontWeight: "700", color: "#F59E0B", marginBottom: "4px" }}>
                    {kpis?.streak || 0} <span style={{ fontSize: "15px", color: "#6B7280", fontWeight: "500" }}>ngày</span>
                  </div>
                  <div style={{ fontSize: "14px", color: "#111827", marginBottom: "16px" }}>
                    Kỷ lục: {highestStreak} ngày
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    {[...Array(7)].map((_, i) => (
                      <i
                        key={i}
                        className="fa-solid fa-fire"
                        style={{ color: i < Math.min((kpis?.streak || 0), 7) ? "#F59E0B" : "#E5E7EB", fontSize: "14px" }}
                      ></i>
                    ))}
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1fr",
                  gap: "20px",
                  marginBottom: "30px",
                }}
              >
                <div
                  style={{
                    background: "#FFFFFF",
                    borderRadius: "16px",
                    padding: "24px",
                    border: "1px solid #E5E7EB",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                    <h3 style={{ fontSize: "18px", fontWeight: "700", color: "#111827", margin: 0 }}>
                      Tổng quan học tập
                    </h3>
                    <div style={{ display: "flex", gap: "16px", fontSize: "13px", fontWeight: "600" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "6px", color: "#6B7280" }}>
                        <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#4F46E5" }}></div> Flashcard
                      </span>
                      <span style={{ display: "flex", alignItems: "center", gap: "6px", color: "#6B7280" }}>
                        <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#EF4444" }}></div> Đề thi
                      </span>
                    </div>
                  </div>
                  <div style={{ height: "260px" }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={activityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid vertical={false} stroke="#E5E7EB" />
                        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#6B7280", fontSize: 13 }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: "#6B7280", fontSize: 13 }} />
                        <Tooltip
                          contentStyle={{ border: "none", borderRadius: "10px", background: "#FFFFFF", boxShadow: "0 4px 10px rgba(0,0,0,0.1)", color: "#111827" }}
                          cursor={{ stroke: "#E5E7EB", strokeWidth: 1 }}
                        />
                        <Line type="monotone" name="Flashcard" dataKey="cards" stroke="#4F46E5" strokeWidth={3} dot={{ r: 4, fill: "#4F46E5", strokeWidth: 0 }} activeDot={{ r: 6 }} />
                        <Line type="monotone" name="Đề thi" dataKey="exams" stroke="#EF4444" strokeWidth={3} dot={{ r: 4, fill: "#EF4444", strokeWidth: 0 }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div
                  style={{
                    background: "#FFFFFF",
                    borderRadius: "16px",
                    padding: "24px",
                    border: "1px solid #E5E7EB",
                  }}
                >
                  <h3 style={{ fontSize: "18px", fontWeight: "700", color: "#111827", margin: "0 0 20px 0" }}>
                    Lịch học tập
                  </h3>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "10px", marginBottom: "20px" }}>
                    {daysOfWeek.map((day) => (
                      <div key={day} style={{ textAlign: "center", fontSize: "13px", color: "#6B7280", fontWeight: "600" }}>{day}</div>
                    ))}
                    {activityData.map((dayData, idx) => {
                      let dotColor = "#E5E7EB";
                      if (dayData.cards > 0 && dayData.exams > 0) dotColor = "#F59E0B";
                      else if (dayData.cards > 0) dotColor = "#10B981";
                      else if (dayData.exams > 0) dotColor = "#EF4444";
                      return (
                        <div key={idx} style={{ display: "flex", justifyContent: "center", padding: "8px 0" }}>
                          <div style={{ width: "20px", height: "20px", borderRadius: "50%", backgroundColor: dotColor }}></div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", fontSize: "13px", color: "#6B7280", fontWeight: "500", justifyContent: "center", marginTop: "auto" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><div style={{ width: "10px", height: "10px", borderRadius: "50%", border: "2px solid #10B981" }}></div> Ôn Flashcard</span>
                    <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><div style={{ width: "10px", height: "10px", borderRadius: "50%", border: "2px solid #EF4444" }}></div> Làm đề thi</span>
                    <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><div style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#F59E0B" }}></div> Cả hai</span>
                    <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><div style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#E5E7EB" }}></div> Không học</span>
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "20px",
                  marginBottom: "30px",
                }}
              >
                <div
                  style={{
                    background: "#FFFFFF",
                    borderRadius: "16px",
                    padding: "24px",
                    border: "1px solid #E5E7EB",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                    <h3 style={{ fontSize: "18px", fontWeight: "700", color: "#111827", margin: 0 }}>
                      Bộ thẻ cần ôn hôm nay
                    </h3>
                    <div style={{ fontSize: "14px", color: "#4F46E5", fontWeight: "600", cursor: "pointer" }} onClick={() => onNavigate("my-decks")}>
                      Xem tất cả <i className="fa-solid fa-arrow-right" style={{ fontSize: "12px" }}></i>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    {topFlashcards.length > 0 ? (
                      topFlashcards.map((deck) => {
                        const total = deck.total || 0;
                        const learned = deck.learned || 0;
                        const due = Math.max(0, total - learned);
                        const progress = total > 0 ? Math.round((learned / total) * 100) : 0;
                        const isDone = total > 0 && due === 0;

                        return (
                          <div key={deck.id} style={{ display: "flex", alignItems: "center", gap: "16px", padding: "12px 16px", background: "#F8FAFC", borderRadius: "12px", border: "1px solid #E5E7EB" }}>
                            <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "rgba(79, 70, 229, 0.1)", color: "#4F46E5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>
                              <i className="fa-solid fa-layer-group"></i>
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: "15px", fontWeight: "600", color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: "4px" }}>
                                {deck.name?.replace(/\(ai generated\)/i, "").trim() || "Bộ thẻ"}
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <div style={{ flex: 1, height: "6px", background: "#E5E7EB", borderRadius: "4px" }}>
                                  <div style={{ width: `${progress}%`, height: "100%", background: isDone ? "#10B981" : "#F59E0B", borderRadius: "4px" }}></div>
                                </div>
                                <span style={{ fontSize: "13px", color: "#6B7280" }}>{total} thẻ</span>
                              </div>
                            </div>
                            <button
                              style={{
                                padding: "8px 16px",
                                background: isDone ? "rgba(16, 185, 129, 0.1)" : "rgba(79, 70, 229, 0.1)",
                                color: isDone ? "#10B981" : "#4F46E5",
                                border: "none",
                                borderRadius: "8px",
                                fontSize: "14px",
                                fontWeight: "600",
                                cursor: "pointer",
                                transition: "all 0.2s"
                              }}
                              onClick={() => onNavigate("review", deck.id)}
                            >
                              {isDone ? "Xem lại" : "Ôn ngay"}
                            </button>
                          </div>
                        );
                      })
                    ) : (
                      <div style={{ textAlign: "center", padding: "20px 0", color: "#6B7280", fontSize: "14px" }}>
                        Chưa có thẻ cần ôn.
                      </div>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    background: "#FFFFFF",
                    borderRadius: "16px",
                    padding: "24px",
                    border: "1px solid #E5E7EB",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                    <h3 style={{ fontSize: "18px", fontWeight: "700", color: "#111827", margin: 0 }}>
                      Đề thi gần đây
                    </h3>
                    <div style={{ fontSize: "14px", color: "#4F46E5", fontWeight: "600", cursor: "pointer" }} onClick={() => onNavigate("my-exams")}>
                      Xem tất cả <i className="fa-solid fa-arrow-right" style={{ fontSize: "12px" }}></i>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    {recentExams.length > 0 ? (
                      recentExams.map((exam) => {
                        const score = exam.total > 0 ? ((exam.learned / exam.total) * 10).toFixed(1) : "0.0";
                        const isDone = exam.percent === 100;
                        return (
                          <div key={exam.id} style={{ display: "flex", alignItems: "center", gap: "16px", padding: "12px 16px", background: "#F8FAFC", borderRadius: "12px", border: "1px solid #E5E7EB" }}>
                            <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "rgba(239, 68, 68, 0.1)", color: "#EF4444", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>
                              <i className="fa-solid fa-file-contract"></i>
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: "15px", fontWeight: "600", color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: "4px" }}>
                                {exam.name?.replace(/\(ai generated\)/i, "").trim() || "Đề thi"}
                              </div>
                              <div style={{ fontSize: "13px", color: "#6B7280" }}>
                                {exam.total || 0} câu
                              </div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                              <span style={{ fontSize: "15px", fontWeight: "700", color: isDone ? "#10B981" : "#F59E0B" }}>
                                {score}/10
                              </span>
                              <button
                                style={{
                                  padding: "8px 16px",
                                  background: "rgba(79, 70, 229, 0.1)",
                                  color: "#4F46E5",
                                  border: "none",
                                  borderRadius: "8px",
                                  fontSize: "14px",
                                  fontWeight: "600",
                                  cursor: "pointer"
                                }}
                                onClick={() => onNavigate("my-exams")}
                              >
                                Xem lại
                              </button>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div style={{ textAlign: "center", padding: "20px 0", color: "#6B7280", fontSize: "14px" }}>
                        Chưa có dữ liệu thi.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div
                style={{
                  background: "rgba(79, 70, 229, 0.05)",
                  border: "1px dashed rgba(79, 70, 229, 0.3)",
                  borderRadius: "16px",
                  padding: "16px 24px",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  color: "#4F46E5",
                  fontSize: "15px",
                }}
              >
                <i className="fa-regular fa-lightbulb" style={{ fontSize: "20px" }}></i>
                <span><strong>Mẹo học tập:</strong> {randomTip}</span>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default StatisticsPage;