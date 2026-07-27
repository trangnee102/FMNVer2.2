// frontend/src/components/Dashboard/DashboardStats.jsx
import React from "react";
import StatCard from "../Cards/StatCard";

const DashboardStats = ({
  totalDueCards,
  totalCards, 
  totalDecks,
}) => {
  return (
    <div className="stat-grid">
      {/* 1. Thẻ cần ôn */}
      <StatCard
        icon="fa-layer-group"
        label="Thẻ cần ôn hôm nay"
        // Đảm bảo luôn hiển thị an toàn số 0 nếu dữ liệu là null/undefined/âm
        value={typeof totalDueCards === 'number' && totalDueCards > 0 ? totalDueCards : 0} 
        colorClass="bg-purple"
      />
      
      {/* 2. Tổng số Flashcards */}
      <StatCard
        icon="fa-file-lines" 
        label="Flashcards"
        value={typeof totalCards === 'number' && totalCards > 0 ? totalCards : 0}
        colorClass="bg-green"
      />
      
      {/* 3. Tổng bộ thẻ */}
      <StatCard
        icon="fa-folder"
        label="Tổng bộ thẻ"
        value={typeof totalDecks === 'number' && totalDecks > 0 ? totalDecks : 0}
        colorClass="bg-blue"
      />
    </div>
  );
};

export default DashboardStats;