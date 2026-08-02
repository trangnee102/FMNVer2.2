// frontend/src/components/Dashboard/DashboardActions.jsx
import React from "react";

// 👉 ĐÃ FIX: Đặt giá trị mặc định = 0 để tránh lỗi undefined khi data chưa load kịp
const DashboardActions = ({ totalDueCards = 0, totalExams = 0, onNavigate, onOpenCramModal, onStartStudy }) => {

  const handleOpenCramMode = () => {
    if (onOpenCramModal) onOpenCramModal();
  };

  const handleStudyClick = () => {
    if (onStartStudy) {
      onStartStudy();
    } else {
      onNavigate("review");
    }
  };

  const safeDueCards = typeof totalDueCards === 'number' && totalDueCards > 0 ? totalDueCards : 0;
  const safeExams = typeof totalExams === 'number' && totalExams > 0 ? totalExams : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      
      {/* 🌟 TẦNG 1: KHU VỰC THẺ CHÍNH */}
      <div className="action-grid">
        
        {/* Thẻ 1: Ôn tập Flashcard (Màu Tím) */}
        <div className="action-card action-card-purple" style={{ position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'relative', zIndex: 2, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ color: '#5b21b6', fontSize: '1.35rem', marginBottom: '8px' }}>Ôn tập Flashcard</h3>
              <p style={{ color: '#7e22ce', fontSize: '0.9rem', marginBottom: '8px', lineHeight: '1.4', maxWidth: '75%' }}>
                Ôn tập thông minh với phương pháp lặp lại ngắt quãng.
              </p>
              <p style={{ fontWeight: '700', color: safeDueCards > 0 ? '#9333ea' : '#16a34a', fontSize: '0.9rem', marginBottom: '20px' }}>
                {safeDueCards > 0 ? `💡 Có ${safeDueCards} thẻ cần ôn hôm nay` : "🎉 Tuyệt vời! Bạn đã ôn hết thẻ."}
              </p>
            </div>
            <button 
              className="action-btn-primary btn-action-blue"
              onClick={handleStudyClick} 
              style={{ background: '#7c3aed', boxShadow: '0 4px 15px rgba(124, 58, 237, 0.3)', width: 'max-content' }}
            >
              Bắt đầu ôn tập →
            </button>
          </div>
          <div style={{ position: 'absolute', right: '-15px', bottom: '-20px', fontSize: '8rem', color: '#a855f7', opacity: 0.15, zIndex: 1, transform: 'rotate(-10deg)' }}>
            <i className="fa-solid fa-layer-group"></i>
          </div>
        </div>

        {/* Thẻ 2: Làm bài & Thi thử (Màu Đỏ/Hồng) */}
        <div className="action-card action-card-red" style={{ position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'relative', zIndex: 2, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ color: '#991b1b', fontSize: '1.35rem', marginBottom: '8px' }}>Làm bài & Thi thử</h3>
              <p style={{ color: '#b91c1c', fontSize: '0.9rem', marginBottom: '10px', lineHeight: '1.4', maxWidth: '75%' }}>
                Luyện đề, kiểm tra kiến thức và theo dõi tiến độ học tập.
              </p>
              <p style={{ fontWeight: '700', color: safeExams > 0 ? '#dc2626' : '#16a34a', fontSize: '0.9rem', marginBottom: '20px' }}>
                {safeExams > 0 ? `💡 Có ${safeExams} đề thi cần làm` : "🎉 Đã hoàn thành mọi đề thi!"}
              </p>
            </div>
            <button 
              className="action-btn-primary btn-action-red"
              onClick={() => onNavigate("review")}
              style={{ width: 'max-content' }}
            >
              Làm bài ngay →
            </button>
          </div>
          <div style={{ position: 'absolute', right: '-10px', bottom: '-20px', fontSize: '8rem', color: '#ef4444', opacity: 0.15, zIndex: 1, transform: 'rotate(10deg)' }}>
            <i className="fa-solid fa-clipboard-check"></i>
          </div>
        </div>

      </div>

      {/* 🌟 TẦNG 2: THAO TÁC NHANH */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
        <button 
          className="action-btn-primary btn-action-gray"
          onClick={() => onNavigate("create-ai")}
          style={{ 
            display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', 
            padding: '12px', border: '1px dashed #a855f7', background: 'transparent',
            boxShadow: 'none'
          }}
        >
          <i className="fa-solid fa-wand-magic-sparkles"></i> Tạo Flashcard AI
        </button>

        <button 
          className="action-btn-primary btn-action-red"
          onClick={() => onNavigate("create-exam")}
          style={{ 
            display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', 
            padding: '12px', border: 'none', background: '#ef4444', color: 'white',
            boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)'
          }}
        >
          <i className="fa-solid fa-file-signature"></i> Tạo đề thi AI
        </button>
      </div>

    </div>
  );
};

export default DashboardActions;