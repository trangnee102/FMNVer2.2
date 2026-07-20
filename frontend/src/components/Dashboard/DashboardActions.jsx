import React from "react";
import ActionCard from "../Cards/ActionCard";

// 👉 ĐÃ SỬA: Nhận thêm onNavigate để có thể chuyển trang
const DashboardActions = ({ totalDueCards, onNavigate }) => {
  return (
    <div className="action-grid">
      <ActionCard
        title="Ôn tập ngay"
        desc={`Bắt đầu với ${totalDueCards} thẻ cần ôn hôm nay`}
        btnText="Bắt đầu học →"
        bgColor="#f5f3ff"
        btnVariant="primary"
        // Chuyển sang Kho thẻ để chọn môn học
        onClick={() => onNavigate("my-decks")}
      />

      <ActionCard
        title="Tạo Flashcard"
        desc="Tải tài liệu lên, AI sẽ giúp bạn tạo thẻ nhanh chóng"
        btnText="Tạo ngay →"
        bgColor="#ecfdf5"
        btnVariant="green"
        // Bay thẳng sang trang Tạo thẻ
        onClick={() => onNavigate("create")}
      />

      <ActionCard
        title="Ôn thi cấp tốc"
        desc="Tính năng Cram Mode rút ngắn chu kỳ"
        btnText="Bật Cram Mode ⚡"
        bgColor="#fffbeb"
        btnVariant="orange"
        // Bay sang Kho thẻ, nơi chứa các nút Bật Cram Mode
        onClick={() => onNavigate("my-decks")}
      />
    </div>
  );
};

export default DashboardActions;
