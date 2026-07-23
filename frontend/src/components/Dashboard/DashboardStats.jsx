import React from "react";
import StatCard from "../Cards/StatCard";

const DashboardStats = ({
  totalDueCards,
  totalMastered,
  streak,
  totalDecks,
}) => {
  // Hàm xử lý khi bấm vào nút Streak
  const handleStreakClick = () => {
    // Tạm thời chúng ta cho hiện thông báo để test "nút bấm"
    // Khi nào làm API điểm danh, mình sẽ thay bằng lệnh gọi xuống Backend sau nhé!
    alert("🔥 Điểm danh thành công! Bạn đang duy trì chuỗi học tập rất tốt.");
  };

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
      
      {/* Bọc thẻ Streak lại để biến nó thành nút bấm, thêm hiệu ứng hover mượt mà */}
      <div 
        onClick={handleStreakClick} 
        style={{ 
          cursor: "pointer",
          transition: "transform 0.2s ease"
        }} 
        onMouseOver={(e) => (e.currentTarget.style.transform = "scale(1.03)")}
        onMouseOut={(e) => (e.currentTarget.style.transform = "scale(1)")}
        title="Bấm vào để điểm danh / đếm chuỗi!"
      >
        <StatCard
          icon="fa-fire"
          label="Streak (Bấm điểm danh)"
          value={`${streak > 0 ? streak : 0} ngày`}
          colorClass="bg-red"
        />
      </div>

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