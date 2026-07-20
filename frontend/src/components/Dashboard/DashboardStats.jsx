import React from "react";
import StatCard from "../Cards/StatCard"; // 👉 Đã trỏ đúng vào thư mục Cards

const DashboardStats = ({
  totalDueCards,
  totalMastered,
  streak,
  totalDecks,
}) => {
  return (
    <div className="stat-grid">
      <StatCard
        icon="fa-layer-group"
        label="Thẻ cần ôn hôm nay"
        value={totalDueCards}
        colorClass="bg-purple"
      />
      <StatCard
        icon="fa-circle-check"
        label="Thẻ đã thuộc"
        value={totalMastered}
        colorClass="bg-green"
      />
      <StatCard
        icon="fa-fire"
        label="Streak"
        value={streak}
        colorClass="bg-red"
      />
      <StatCard
        icon="fa-folder"
        label="Tổng bộ thẻ"
        value={totalDecks}
        colorClass="bg-blue"
      />
    </div>
  );
};

export default DashboardStats;
