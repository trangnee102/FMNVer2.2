import React, { useState, useEffect } from "react";
import "./LeaderboardTab.css";
import { communityAPI } from "../../services/api"; // 👉 ĐÃ THÊM: Nhúng API

const LeaderboardTab = () => {
  const [filterType, setFilterType] = useState("points"); // Mặc định Backend đang xếp theo điểm (points)
  const [filterTime, setFilterTime] = useState("month");

  // 👉 ĐÃ SỬA: State rỗng chờ đón data thật từ Backend
  const [rankings, setRankings] = useState([]);

  // 👉 ĐÃ THÊM: Gọi API lấy Bảng xếp hạng khi vừa mở Tab
  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const data = await communityAPI.getLeaderboard();
        setRankings(data);
      } catch (error) {
        console.error("Lỗi khi tải bảng xếp hạng:", error);
      }
    };

    fetchLeaderboard();
  }, []);

  // Data của chính người dùng đang đăng nhập (Tạm thời giữ nguyên để hiển thị thanh Sticky dưới cùng)
  const currentUser = {
    rank: 12,
    name: "Huyền Trang", // - Trích xuất từ lịch sử trò chuyện của user
    streak: 12,
    cards: 150,
    avatar: "HT",
    color: "#ef4444",
  };

  // 👉 ĐÃ SỬA: Tách Top 3 an toàn (Đề phòng trường hợp Database mới tạo chưa đủ 3 người)
  const top3 = [];
  if (rankings.length > 1) top3.push(rankings[1]); // Hạng 2 đứng bên trái
  if (rankings.length > 0) top3.push(rankings[0]); // Hạng 1 đứng chính giữa cao nhất
  if (rankings.length > 2) top3.push(rankings[2]); // Hạng 3 đứng bên phải

  const others = rankings.length > 3 ? rankings.slice(3) : [];

  return (
    <div className="leaderboard-tab">
      {/* BỘ LỌC XẾP HẠNG */}
      <div className="filters-row">
        <div className="filter-group">
          <button
            className={filterType === "streak" ? "active" : ""}
            onClick={() => setFilterType("streak")}
          >
            🔥 Chuỗi ngày
          </button>
          <button
            className={filterType === "cards" ? "active" : ""}
            onClick={() => setFilterType("cards")}
          >
            💳 Số thẻ
          </button>
          <button
            className={filterType === "points" ? "active" : ""}
            onClick={() => setFilterType("points")}
          >
            ⭐ Điểm số
          </button>
        </div>
        <select
          className="time-select"
          value={filterTime}
          onChange={(e) => setFilterTime(e.target.value)}
        >
          <option value="week">Tuần này</option>
          <option value="month">Tháng này</option>
          <option value="all">Toàn thời gian</option>
        </select>
      </div>

      {/* BỤC VINH DANH TOP 3 */}
      <div className="podium-container">
        {top3.map((user, index) => {
          // Tính toán vị trí hiển thị: Nếu mảng top3 đẩy đủ thì index 0 là hạng 2, index 1 là hạng 1, index 2 là hạng 3
          const actualRank =
            user.id === rankings[0]?.id
              ? 1
              : user.id === rankings[1]?.id
                ? 2
                : 3;

          return (
            <div key={user.id} className={`podium-item rank-${actualRank}`}>
              <div
                className="podium-avatar"
                style={{ backgroundColor: user.avatar_color || "#94a3b8" }} // Đổi biến color -> avatar_color
              >
                {actualRank === 1 && <div className="crown">👑</div>}
                {user.avatar_text || "U"}
              </div>
              <div className="podium-name">{user.full_name}</div>
              <div className="podium-stats">{user.total_points} điểm</div>
              <div className="podium-base">#{actualRank}</div>
            </div>
          );
        })}
      </div>

      {/* DANH SÁCH CUỘN (Từ hạng 4 trở đi) */}
      <div className="list-container">
        {others.map((user, index) => (
          <div key={user.id} className="list-item">
            <div className="list-rank">#{index + 4}</div>
            <div
              className="list-avatar"
              style={{ backgroundColor: user.avatar_color || "#94a3b8" }}
            >
              {user.avatar_text || "U"}
            </div>
            <div className="list-info">
              <h4>{user.full_name}</h4>
            </div>
            <div className="list-score">⭐ {user.total_points} điểm</div>
          </div>
        ))}
      </div>

      {/* THANH ĐỊNH VỊ CÁ NHÂN (Sticky Row) */}
      <div className="sticky-user-row">
        <div className="list-rank" style={{ color: "#ef4444" }}>
          #{currentUser.rank}
        </div>
        <div
          className="list-avatar"
          style={{ backgroundColor: currentUser.color }}
        >
          {currentUser.avatar}
        </div>
        <div className="list-info">
          <h4 style={{ color: "#ef4444" }}>{currentUser.name} (Bạn)</h4>
        </div>
        <div className="list-score" style={{ fontWeight: "bold" }}>
          ⭐ 3450 điểm
        </div>
      </div>
    </div>
  );
};

export default LeaderboardTab;
