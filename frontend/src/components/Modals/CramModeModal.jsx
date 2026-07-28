// frontend/src/components/Modals/CramModeModal.jsx
import React, { useState, useEffect } from "react";

const CramModeModal = ({ isOpen, onClose, decks = [], selectedDeck, onNavigate }) => {
  const [tempExamDate, setTempExamDate] = useState("");
  const [bossModePercent, setBossModePercent] = useState(30);

  // 👉 ĐÃ SỬA: Tự động bắt diện bộ thẻ được chọn, không cần người dùng chọn tay nữa
  const targetDeck = selectedDeck || (decks && decks.length > 0 ? decks[0] : null);

  // Mỗi khi bộ thẻ được chọn thay đổi, load lại cài đặt của bộ đó
  useEffect(() => {
    if (isOpen && targetDeck) {
      const savedSettings = JSON.parse(localStorage.getItem(`cram_settings_${targetDeck.id}`)) || {};
      setBossModePercent(savedSettings.bossModePercent || 30);
      setTempExamDate(savedSettings.examDate || targetDeck.exam_date || "");
    }
  }, [isOpen, targetDeck]);

  // 👉 ĐÃ SỬA: Hàm tính toán ngày thi chuẩn xác (hỗ trợ số âm để báo quá hạn)
  const calculateDaysLeft = (examDateStr) => {
    if (!examDateStr) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exam = new Date(examDateStr);
    exam.setHours(0, 0, 0, 0);
    return Math.round((exam - today) / (1000 * 60 * 60 * 24));
  };

  const handleStartCramMode = () => {
    if (!targetDeck) {
      alert("⚠️ Lỗi: Không tìm thấy bộ thẻ!");
      return;
    }
    if (!tempExamDate) {
      alert("⚠️ Bạn phải chọn Ngày thi thì hệ thống mới tính chu kỳ Cram Mode được!");
      return;
    }
    const cramSettings = {
      examDate: tempExamDate,
      bossModePercent: bossModePercent,
    };
    localStorage.setItem(`cram_settings_${targetDeck.id}`, JSON.stringify(cramSettings));
    onClose();
    // Bắt đầu cháy: Chuyển hướng sang trang ôn luyện
    onNavigate("cram-review", targetDeck.id);
  };

  const handleDisableCramMode = () => {
    if (!targetDeck) return;
    
    if (window.confirm("Bạn có chắc chắn muốn tắt chế độ Ôn thi cấp tốc và xóa ngày thi của bộ thẻ này?")) {
      localStorage.removeItem(`cram_settings_${targetDeck.id}`);
      setTempExamDate("");
      alert("✅ Đã tắt Cram Mode thành công!");
      onClose();
      window.location.reload(); 
    }
  };

  if (!isOpen) return null;

  const currentDeckHasExamDate = !!tempExamDate && targetDeck && localStorage.getItem(`cram_settings_${targetDeck.id}`);
  const daysLeft = calculateDaysLeft(tempExamDate);

  // Tàng hình chữ (AI Generated) cho đẹp
  const displayTitle = targetDeck?.title || targetDeck?.name || "Bộ thẻ";
  const cleanTitle = displayTitle.toLowerCase().includes("(ai generated)") 
    ? displayTitle.replace(/\(ai generated\)/gi, "").trim() 
    : displayTitle;

  return (
    <div className="cram-modal-overlay" onClick={onClose} style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
      backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', 
      justifyContent: 'center', alignItems: 'center', zIndex: 1000, animation: 'fadeIn 0.2s ease-out'
    }}>
      <div className="cram-modal" onClick={(e) => e.stopPropagation()} style={{
        background: 'var(--bg-card, white)', padding: '30px', borderRadius: '16px', width: '100%', maxWidth: '480px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.1)', border: '1px solid var(--border, #e2e8f0)'
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "25px" }}>
          <div>
            <h2 style={{ margin: "0 0 8px 0", color: "#d97706", display: "flex", alignItems: "center", gap: "8px", fontSize: "1.6rem" }}>
              ⚡ Bật Lò Luyện Cấp Tốc
            </h2>
            <p style={{ margin: 0, color: "var(--text-gray, #64748b)", fontSize: "0.95rem" }}>
              Đang thiết lập cho: <strong style={{color: "var(--text-dark, #1e293b)"}}>{cleanTitle}</strong>
            </p>
          </div>
          {currentDeckHasExamDate && (
             <button
               onClick={handleDisableCramMode}
               style={{
                 padding: "8px 14px", background: "#fee2e2", color: "#dc2626",
                 border: "1px solid #fecaca", borderRadius: "8px",
                 fontWeight: "bold", cursor: "pointer", fontSize: "0.85rem",
                 transition: "all 0.2s"
               }}
               onMouseOver={(e) => e.currentTarget.style.background = "#fca5a5"}
               onMouseOut={(e) => e.currentTarget.style.background = "#fee2e2"}
             >
               Tắt Cram Mode
             </button>
          )}
        </div>

        {/* SECTION CHỌN NGÀY THI */}
        <div style={{ background: "var(--bg-main, #f8fafc)", padding: "20px", borderRadius: "12px", marginBottom: "20px", border: "1px solid var(--border, #e2e8f0)" }}>
          <label style={{ display: "block", fontWeight: "700", color: "var(--text-dark, #334155)", marginBottom: "10px", fontSize: "0.95rem" }}>
            Ngày thi của bạn là bao giờ? <span style={{ color: "#ef4444" }}>*</span>
          </label>
          <input
            type="date"
            value={tempExamDate}
            min={new Date().toISOString().split("T")[0]} // Không cho lùi ngày
            onChange={(e) => setTempExamDate(e.target.value)}
            style={{
              width: "100%", padding: "12px 15px", borderRadius: "8px",
              border: "1px solid var(--border, #cbd5e1)", fontFamily: "inherit",
              background: "var(--bg-card, white)", color: "var(--text-dark, #1e293b)",
              outline: "none", fontSize: "1rem", boxSizing: "border-box"
            }}
            required
          />
          
          {/* 👉 ĐÃ SỬA: Hiển thị thông báo cực kỳ chuẩn xác dựa vào số ngày còn lại */}
          {tempExamDate && daysLeft !== null && (
            <p style={{ marginTop: "12px", fontWeight: "700", fontSize: "0.95rem", margin: "12px 0 0 0", color: daysLeft <= 0 ? "#dc2626" : "#ea580c" }}>
              {daysLeft > 0 && `🚨 Chỉ còn ${daysLeft} ngày nữa là đến kỳ thi!`}
              {daysLeft === 0 && `🔥 Hôm nay là ngày thi! Bộ thẻ đã đến hạn ôn tập.`}
              {daysLeft < 0 && `❌ Ngày thi đã qua! Bộ thẻ đã quá hạn ${Math.abs(daysLeft)} ngày.`}
            </p>
          )}
        </div>

        {/* SECTION SLIDER TỶ LỆ */}
        <div className="cram-slider-container" style={{ padding: "10px 5px", marginBottom: "10px" }}>
          <label style={{ display: "block", fontWeight: "700", color: "var(--text-dark, #334155)", marginBottom: "15px", fontSize: "0.95rem" }}>
            Tỷ lệ thẻ khó ngày cuối: <span style={{ fontSize: "1.3rem", color: "#f59e0b", marginLeft: "5px" }}>{bossModePercent}%</span>
          </label>
          <input
            type="range"
            min="10"
            max="100"
            step="5"
            value={bossModePercent}
            onChange={(e) => setBossModePercent(e.target.value)}
            style={{ width: "100%", cursor: "pointer", accentColor: "#f59e0b", height: "6px" }}
          />
        </div>

        {/* NÚT HÀNH ĐỘNG */}
        <div style={{ display: "flex", gap: "15px", marginTop: "25px" }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: "14px", background: "var(--bg-main, #e2e8f0)", color: "var(--text-dark, #1e293b)", 
              border: "1px solid var(--border, #cbd5e1)", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontSize: "1rem"
            }}
          >
            Hủy bỏ
          </button>
          <button
            onClick={handleStartCramMode}
            disabled={!targetDeck}
            style={{
              flex: 1, padding: "14px", background: !targetDeck ? "#94a3b8" : "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)", 
              color: "white", border: "none", borderRadius: "10px", 
              fontWeight: "700", cursor: !targetDeck ? "not-allowed" : "pointer", fontSize: "1rem",
              boxShadow: !targetDeck ? "none" : "0 4px 15px rgba(245, 158, 11, 0.3)"
            }}
          >
            🔥 Bắt đầu cháy!
          </button>
        </div>
      </div>
    </div>
  );
};
 
export default CramModeModal;