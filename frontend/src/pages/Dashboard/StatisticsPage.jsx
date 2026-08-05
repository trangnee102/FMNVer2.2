import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Sidebar from "../../components/Layout/Sidebar";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { statisticsAPI } from "../../services/api";
import "./StatisticsPage.css";

// 🌟 Tính năng mới: Tooltip chuyên gia cho Biểu Đồ
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const dataItem = payload[0].payload;
    const fullDate = dataItem.date
      ? new Date(dataItem.date).toLocaleDateString("vi-VN", {
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric'
        })
      : label;

    return (
      <div className="custom-tooltip">
        <p className="tooltip-date">{fullDate}</p>
        <div className="tooltip-item">
          <span className="tooltip-dot" style={{ backgroundColor: "#4F46E5" }}></span>
          <span>Flashcard: <strong>{payload[0].value}</strong> thẻ</span>
        </div>
        <div className="tooltip-item">
          <span className="tooltip-dot" style={{ backgroundColor: "#EF4444" }}></span>
          <span>Đề thi: <strong>{payload[1].value}</strong> đề</span>
        </div>
      </div>
    );
  }
  return null;
};

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
    }, 5000); // Cập nhật dữ liệu real-time mỗi 5 giây

    return () => clearInterval(interval);
  }, [timeFilter, highestStreak, logoutUser, navigate]);

  // Bóc tách dữ liệu thống kê
  const { kpis, dailyActivity, deckPerformance } = statsData || {};

  // Phân loại Flashcard & Đề thi
  const flashcardDecks = (deckPerformance || []).filter(
    (d) => !d.is_exam && !d.isExam
  );
  const examDecks = (deckPerformance || []).filter(
    (d) => d.is_exam || d.isExam
  );

  // Tính toán Flashcard
  const totalFcCards = flashcardDecks.reduce((sum, d) => sum + (d.total || 0), 0);
  const learnedFcCards = flashcardDecks.reduce((sum, d) => sum + (d.learned || 0), 0);
  const dueFcCards = Math.max(0, totalFcCards - learnedFcCards);
  const fcProgress = totalFcCards > 0 ? Math.round((learnedFcCards / totalFcCards) * 100) : 0;

  // 🌟 Đếm Đề Thi Đã Làm: tính cả Ôn Luyện lẫn Kiểm Tra (không cần biết điểm số)
  const totalExams = examDecks.length;
  const examsDone = examDecks.filter((d) => d.attempted).length;
  const examsDue = Math.max(0, totalExams - examsDone);
  const examProgress = totalExams > 0 ? Math.round((examsDone / totalExams) * 100) : 0;

  // Top list Flashcard
  const topFlashcards = [...flashcardDecks]
    .sort((a, b) => {
      const dueA = Math.max(0, (a.total || 0) - (a.learned || 0));
      const dueB = Math.max(0, (b.total || 0) - (b.learned || 0));
      return dueB - dueA;
    })
    .slice(0, 5);

  // 🌟 FIX: Đề thi gần đây (Chỉ lấy các đề có score thật do Backend trả về, lọc sạch các đề 0.0 do chưa thi)
  const attemptedExams = examDecks.filter((exam) => exam.score !== null && exam.score !== undefined);

  const recentExams = [...attemptedExams]
    .sort((a, b) => {
      const dateA = new Date(a.last_studied || a.updated_at || 0).getTime();
      const dateB = new Date(b.last_studied || b.updated_at || 0).getTime();
      return dateB - dateA; // Mới nhất xếp trên
    })
    .slice(0, 5);

  // Xử lý dữ liệu biểu đồ và ngày tháng 
  const daysOfWeek = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
  const rawActivityData = dailyActivity || [];

  const formattedActivityData = rawActivityData.map((item) => {
    let displayLabel = item.day || "N/A";
    let dayOfWeekIndex = -1;

    if (item.date) {
      const d = new Date(item.date);
      if (!isNaN(d.getTime())) {
        dayOfWeekIndex = d.getDay() === 0 ? 6 : d.getDay() - 1;

        if (timeFilter === "30day" || timeFilter === "90day" || timeFilter === "custom") {
          displayLabel = `${d.getDate()}/${d.getMonth() + 1}`;
        } else {
          displayLabel = daysOfWeek[dayOfWeekIndex];
        }
      }
    }
    return { ...item, displayLabel, dayOfWeekIndex };
  });

  let heatmapPadding = [];
  if (formattedActivityData.length > 0 && formattedActivityData[0].dayOfWeekIndex !== -1) {
    const startIndex = formattedActivityData[0].dayOfWeekIndex;
    heatmapPadding = Array.from({ length: startIndex }).map((_, i) => (
      <div key={`empty-${i}`} className="heatmap-cell"></div>
    ));
  }

  return (
    <div className="stats-dashboard-layout">
      <Sidebar currentView="statistics" onNavigate={onNavigate} />

      <main className="stats-main-content">
        <div className="stats-container">
          <header className="stats-header">
            <div>
              <h1 className="stats-title">
                <i className="fa-solid fa-chart-simple text-primary"></i>
                Thống kê học tập
              </h1>
              <p className="stats-subtitle">
                Theo dõi tiến độ học Flashcard và kết quả luyện đề của bạn.
              </p>
            </div>
            <div className="stats-filter">
              <i className="fa-regular fa-calendar"></i>
              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
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
            <div className="stats-loader">
              <i className="fa-solid fa-spinner fa-spin"></i>
            </div>
          ) : (
            <>
              {/* Row 1: KPI Cards */}
              <div className="stats-kpi-grid">
                <div className="stats-card">
                  <div className="card-header">
                    <div className="icon-wrapper bg-primary-light">
                      <i className="fa-solid fa-layer-group"></i>
                    </div>
                    <div>
                      <div className="card-title">Flashcard</div>
                      <div className="card-subtitle">Thẻ cần ôn</div>
                    </div>
                  </div>
                  <div className="kpi-value text-primary">
                    {dueFcCards} <span className="kpi-unit">thẻ</span>
                  </div>
                  <div className="kpi-detail">Đã ôn: {learnedFcCards} thẻ</div>
                  <div className="progress-wrapper">
                    <div className="progress-track">
                      <div className="progress-fill bg-primary" style={{ width: `${fcProgress}%` }}></div>
                    </div>
                    <div className="progress-text">{fcProgress}%</div>
                  </div>
                </div>

                <div className="stats-card">
                  <div className="card-header">
                    <div className="icon-wrapper bg-red-light">
                      <i className="fa-solid fa-file-contract"></i>
                    </div>
                    <div>
                      <div className="card-title">Bộ đề thi</div>
                      <div className="card-subtitle">Đề chưa làm</div>
                    </div>
                  </div>
                  <div className="kpi-value text-red">
                    {examsDue} <span className="kpi-unit">đề</span>
                  </div>
                  <div className="kpi-detail">Đã làm: {examsDone} đề</div>
                  <div className="progress-wrapper">
                    <div className="progress-track">
                      <div className="progress-fill bg-red" style={{ width: `${examProgress}%` }}></div>
                    </div>
                    <div className="progress-text">{examProgress}%</div>
                  </div>
                </div>

                <div className="stats-card">
                  <div className="card-header">
                    <div className="icon-wrapper bg-orange-light">
                      <i className="fa-solid fa-fire"></i>
                    </div>
                    <div>
                      <div className="card-title">Streak</div>
                      <div className="card-subtitle">Ngày học liên tiếp</div>
                    </div>
                  </div>
                  <div className="kpi-value text-orange">
                    {kpis?.streak || 0} <span className="kpi-unit">ngày</span>
                  </div>
                  <div className="kpi-detail">Kỷ lục: {highestStreak} ngày</div>
                  <div className="streak-icons">
                    {[...Array(7)].map((_, i) => (
                      <i
                        key={i}
                        className={`fa-solid fa-fire ${i < Math.min((kpis?.streak || 0), 7) ? "active" : ""}`}
                      ></i>
                    ))}
                  </div>
                </div>
              </div>

              {/* Row 2: Biểu đồ & Heatmap */}
              <div className="stats-charts-grid">
                <div className="stats-card">
                  <div className="chart-header">
                    <h3 className="chart-title">Tổng quan học tập</h3>
                    <div className="chart-legend">
                      <span>
                        <div className="legend-dot bg-primary"></div> Flashcard
                      </span>
                      <span>
                        <div className="legend-dot bg-red"></div> Đề thi
                      </span>
                    </div>
                  </div>
                  <div className="chart-container">
                    <ResponsiveContainer width="100%" height="100%">
                      {/* 🌟 FIX Margin XAxis: Tăng Bottom lên 30 để hiện toàn bộ chữ T2, T3 */}
                      <LineChart data={formattedActivityData} margin={{ top: 10, right: 10, left: -20, bottom: 30 }}>
                        <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="4 4" />
                        <XAxis 
                          dataKey="displayLabel" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: "var(--chart-tick)", fontSize: 14, fontWeight: 500 }} 
                          dy={10} 
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: "var(--chart-tick)", fontSize: 14, fontWeight: 500 }} 
                          dx={-10} 
                        />
                        <Tooltip
                          content={<CustomTooltip />}
                          cursor={{ stroke: "var(--chart-grid)", strokeWidth: 2 }}
                        />
                        <Line type="monotone" name="Flashcard" dataKey="cards" stroke="#4F46E5" strokeWidth={4} dot={{ r: 5, fill: "#4F46E5", strokeWidth: 0 }} activeDot={{ r: 8 }} />
                        <Line type="monotone" name="Đề thi" dataKey="exams" stroke="#EF4444" strokeWidth={4} dot={{ r: 5, fill: "#EF4444", strokeWidth: 0 }} activeDot={{ r: 8 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="stats-card">
                  <h3 className="chart-title" style={{ marginBottom: "25px" }}>Lịch học tập</h3>
                  <div className="heatmap-grid">
                    {/* Header: T2 -> CN */}
                    {daysOfWeek.map((day) => (
                      <div key={day} className="heatmap-header">{day}</div>
                    ))}

                    {/* Khối lót (Padding) để ngày đầu tiên khớp đúng thứ */}
                    {heatmapPadding}

                    {/* Dữ liệu thực tế */}
                    {formattedActivityData.map((dayData, idx) => {
                      let dotClass = "bg-empty";
                      if (dayData.cards > 0 && dayData.exams > 0) dotClass = "bg-orange";
                      else if (dayData.cards > 0) dotClass = "bg-green";
                      else if (dayData.exams > 0) dotClass = "bg-red";

                      return (
                        <div key={idx} className="heatmap-cell" title={dayData.date ? new Date(dayData.date).toLocaleDateString("vi-VN") : ""}>
                          <div
                            className={`heatmap-dot ${dotClass}`}
                            style={{ boxShadow: dotClass !== "bg-empty" ? "0 2px 8px rgba(0,0,0,0.2)" : "none" }}
                          ></div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="heatmap-legend">
                    <span><div className="legend-circle border-green"></div> Ôn Flashcard</span>
                    <span><div className="legend-circle border-red"></div> Làm đề thi</span>
                    <span><div className="legend-circle bg-orange"></div> Cả hai</span>
                    <span><div className="legend-circle bg-empty"></div> Không học</span>
                  </div>
                </div>
              </div>

              {/* Row 3: Danh sách & Gần đây */}
              <div className="stats-lists-grid">
                {/* Cột 1: Thẻ cần ôn */}
                <div className="stats-card">
                  <div className="list-header">
                    <h3>Bộ thẻ cần ôn hôm nay</h3>
                    <div className="view-all-link" onClick={() => onNavigate("my-decks")}>
                      Xem tất cả <i className="fa-solid fa-arrow-right icon-small"></i>
                    </div>
                  </div>
                  <div className="list-container">
                    {topFlashcards.length > 0 ? (
                      topFlashcards.map((deck) => {
                        const total = deck.total || 0;
                        const learned = deck.learned || 0;
                        const due = Math.max(0, total - learned);
                        const progress = total > 0 ? Math.round((learned / total) * 100) : 0;
                        const isDone = total > 0 && due === 0;

                        return (
                          <div key={deck.id} className="list-item">
                            <div className="item-icon bg-primary-light">
                              <i className="fa-solid fa-layer-group"></i>
                            </div>
                            <div className="item-info">
                              <div className="item-name">
                                {deck.name?.replace(/\(ai generated\)/i, "").trim() || "Bộ thẻ"}
                              </div>
                              <div className="item-progress">
                                <div className="progress-track">
                                  <div className="progress-fill" style={{ width: `${progress}%`, background: isDone ? "#10B981" : "#F59E0B" }}></div>
                                </div>
                                <span className="item-count">{total} thẻ</span>
                              </div>
                            </div>
                            <button
                              className={`btn-action ${isDone ? "btn-done" : "btn-due"}`}
                              onClick={() => onNavigate("review", deck.id)}
                            >
                              {isDone ? "Xem lại" : "Ôn ngay"}
                            </button>
                          </div>
                        );
                      })
                    ) : (
                      <div className="empty-list">Chưa có thẻ cần ôn hôm nay.</div>
                    )}
                  </div>
                </div>

                {/* Cột 2: Đề thi gần đây */}
                <div className="stats-card">
                  <div className="list-header">
                    <h3>Đề thi gần đây</h3>
                    <div className="view-all-link" onClick={() => onNavigate("my-exams")}>
                      Xem tất cả <i className="fa-solid fa-arrow-right icon-small"></i>
                    </div>
                  </div>
                  <div className="list-container">
                    {recentExams.length > 0 ? (
                      recentExams.map((exam) => {
                        // Lấy điểm thật được Backend truyền xuống
                        const rawScore = exam.score !== null ? exam.score : 0;
                        const scoreDisplay = Number(rawScore).toFixed(1);

                        return (
                          <div key={exam.id} className="list-item">
                            <div className="item-icon bg-red-light">
                              <i className="fa-solid fa-file-contract"></i>
                            </div>
                            <div className="item-info">
                              <div className="item-name">
                                {exam.name?.replace(/\(ai generated\)/i, "").trim() || "Đề thi"}
                              </div>
                              <div className="item-time">
                                Tổng số: {exam.total || 0} câu
                                {exam.correct !== null && exam.correct !== undefined && (
                                  <>
                                    {" · "}
                                    <span className="text-green">Đúng {exam.correct}</span>
                                    {" · "}
                                    <span className="text-red">Sai {exam.wrong}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="item-score-action">
                              <span className="score-text text-green">
                                {scoreDisplay}/10
                              </span>
                              <button
                                className="btn-action btn-exam"
                                onClick={() => onNavigate("my-exams")}
                              >
                                Xem lại
                              </button>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="empty-list">Chưa có dữ liệu làm đề thi.</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Tip Banner */}
              <div className="stats-tip-banner">
                <i className="fa-regular fa-lightbulb"></i>
                <span>
                  <strong>Mẹo học tập:</strong> {randomTip}
                </span>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default StatisticsPage;