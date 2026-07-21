import React, { useState, useEffect } from "react";

const CramModeModal = ({ isOpen, onClose, decks = [], onNavigate }) => {
  const [selectedDeckId, setSelectedDeckId] = useState("");
  const [tempExamDate, setTempExamDate] = useState("");
  const [bossModePercent, setBossModePercent] = useState(30);

  // Khi modal mở, reset lại lựa chọn hoặc tự động chọn bộ đầu tiên
  useEffect(() => {
    if (isOpen) {
      if (decks && decks.length > 0) {
        setSelectedDeckId(decks[0].id.toString());
      } else {
        setSelectedDeckId("");
      }
    }
  }, [isOpen, decks]);

  // Mỗi khi bộ thẻ được chọn thay đổi, load lại cài đặt của bộ đó
  useEffect(() => {
    if (isOpen && selectedDeckId) {
      const selectedDeck = decks.find(d => d.id.toString() === selectedDeckId);
      const savedSettings = JSON.parse(localStorage.getItem(`cram_settings_${selectedDeckId}`)) || {};
      
      setBossModePercent(savedSettings.bossModePercent || 30);
      setTempExamDate(savedSettings.examDate || (selectedDeck ? selectedDeck.exam_date : ""));
    }
  }, [isOpen, selectedDeckId, decks]);

  const calculateDaysLeft = (examDateStr) => {
    if (!examDateStr) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exam = new Date(examDateStr);
    exam.setHours(0, 0, 0, 0);
    const diff = Math.ceil((exam - today) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  const handleStartCramMode = () => {
    if (!selectedDeckId) {
      alert("⚠️ Bạn chưa chọn bộ thẻ nào!");
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
    localStorage.setItem(`cram_settings_${selectedDeckId}`, JSON.stringify(cramSettings));
    onClose();
    onNavigate("cram-review", parseInt(selectedDeckId));
  };

  const handleDisableCramMode = () => {
    if (!selectedDeckId) return;
    
    if (window.confirm("Bạn có chắc chắn muốn tắt chế độ Ôn thi cấp tốc và xóa ngày thi của bộ thẻ này?")) {
      localStorage.removeItem(`cram_settings_${selectedDeckId}`);
      setTempExamDate("");
      alert("✅ Đã tắt Cram Mode thành công!");
      onClose();
      window.location.reload(); 
    }
  };

  if (!isOpen) return null;

  const currentDeckHasExamDate = !!tempExamDate && localStorage.getItem(`cram_settings_${selectedDeckId}`);

  return (
    <div className="cram-modal-overlay" onClick={onClose} style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
      backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', 
      justifyContent: 'center', alignItems: 'center', zIndex: 1000
    }}>
      <div className="cram-modal" onClick={(e) => e.stopPropagation()} style={{
        background: 'white', padding: '25px', borderRadius: '12px', width: '90%', maxWidth: '450px'
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "15px" }}>
          <div>
            <h2 style={{ margin: "0 0 5px 0", color: "#b45309" }}>⚡ Bật Lò Luyện Cấp Tốc</h2>
            <p style={{ margin: 0, color: "#64748b", fontSize: "0.9rem" }}>Rút ngắn chu kỳ học sát ngày thi</p>
          </div>
          {currentDeckHasExamDate && (
             <button
               onClick={handleDisableCramMode}
               style={{
                 padding: "6px 12px", background: "#fee2e2", color: "#dc2626",
                 border: "1px solid #fecaca", borderRadius: "6px",
                 fontWeight: "bold", cursor: "pointer", fontSize: "0.85rem"
               }}
             >
               Tắt Cram Mode
             </button>
          )}
        </div>

        {/* SECTION CHỌN BỘ THẺ */}
        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", fontWeight: "bold", color: "#374151", marginBottom: "8px" }}>
            Chọn bộ thẻ <span style={{ color: "red" }}>*</span>
          </label>
          <select 
            value={selectedDeckId} 
            onChange={(e) => setSelectedDeckId(e.target.value)}
            style={{
              width: "100%", padding: "10px", borderRadius: "6px",
              border: "1px solid #d1d5db", fontFamily: "inherit", fontSize: "1rem"
            }}
          >
            {decks.length === 0 ? (
              <option value="">Không có bộ thẻ nào</option>
            ) : (
              decks.map(deck => (
                <option key={deck.id} value={deck.id}>
                  {deck.title || deck.name} ({deck.total_cards || 0} thẻ)
                </option>
              ))
            )}
          </select>
        </div>

        {/* SECTION CHỌN NGÀY THI */}
        <div style={{ background: "#f3f4f6", padding: "15px", borderRadius: "8px", marginBottom: "15px" }}>
          <label style={{ display: "block", fontWeight: "bold", color: "#374151", marginBottom: "8px" }}>
            Ngày thi của bạn là bao giờ? <span style={{ color: "red" }}>*</span>
          </label>
          <input
            type="date"
            value={tempExamDate}
            min={new Date().toISOString().split("T")[0]}
            onChange={(e) => setTempExamDate(e.target.value)}
            style={{
              width: "100%", padding: "10px", borderRadius: "6px",
              border: "1px solid #d1d5db", fontFamily: "inherit"
            }}
            required
          />
          {tempExamDate && (
            <p style={{ marginTop: "10px", color: "#b91c1c", fontWeight: "bold", fontSize: "0.9rem", margin: "10px 0 0 0" }}>
              🚨 Chỉ còn {calculateDaysLeft(tempExamDate)} ngày nữa là đến kỳ thi!
            </p>
          )}
        </div>

        {/* SECTION SLIDER TỶ LỆ */}
        <div className="cram-slider-container">
          <label style={{ display: "block", fontWeight: "bold", color: "#92400e", marginBottom: "10px" }}>
            Tỷ lệ thẻ khó ngày cuối: <span style={{ fontSize: "1.2rem", color: "#d97706" }}>{bossModePercent}%</span>
          </label>
          <input
            type="range"
            min="10"
            max="100"
            step="5"
            value={bossModePercent}
            onChange={(e) => setBossModePercent(e.target.value)}
            style={{ width: "100%", cursor: "pointer", accentColor: "#f59e0b" }}
          />
        </div>

        {/* NÚT HÀNH ĐỘNG */}
        <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: "12px", background: "#e2e8f0", border: "none",
              borderRadius: "8px", fontWeight: "bold", cursor: "pointer"
            }}
          >
            Hủy bỏ
          </button>
          <button
            onClick={handleStartCramMode}
            disabled={decks.length === 0}
            style={{
              flex: 1, padding: "12px", background: decks.length === 0 ? "#d1d5db" : "#f59e0b", 
              color: "white", border: "none", borderRadius: "8px", 
              fontWeight: "bold", cursor: decks.length === 0 ? "not-allowed" : "pointer"
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