import React from "react";
import StatCard from "../Cards/StatCard";

const DashboardStats = ({
  totalDueCards,
  totalMastered,
  totalDecks,
}) => {
  return (
    <div className="stat-grid">
      <StatCard
        icon="fa-layer-group"
        label="Thẻ cần ôn hôm nay"
        // Đảm bảo luôn hiện số 0 nếu không có dữ liệu
        value={totalDueCards > 0 ? totalDueCards : 0} 
        colorClass="bg-purple"
      />
      
      <StatCard
        icon="fa-circle-check"
        label="Thẻ đã thuộc"
        value={totalMastered > 0 ? totalMastered : 0}
        colorClass="bg-green"
      />
      
      <StatCard
        icon="fa-folder"
        label="Tổng bộ thẻ"
        value={totalDecks > 0 ? totalDecks : 0}
        colorClass="bg-blue"
      />
    </div>
  );
};

export default DashboardStats;