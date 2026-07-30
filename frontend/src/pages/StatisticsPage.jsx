// frontend/src/pages/StatisticsPage.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; 
import { useAuth } from "../context/AuthContext"; // 👉 THÊM: Quản lý đăng xuất nếu token hết hạn
import Sidebar from "../components/Layout/Sidebar";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
} from "recharts";

import { statisticsAPI } from "../services/api";
import "./DashboardPage.css";
import "./StatisticsPage.css"; 

const StatisticsPage = ({ onNavigate }) => {
  const navigate = useNavigate();
  const { logoutUser } = useAuth(); // Lấy hàm đăng xuất
  const [timeFilter, setTimeFilter] = useState("Tuần");
  const [statsData, setStatsData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  // Lấy và lưu Streak cao nhất từ LocalStorage
  const [highestStreak, setHighestStreak] = useState(() => {
    return parseInt(localStorage.getItem("highestStreak") || "0", 10);
  });

  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        setIsLoading(true);
        setErrorMsg(null);

        // 👉 ĐÃ FIX LỖI 400: Dịch từ tiếng Việt (UI) sang tiếng Anh chuẩn (Backend)
        const filterMap = {
          "Tuần": "week",
          "Tháng": "month",
          "Năm": "year"
        };
        const backendFilter = filterMap[timeFilter] || "week";

        // Fetch dữ liệu từ Backend thông qua Trạm kiểm soát api.js
        const json = await statisticsAPI.getStats(backendFilter);

        // Axios trả về trực tiếp response.data nên mình linh hoạt xử lý
        const dataPayload = json.data || json; 

        if (json && (json.success !== false)) {
          setStatsData(dataPayload);
          
          // Cập nhật kỷ lục Streak ngay khi có dữ liệu mới
          const currentStreak = dataPayload.kpis?.streak || 0;
          if (currentStreak > highestStreak) {
            setHighestStreak(currentStreak);
            localStorage.setItem("highestStreak", currentStreak.toString());
          }
        } else {
          setErrorMsg(json.message || "Không thể tải dữ liệu thống kê.");
        }
      } catch (error) {
        console.error("Lỗi khi fetch thống kê:", error);
        
        // 👉 Xử lý mượt mà lỗi Token hết hạn y như bên Dashboard
        const errorText = (error.message || error.error || "").toLowerCase();
        if (errorText.includes("token") || errorText.includes("hết hạn") || errorText.includes("invalid")) {
          setErrorMsg("Phiên đăng nhập đã hết hạn! Đang chuyển hướng...");
          setTimeout(() => {
            if (logoutUser) logoutUser();
            localStorage.clear();
            navigate("/login");
          }, 1500);
        } else {
          setErrorMsg(error.message || error.error || "Đứt cáp! Không kết nối được với server Backend.");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatistics();
  }, [timeFilter, highestStreak, logoutUser, navigate]);

  if (isLoading) {
    return (
      <div className="dashboard-layout">
        <Sidebar currentView="statistics" onNavigate={onNavigate} />
        <main className="dashboard-content">
          <div className="loading-state" style={{ textAlign: "center", padding: "50px", color: "var(--text-gray)" }}>
            <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: "2rem", margin: "0 auto 15px auto", display: "block" }}></i>
            <p>Đang đồng bộ số liệu thời gian thực... ⏳</p>
          </div>
        </main>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="dashboard-layout">
        <Sidebar currentView="statistics" onNavigate={onNavigate} />
        <main className="dashboard-content">
          <div style={{ textAlign: "center", padding: "50px", background: "var(--bg-card)", border: "1px solid var(--border)", margin: "30px", borderRadius: "16px" }}>
            <h2 style={{ color: "#ef4444" }}>Ối, có lỗi rồi! 🚨</h2>
            <p style={{ color: "var(--text-gray)" }}>{errorMsg}</p>
          </div>
        </main>
      </div>
    );
  }

  const { kpis, dailyActivity, retentionByWeek, deckPerformance, recentHistory } = statsData || {};

  // Tự động trích xuất Lịch sử ôn tập từ các bộ thẻ vừa học nếu Backend không trả về mảng recentHistory
  const activeHistory = recentHistory && recentHistory.length > 0 
    ? recentHistory 
    : (deckPerformance || []).filter(d => d.learned > 0).sort((a, b) => b.learned - a.learned).slice(0, 5);

  return (
    <div className="dashboard-layout">
      <Sidebar currentView="statistics" onNavigate={onNavigate} />

      <main className="dashboard-content scrollable-content" style={{ backgroundColor: "var(--bg-main)" }}>
        <div className="page-wrapper stats-wrapper">
          
          {/* ========================================== */}
          {/* HEADER & LỌC THỜI GIAN                     */}
          {/* ========================================== */}
          <header className="modern-stats-header">
            <div className="header-title">
              <h1>
                <i className="fa-solid fa-chart-simple" style={{ color: "var(--primary)" }}></i> Thống Kê Học Tập
              </h1>
              <p>Theo dõi tiến độ, hiệu suất và thói quen học tập của bạn</p>
            </div>

            <div className="header-actions">
              <div className="modern-filter-group">
                {["Tuần", "Tháng", "Năm"].map((filter) => (
                  <button
                    key={filter}
                    className={`btn-filter ${timeFilter === filter ? "active" : ""}`}
                    onClick={() => setTimeFilter(filter)}
                  >
                    {filter}
                  </button>
                ))}
              </div>
              
              
            </div>
          </header>

          {/* ========================================== */}
          {/* HÀNG 1: 4 THẺ CHỈ SỐ (KPI CARDS)             */}
          {/* ========================================== */}
          <div className="stats-kpi-grid">
            <div className="stats-kpi-card">
              <div className="sk-header">
                <div className="sk-icon bg-orange-light text-orange"><i className="fa-solid fa-fire"></i></div>
                <span className="sk-title">Streak</span>
              </div>
              <div className="sk-value">
                {kpis?.streak || 0} <span>ngày</span>
              </div>
              <div className="sk-subtext">Kỷ lục cao nhất: <strong style={{ color: "var(--text-dark)" }}>{highestStreak} ngày</strong></div>
            </div>

            <div className="stats-kpi-card">
              <div className="sk-header">
                <div className="sk-icon bg-blue-light text-blue"><i className="fa-solid fa-credit-card"></i></div>
                <span className="sk-title">Thẻ đã học</span>
              </div>
              <div className="sk-value">
                {kpis?.cardsToday || 0} <span>thẻ</span>
              </div>
              <div className="sk-subtext">Tổng số thẻ đã ôn trong {timeFilter.toLowerCase()}</div>
            </div>

            <div className="stats-kpi-card">
              <div className="sk-header">
                <div className="sk-icon bg-green-light text-green"><i className="fa-solid fa-stopwatch"></i></div>
                <span className="sk-title">Thời gian học</span>
              </div>
              <div className="sk-value">
                {kpis?.minutesToday || 0} <span>phút</span>
              </div>
              <div className="sk-subtext">Tổng thời gian học tập</div>
            </div>

            <div className="stats-kpi-card">
              <div className="sk-header">
                <div className="sk-icon bg-purple-light text-purple"><i className="fa-solid fa-trophy"></i></div>
                <span className="sk-title">Tỷ lệ ghi nhớ</span>
              </div>
              <div className="sk-value">
                {kpis?.retentionRate || 0}%
              </div>
              <div className="sk-subtext">Hiệu suất ghi nhớ trung bình</div>
            </div>
          </div>

          {/* ========================================== */}
          {/* HÀNG 2: BIỂU ĐỒ (CHARTS)                     */}
          {/* ========================================== */}
          <div className="stats-charts-grid">
            
            <div className="stats-chart-card">
              <div className="chart-header">
                <h4><i className="fa-solid fa-chart-column" style={{ color: "var(--primary)" }}></i> Hoạt động hàng ngày</h4>
                <div className="chart-dropdown">Số thẻ đã ôn <i className="fa-solid fa-chevron-down"></i></div>
              </div>
              <div className="chart-body">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyActivity || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "var(--text-gray)", fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--text-gray)", fontSize: 12 }} allowDecimals={false} />
                    <Tooltip 
                      cursor={{ fill: "var(--border)", opacity: 0.5 }} 
                      contentStyle={{ backgroundColor: "var(--bg-card)", borderRadius: "8px", border: "1px solid var(--border)", color: "var(--text-dark)", boxShadow: "0 4px 10px rgba(0,0,0,0.05)" }} 
                    />
                    <Bar dataKey="cards" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={45} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="stats-chart-card">
              <div className="chart-header">
                <h4><i className="fa-solid fa-brain" style={{ color: "#ec4899" }}></i> Tỷ lệ ghi nhớ</h4>
                
              </div>
              <div className="chart-body">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={retentionByWeek || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fill: "var(--text-gray)", fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--text-gray)", fontSize: 12 }} tickFormatter={(val) => `${val}%`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "var(--bg-card)", borderRadius: "8px", border: "1px solid var(--border)", color: "var(--text-dark)", boxShadow: "0 4px 10px rgba(0,0,0,0.05)" }} 
                    />
                    <Area type="monotone" dataKey="rate" stroke="#10b981" strokeWidth={3} fill="rgba(16, 185, 129, 0.15)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* ========================================== */}
          {/* HÀNG 3: BẢNG CHI TIẾT & LỊCH SỬ              */}
          {/* ========================================== */}
          <div className="stats-bottom-grid">
            
            {/* Cột trái: Bảng hiệu suất CÓ THANH TIẾN TRÌNH */}
            <div className="stats-table-card">
              <div className="table-header">
                <h4><i className="fa-solid fa-bullseye" style={{ color: "#ec4899" }}></i> Hiệu suất các bộ thẻ</h4>
              </div>
              
              <div className="table-container">
                <table className="modern-perf-table">
                  <thead>
                    <tr>
                      <th>Bộ thẻ</th>
                      <th style={{textAlign: 'center', width: '15%'}}>Đã học</th>
                      <th style={{textAlign: 'center', width: '35%'}}>Tiến trình học tập</th>
                      <th style={{textAlign: 'center', width: '15%'}}>Thời gian</th>
                      <th style={{width: '5%'}}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {deckPerformance && deckPerformance.length > 0 ? (
                      deckPerformance.map((deck) => {
                        const isAIGenerated = (deck.name || "").toLowerCase().includes("(ai generated)");
                        const displayTitle = isAIGenerated ? deck.name.replace(/\(ai generated\)/i, "").trim() : deck.name;
                        const isDone = deck.percent === 100;

                        return (
                          <tr key={deck.id}>
                            <td className="deck-name-col">
                              <div className="deck-icon bg-purple-light"><i className="fa-solid fa-layer-group"></i></div>
                              <span className="deck-name-text">
                                {displayTitle}
                                {isAIGenerated && <i className="fa-solid fa-robot" style={{color: "#a855f7", marginLeft: "6px"}} title="Tạo bằng AI"></i>}
                              </span>
                            </td>
                            <td style={{textAlign: 'center', fontWeight: '600'}}>{deck.learned}/{deck.total || 0}</td>
                            
                            <td style={{textAlign: 'center'}}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center' }}>
                                <div style={{ flex: 1, height: '8px', background: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                                  <div style={{ height: '100%', background: isDone ? '#10b981' : 'var(--primary)', width: `${deck.percent}%`, transition: 'width 0.5s ease' }}></div>
                                </div>
                                <span style={{ fontWeight: '700', minWidth: '40px', textAlign: 'right', color: isDone ? '#10b981' : 'var(--text-dark)' }}>{deck.percent}%</span>
                              </div>
                            </td>

                            <td style={{textAlign: 'center', color: 'var(--text-gray)'}}>{deck.time || 0} phút</td>
                            <td style={{textAlign: 'right'}}>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="5" className="empty-table-row">Chưa có dữ liệu học tập cho bộ thẻ nào.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="table-footer">
                <button className="btn-view-all" onClick={() => { if(onNavigate) onNavigate("my-decks") }}>
                  Xem tất cả bộ thẻ <i className="fa-solid fa-arrow-right"></i>
                </button>
              </div>
            </div>

            {/* Cột phải: Lịch sử ôn tập CÓ DỮ LIỆU */}
            <div className="stats-history-card">
              <div className="history-header">
                <h4><i className="fa-solid fa-fire text-orange"></i> Lịch sử ôn tập gần đây</h4>
              </div>
              
              {activeHistory.length > 0 ? (
                <div style={{ padding: "10px 25px 25px 25px" }}>
                  {activeHistory.map((item, idx) => {
                    const itemName = item.deckName || item.name || "Bộ thẻ";
                    const isAI = itemName.toLowerCase().includes("(ai generated)");
                    const cleanName = isAI ? itemName.replace(/\(ai generated\)/i, "").trim() : itemName;

                    return (
                      <div key={idx} style={{ display: "flex", alignItems: "center", gap: "15px", padding: "15px 0", borderBottom: "1px dashed var(--border)" }}>
                        <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "var(--bg-main)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--primary)", fontSize: "1.1rem" }}>
                          <i className="fa-solid fa-book-open-reader"></i>
                        </div>
                        <div style={{ flex: 1 }}>
                          <h5 style={{ margin: "0 0 4px 0", color: "var(--text-dark)", fontSize: "0.95rem", fontWeight: "700" }}>{cleanName}</h5>
                          <p style={{ margin: 0, color: "var(--text-gray)", fontSize: "0.8rem" }}>Vừa ôn tập xong</p>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ color: "#10b981", fontWeight: "800", fontSize: "0.95rem" }}>+{item.cardsReviewed || item.learned} thẻ</div>
                          <div style={{ color: "var(--text-gray)", fontSize: "0.8rem", marginTop: "3px" }}>{item.duration || item.time || "< 1"} phút</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="history-empty-state">
                  <div className="history-illustration bg-purple-light text-purple">
                    <i className="fa-solid fa-box-open"></i>
                  </div>
                  <h5>Chưa có lịch tập gần đây</h5>
                  <p>Bắt đầu ôn tập để xem lịch sử tại đây nhé!</p>
                  <button className="btn-start-review" onClick={() => { if(onNavigate) onNavigate("review") }}>
                    Bắt đầu ôn tập ngay
                  </button>
                </div>
              )}
            </div>

          </div>

        </div>
      </main>
    </div>
  );
};

export default StatisticsPage;