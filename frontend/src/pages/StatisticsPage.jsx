import React, { useState, useEffect } from "react";
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

// 👉 IMPORT API ĐÃ ĐƯỢC ĐÓNG GÓI
import { statisticsAPI } from "../services/api";

import "./DashboardPage.css";
import "./StatisticsPage.css";

const StatisticsPage = ({ onNavigate }) => {
  const [timeFilter, setTimeFilter] = useState("Tuần");

  // 👉 CÁC STATE LƯU TRỮ DỮ LIỆU THẬT TỪ BACKEND
  const [statsData, setStatsData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  // 👉 HÀM GỌI API LẤY DỮ LIỆU THỐNG KÊ THẬT (Đã cập nhật)
  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        setIsLoading(true);
        setErrorMsg(null); // Reset lỗi trước khi gọi lại API

        // 👉 Gọi API và truyền bộ lọc (Tuần/Tháng/Năm) xuống Backend
        const json = await statisticsAPI.getStats(timeFilter);

        if (json && json.success) {
          setStatsData(json.data); // Hốt trọn ổ dữ liệu từ Backend
        } else {
          setErrorMsg(json.message || "Không thể tải dữ liệu thống kê.");
        }
      } catch (error) {
        console.error("Lỗi khi fetch thống kê:", error);
        setErrorMsg("Đứt cáp! Không kết nối được với server Backend.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatistics();
  }, [timeFilter]); // Mỗi lần bấm chuyển Tuần/Tháng/Năm sẽ tự động load lại số liệu

  // Trạng thái đang tải dữ liệu
  if (isLoading) {
    return (
      <div className="dashboard-layout">
        <Sidebar currentView="statistics" onNavigate={onNavigate} />
        <main className="dashboard-content">
          <p style={{ textAlign: "center", color: "#64748b", padding: "50px" }}>
            Đang tính toán số liệu học tập... ⏳
          </p>
        </main>
      </div>
    );
  }

  // Trạng thái bị lỗi
  if (errorMsg) {
    return (
      <div className="dashboard-layout">
        <Sidebar currentView="statistics" onNavigate={onNavigate} />
        <main className="dashboard-content">
          <div style={{ textAlign: "center", padding: "50px" }}>
            <h2 style={{ color: "#ef4444" }}>Ối, có lỗi rồi! 🚨</h2>
            <p style={{ color: "#475569" }}>{errorMsg}</p>
          </div>
        </main>
      </div>
    );
  }

  // Phân rã dữ liệu từ Backend ra để nhét vào UI
  const { kpis, dailyActivity, retentionByWeek, deckPerformance } =
    statsData || {};

  return (
    <div className="dashboard-layout">
      <Sidebar currentView="statistics" onNavigate={onNavigate} />

      <main className="dashboard-content">
        <div className="page-wrapper">
          {/* HEADER & LỌC THỜI GIAN */}
          <header className="stats-header">
            <div>
              <h1
                style={{
                  margin: "0 0 5px 0",
                  color: "#1e293b",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                📈 Thống Kê Học Tập
              </h1>
              <p style={{ margin: 0, color: "#64748b" }}>
                Theo dõi tiến độ, hiệu suất và thói quen học tập của cậu
              </p>
            </div>

            <div className="filter-group">
              {["Tuần", "Tháng", "Năm"].map((filter) => (
                <button
                  key={filter}
                  className={`filter-btn ${timeFilter === filter ? "active" : ""}`}
                  onClick={() => setTimeFilter(filter)}
                >
                  {filter}
                </button>
              ))}
            </div>
          </header>

          {/* 4 THẺ KPIS THẬT */}
          <div className="kpi-grid">
            <div className="kpi-card">
              <div
                className="kpi-icon"
                style={{ background: "#fef3c7", color: "#d97706" }}
              >
                🔥
              </div>
              <div className="kpi-info">
                <p>Streak</p>
                <h3>
                  {kpis?.streak || 0}{" "}
                  <span style={{ fontSize: "1rem", fontWeight: "normal" }}>
                    ngày
                  </span>
                </h3>
              </div>
            </div>
            <div className="kpi-card">
              <div
                className="kpi-icon"
                style={{ background: "#e0e7ff", color: "#4f46e5" }}
              >
                💳
              </div>
              <div className="kpi-info">
                <p>Thẻ đã học</p>
                <h3>
                  {kpis?.cardsToday || 0}{" "}
                  <span style={{ fontSize: "1rem", fontWeight: "normal" }}>
                    thẻ
                  </span>
                </h3>
              </div>
            </div>
            <div className="kpi-card">
              <div
                className="kpi-icon"
                style={{ background: "#dcfce7", color: "#16a34a" }}
              >
                ⏱️
              </div>
              <div className="kpi-info">
                <p>Thời gian học</p>
                <h3>
                  {kpis?.minutesToday || 0}{" "}
                  <span style={{ fontSize: "1rem", fontWeight: "normal" }}>
                    phút
                  </span>
                </h3>
              </div>
            </div>
            <div className="kpi-card">
              <div
                className="kpi-icon"
                style={{ background: "#f3e8ff", color: "#9333ea" }}
              >
                🏆
              </div>
              <div className="kpi-info">
                <p>Tỷ lệ ghi nhớ</p>
                <h3>{kpis?.retentionRate || 0}%</h3>
              </div>
            </div>
          </div>

          {/* KHU VỰC BIỂU ĐỒ THẬT */}
          <div className="charts-grid">
            {/* Biểu đồ Cột */}
            <div className="chart-card">
              <h4>📊 Hoạt động hàng ngày</h4>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={dailyActivity || []}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#e2e8f0"
                  />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748b", fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748b", fontSize: 12 }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    cursor={{ fill: "#f1f5f9" }}
                    contentStyle={{
                      borderRadius: "8px",
                      border: "none",
                      boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                    }}
                  />
                  <Bar
                    dataKey="cards"
                    fill="#818cf8"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Biểu đồ Vùng */}
            <div className="chart-card">
              <h4>🧠 Tỷ lệ ghi nhớ</h4>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={retentionByWeek || []}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#e2e8f0"
                  />
                  <XAxis
                    dataKey="week"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748b", fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748b", fontSize: 12 }}
                    tickFormatter={(val) => `${val}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "none",
                      boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="rate"
                    stroke="#10b981"
                    strokeWidth={3}
                    fill="#d1fae5"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* DANH SÁCH BỘ THẺ THẬT */}
          <div className="performance-list">
            <h4 style={{ margin: "0 0 20px 0", color: "#334155" }}>
              🎯 Hiệu suất các bộ thẻ
            </h4>
            {deckPerformance && deckPerformance.length === 0 ? (
              <p style={{ color: "#64748b", fontStyle: "italic" }}>
                Cậu chưa có dữ liệu bộ thẻ nào.
              </p>
            ) : (
              deckPerformance?.map((deck) => (
                <div className="perf-item" key={deck.id}>
                  <div className="perf-name">
                    <span style={{ color: "#8b5cf6" }}>🗂️</span> {deck.name}
                  </div>
                  <div className="perf-bar-container">
                    <div className="perf-bar-bg">
                      <div
                        className="perf-bar-fill"
                        style={{
                          width: `${deck.percent}%`,
                          background:
                            deck.percent === 100 ? "#10b981" : "#6366f1",
                        }}
                      ></div>
                    </div>
                    <span
                      style={{
                        fontSize: "0.85rem",
                        fontWeight: "bold",
                        color: "#475569",
                        minWidth: "40px",
                      }}
                    >
                      {deck.percent}%
                    </span>
                  </div>
                  <div className="perf-stats">
                    <div>
                      <strong>{deck.learned}</strong> đã thuộc
                    </div>
                    <div>
                      <strong>{deck.total}</strong> tổng số thẻ
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default StatisticsPage;
