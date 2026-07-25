import React from "react";

const DashboardActions = ({ totalDueCards, onNavigate, onOpenCramModal }) => {
  
  // 👉 THÊM: Hàm xử lý thông báo chuyên nghiệp khi bật Cram Mode
  const handleOpenCramMode = () => {
    alert("⚡ Chế độ Cram Mode đã sẵn sàng!\nHãy tập trung cao độ để bứt phá giới hạn học tập của bạn nhé.");
    onOpenCramModal();
  };

  return (
    <div className="action-grid">
      
      {/* Thẻ 1: Ôn tập ngay */}
      <div className="action-card">
        <div>
          <h3>Ôn tập ngay</h3>
          <p>Bắt đầu với {totalDueCards > 0 ? totalDueCards : 0} thẻ cần ôn hôm nay</p>
        </div>
        <button 
          className="action-btn-primary btn-action-blue"
          onClick={() => onNavigate("my-decks")} 
        >
          Bắt đầu học →
        </button>
      </div>

      {/* Thẻ 2: Tạo Flashcard */}
      <div className="action-card">
        <div>
          <h3>Tạo Flashcard</h3>
          <p>Tải tài liệu lên, AI sẽ giúp bạn tạo thẻ nhanh chóng</p>
        </div>
        <button 
          className="action-btn-primary btn-action-gray"
          onClick={() => onNavigate("create")}
        >
          Tạo ngay →
        </button>
      </div>

      {/* Thẻ 3: Ôn thi cấp tốc */}
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