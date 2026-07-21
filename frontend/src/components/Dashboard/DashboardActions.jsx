import React from "react";
import ActionCard from "../Cards/ActionCard";

const DashboardActions = ({ totalDueCards, onNavigate, onOpenCramModal, onStartStudy }) => {
  return (
    <div className="action-grid">
      <ActionCard
        title="Ôn tập ngay"
        desc={`Bắt đầu với ${totalDueCards > 0 ? totalDueCards : 0} thẻ cần ôn hôm nay`}
        btnText="Bắt đầu học →"
        bgColor="#f5f3ff"
        btnVariant="primary"
        // 👉 Gọi hàm tự động chọn bộ thẻ để học
        onClick={onStartStudy} 
      />

      <ActionCard
        title="Tạo Flashcard"
        desc="Tải tài liệu lên, AI sẽ giúp bạn tạo thẻ nhanh chóng"
        btnText="Tạo ngay →"
        bgColor="#ecfdf5"
        btnVariant="green"
        // 👉 Đảm bảo tên route này TRÙNG KHỚP với tên route tạo thẻ trong file Sidebar của bạn (thường là "create" hoặc "create-deck")
        onClick={() => onNavigate("create")}
      />

      <ActionCard
        title="Ôn thi cấp tốc"
        desc="Tính năng Cram Mode rút ngắn chu kỳ"
        btnText="Bật Cram Mode ⚡"
        bgColor="#fffbeb"
        btnVariant="orange"
        // 👉 Bật Popup chọn bộ thẻ
        onClick={onOpenCramModal}
      />
    </div>
  );
};

export default DashboardActions;