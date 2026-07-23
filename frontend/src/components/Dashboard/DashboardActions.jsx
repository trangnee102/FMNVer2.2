import React from "react";
import ActionCard from "../Cards/ActionCard";

const DashboardActions = ({ totalDueCards, onNavigate, onOpenCramModal }) => {
  
  // 👉 THÊM: Hàm xử lý thông báo chuyên nghiệp khi bật Cram Mode
  const handleOpenCramMode = () => {
    alert("⚡ Chế độ Cram Mode đã sẵn sàng!\nHãy tập trung cao độ để bứt phá giới hạn học tập của bạn nhé.");
    onOpenCramModal();
  };

  return (
    <div className="action-grid">
      <ActionCard
        title="Ôn tập ngay"
        desc={`Bắt đầu với ${totalDueCards > 0 ? totalDueCards : 0} thẻ cần ôn hôm nay`}
        btnText="Bắt đầu học →"
        bgColor="rgba(139, 92, 246, 0.05)"
        btnVariant="primary"
        // 👉 ĐÃ SỬA THEO YÊU CẦU: Nhảy thẳng sang trang Thư viện của tôi
        onClick={() => onNavigate("my-decks")} 
      />

      <ActionCard
        title="Tạo Flashcard"
        desc="Tải tài liệu lên, AI sẽ giúp bạn tạo thẻ nhanh chóng"
        btnText="Tạo ngay →"
        bgColor="rgba(16, 185, 129, 0.05)"
        btnVariant="green"
        // 👉 Giữ nguyên chức năng sang trang Tạo thẻ
        onClick={() => onNavigate("create")}
      />

      <ActionCard
        title="Ôn thi cấp tốc"
        desc="Tính năng Cram Mode rút ngắn chu kỳ"
        btnText="Bật Cram Mode ⚡"
        bgColor="rgba(245, 158, 11, 0.05)"
        btnVariant="orange"
        // 👉 ĐÃ SỬA THEO YÊU CẦU: Hiện thông báo chuyên nghiệp rồi mới bật Modal
        onClick={handleOpenCramMode}
      />
    </div>
  );
};

export default DashboardActions;