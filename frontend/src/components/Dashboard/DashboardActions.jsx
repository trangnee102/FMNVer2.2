// frontend/src/components/Dashboard/DashboardActions.jsx
import React from "react";

const DashboardActions = ({ totalDueCards, onNavigate, onOpenCramModal, onStartStudy }) => {

  const handleOpenCramMode = () => {
    // 👉 ĐÃ FIX: Loại bỏ alert thô kệch, việc hiển thị Modal là đủ để mang lại UX/UI tốt nhất
    if (onOpenCramModal) onOpenCramModal();
  };

  const handleStudyClick = () => {
    if (onStartStudy) {
      onStartStudy();
    } else {
      onNavigate("my-decks");
    }
  };

  return (
    <div className="action-grid">
      <div className="action-card">
        <div>
          <h3>Ôn tập ngay</h3>
          <p>Bắt đầu với {typeof totalDueCards === 'number' && totalDueCards > 0 ? totalDueCards : 0} thẻ cần ôn hôm nay</p>
        </div>
        <button 
          className="action-btn-primary btn-action-blue"
          onClick={handleStudyClick} 
        >
          Bắt đầu học →
        </button>
      </div>

      <div className="action-card">
        <div>
          <h3>Tạo Flashcard</h3>
          <p>Tải tài liệu lên, AI sẽ giúp bạn tạo thẻ nhanh chóng</p>
        </div>
        {/* 👉 ĐÃ FIX: Chuyển sang class btn-action-gray để ăn mã màu Tím Pastel cực đẹp đã viết ở CSS */}
        <button 
          className="action-btn-primary btn-action-gray"
          onClick={() => onNavigate("create")}
        >
          ✨ Tạo ngay →
        </button>
      </div>

      <div className="action-card">
        <div>
          <h3>Ôn thi cấp tốc</h3>
          <p>Tính năng Cram Mode rút ngắn chu kỳ</p>
        </div>
        <button 
          className="action-btn-primary btn-action-orange"
          onClick={handleOpenCramMode}
        >
          Bật Cram Mode ⚡
        </button>
      </div>
    </div>
  );
};

export default DashboardActions;