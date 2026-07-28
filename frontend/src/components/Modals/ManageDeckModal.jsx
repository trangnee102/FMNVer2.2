// frontend/src/components/Modals/ManageDeckModal.jsx
import React, { useState, useEffect } from "react";
import api from "../../services/api"; // 👉 ĐÃ CẬP NHẬT: Import Kẻ vận chuyển ngầm
import "./ManageDeckModal.css";

const ManageDeckModal = ({ isOpen, onClose, selectedDeck, onRefreshDecks }) => {
  const [deckCards, setDeckCards] = useState([]);
  const [newDeckTitle, setNewDeckTitle] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  
  // Quản lý trạng thái 2 cột
  const [activeCardId, setActiveCardId] = useState(null);
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [editForm, setEditForm] = useState({ question: "", answer: "" });
  const [addForm, setAddForm] = useState({ question: "", answer: "" });

  const [isPublic, setIsPublic] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);

  const loadCardsForDeck = async (deckId) => {
    try {
      // 👉 ĐÃ SỬA: Dùng api.get cực ngắn gọn, tự động gắn token
      const res = await api.get(`/flashcards/deck/${deckId}`);
      const data = res.data || res;
      if (data && data.success !== false) {
        setDeckCards(data.data || data || []);
      }
    } catch (error) {
      console.error("Lỗi tải chi tiết bộ thẻ:", error);
    }
  };

  useEffect(() => {
    if (isOpen && selectedDeck) {
      // 👉 ĐÃ FIX: Tự động "tàng hình" chữ (AI Generated) khi hiển thị lên form sửa tên
      const rawTitle = selectedDeck.title || selectedDeck.name || "";
      const cleanTitle = rawTitle.toLowerCase().includes("(ai generated)") 
        ? rawTitle.replace(/\(ai generated\)/gi, "").trim() 
        : rawTitle;

      setNewDeckTitle(cleanTitle);
      setIsEditingTitle(false);
      setIsAddingCard(false);
      setActiveCardId(null);
      setIsPublic(selectedDeck.is_public || false);
      setIsAnonymous(selectedDeck.is_anonymous || false);

      loadCardsForDeck(selectedDeck.id);
    }
  }, [isOpen, selectedDeck]);

  const handleUpdateDeckName = async () => {
    if (!newDeckTitle.trim()) return alert("Tên bộ thẻ không được để trống!");
    try {
      const res = await api.put(`/decks/${selectedDeck.id}`, { 
        title: newDeckTitle, 
        name: newDeckTitle 
      });
      if (res && res.success !== false) {
        setIsEditingTitle(false);
        if (onRefreshDecks) onRefreshDecks(); 
      }
    } catch (error) {
      console.error("Lỗi đổi tên:", error);
    }
  };

  const handleToggleShare = async (field, value) => {
    const updatedPublic = field === "is_public" ? value : isPublic;
    const updatedAnon = field === "is_anonymous" ? value : isAnonymous;

    if (field === "is_public") setIsPublic(value);
    if (field === "is_anonymous") setIsAnonymous(value);

    try {
      const res = await api.put(`/decks/${selectedDeck.id}`, {
        is_public: updatedPublic,
        is_anonymous: updatedAnon,
      });
      if (res && res.success !== false) {
        if (onRefreshDecks) onRefreshDecks();
      }
    } catch (error) {
      console.error("Lỗi cập nhật trạng thái chia sẻ:", error);
    }
  };

  const handleDeleteDeck = async () => {
    const titleToDisplay = newDeckTitle || selectedDeck.title || selectedDeck.name;
    if (!window.confirm(`XÓA VĨNH VIỄN bộ thẻ "${titleToDisplay}"?`)) return;
    try {
      const res = await api.delete(`/decks/${selectedDeck.id}`);
      if (res && res.success !== false) {
        onClose();
        if (onRefreshDecks) onRefreshDecks();
      }
    } catch (error) {
      console.error("Lỗi khi xóa:", error);
    }
  };

  const handleDeleteCard = async (cardId) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa thẻ này?")) return;
    try {
      const res = await api.delete(`/flashcards/${cardId}`);
      if (res && res.success !== false) {
        setDeckCards(deckCards.filter((c) => c.id !== cardId));
        setActiveCardId(null);
        if (onRefreshDecks) onRefreshDecks(); 
      }
    } catch (error) {
      console.error("Lỗi xóa thẻ:", error);
    }
  };

  const handleSaveEditCard = async () => {
    if (!editForm.question.trim() || !editForm.answer.trim())
      return alert("Điền đủ 2 mặt thẻ nhé!");
    try {
      const res = await api.put(`/flashcards/${activeCardId}`, {
        question: editForm.question,
        answer: editForm.answer,
      });
      if (res && res.success !== false) {
        setActiveCardId(null);
        await loadCardsForDeck(selectedDeck.id);
        if (onRefreshDecks) onRefreshDecks(); 
      }
    } catch (error) {
      console.error("Lỗi sửa thẻ:", error);
    }
  };

  const handleSaveNewCard = async () => {
    if (!addForm.question.trim() || !addForm.answer.trim())
      return alert("Điền đủ 2 mặt!");
    try {
      const res = await api.post(`/flashcards/deck/${selectedDeck.id}`, {
        question: addForm.question,
        answer: addForm.answer,
      });
      if (res && res.success !== false) {
        setIsAddingCard(false);
        setAddForm({ question: "", answer: "" });
        await loadCardsForDeck(selectedDeck.id);
        if (onRefreshDecks) onRefreshDecks(); 
      }
    } catch (error) {
      console.error("Lỗi thêm thẻ mới:", error);
    }
  };

  if (!isOpen || !selectedDeck) return null;

  return (
    <div className="manage-modal-overlay" onClick={onClose}>
      {/* 👉 ĐÃ NÂNG CẤP: Dùng class manage-modal-split để kích hoạt giao diện 2 cột */}
      <div className="manage-modal-split" onClick={(e) => e.stopPropagation()}>
        
        {/* ===================================== */}
        {/* HEADER: TÊN BỘ THẺ & NÚT XÓA          */}
        {/* ===================================== */}
        <div className="split-modal-header">
          <div style={{ flex: 1, paddingRight: "15px" }}>
            <p style={{ margin: "0 0 6px 0", fontSize: "0.75rem", fontWeight: "700", color: "var(--text-gray)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Đang quản lý:
            </p>
            {isEditingTitle ? (
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <input
                  style={{ padding: "8px 12px", border: "1px solid var(--primary)", borderRadius: "8px", fontSize: "1.2rem", fontWeight: "700", width: "100%", maxWidth: "350px", outline: "none", color: "var(--text-dark)", background: "var(--bg-main)" }}
                  value={newDeckTitle}
                  onChange={(e) => setNewDeckTitle(e.target.value)}
                  autoFocus
                />
                <button onClick={handleUpdateDeckName} style={{ background: "var(--primary)", color: "white", border: "none", padding: "8px 16px", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}>Lưu</button>
                <button onClick={() => { setIsEditingTitle(false); setNewDeckTitle(selectedDeck.title || selectedDeck.name); }} style={{ background: "var(--bg-main)", border: "1px solid var(--border)", color: "var(--text-dark)", padding: "8px 16px", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}>Hủy</button>
              </div>
            ) : (
              <h2 style={{ margin: 0, fontSize: "1.5rem", color: "var(--text-dark)", display: "flex", alignItems: "center", gap: "10px" }}>
                {newDeckTitle}
                <button
                  onClick={() => setIsEditingTitle(true)}
                  title="Sửa tên bộ thẻ"
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.1rem", padding: "4px", borderRadius: "6px", color: "var(--text-gray)" }}
                >
                  ✏️
                </button>
              </h2>
            )}
          </div>
          <button 
            onClick={handleDeleteDeck}
            style={{ background: "#fee2e2", color: "#dc2626", border: "none", padding: "10px 16px", borderRadius: "10px", fontWeight: "bold", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", transition: "all 0.2s" }}
          >
            <i className="fa-regular fa-trash-can"></i> Xóa bộ thẻ
          </button>
        </div>

        {/* ===================================== */}
        {/* SETTING CHIA SẺ (NẰM NGANG DƯỚI HEADER) */}
        {/* ===================================== */}
        <div style={{ display: "flex", alignItems: "center", gap: "30px", padding: "12px 30px", borderBottom: "1px solid var(--border)", background: "var(--bg-main)" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", color: "var(--text-dark)", fontWeight: "600", fontSize: "0.95rem" }}>
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => handleToggleShare("is_public", e.target.checked)}
              style={{ width: "16px", height: "16px", accentColor: "var(--primary)" }}
            />
            <i className="fa-solid fa-earth-americas" style={{ color: "var(--primary)" }}></i> Chia sẻ lên Cộng đồng
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: !isPublic ? "not-allowed" : "pointer", color: !isPublic ? "var(--text-gray)" : "var(--text-dark)", fontWeight: "600", fontSize: "0.95rem", opacity: !isPublic ? 0.5 : 1 }}>
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => handleToggleShare("is_anonymous", e.target.checked)}
              disabled={!isPublic}
              style={{ width: "16px", height: "16px", accentColor: "var(--primary)" }}
            />
            <i className="fa-solid fa-user-ninja" style={{ color: "var(--text-gray)" }}></i> Ẩn danh
          </label>
        </div>

        {/* ===================================== */}
        {/* BODY CHIA 2 CỘT                       */}
        {/* ===================================== */}
        <div className="split-modal-body">
          
          {/* CỘT TRÁI: DANH SÁCH THẺ */}
          <div className="split-left-col">
            <div className="split-left-header">
              <h4 style={{ margin: 0, color: "var(--text-dark)", fontSize: "1.05rem", fontWeight: "700" }}>Danh sách thẻ ({deckCards.length})</h4>
            </div>
            
            <div className="split-list-scroll">
              {deckCards.map((card, index) => {
                const isActive = activeCardId === card.id;
                return (
                  <div 
                    key={card.id} 
                    style={{
                      padding: "14px", background: isActive ? "var(--bg-card)" : "var(--bg-main)",
                      border: `1px solid ${isActive ? "var(--primary)" : "var(--border)"}`,
                      borderRadius: "12px", cursor: "pointer", display: "flex", gap: "12px",
                      boxShadow: isActive ? "0 4px 12px rgba(59,130,246,0.1)" : "none",
                      transition: "all 0.2s ease"
                    }}
                    onClick={() => {
                      setActiveCardId(card.id);
                      setIsAddingCard(false);
                      setEditForm({
                        question: card.question || card.front_content,
                        answer: card.answer || card.back_content
                      });
                    }}
                  >
                    <div style={{ background: isActive ? "var(--primary)" : "rgba(59,130,246,0.1)", color: isActive ? "white" : "var(--primary)", fontWeight: "800", width: "30px", height: "30px", display: "flex", justifyContent: "center", alignItems: "center", borderRadius: "8px", fontSize: "0.9rem", flexShrink: 0, transition: "all 0.2s" }}>
                      {index + 1}
                    </div>
                    <div style={{ flex: 1, overflow: "hidden" }}>
                      <div style={{ fontWeight: "700", color: "var(--text-dark)", fontSize: "0.95rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: "4px" }}>
                        {card.question || card.front_content}
                      </div>
                      <div style={{ color: "var(--text-gray)", fontSize: "0.85rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {card.answer || card.back_content}
                      </div>
                    </div>
                    {isActive && <div style={{ color: "var(--primary)", display: "flex", alignItems: "center" }}><i className="fa-solid fa-chevron-right"></i></div>}
                  </div>
                );
              })}
            </div>

            <div style={{ padding: "20px 25px", borderTop: "1px solid var(--border)", background: "var(--bg-card)" }}>
              <button 
                style={{ width: "100%", padding: "12px", background: isAddingCard ? "var(--bg-main)" : "white", border: `1px dashed ${isAddingCard ? "var(--primary)" : "var(--border)"}`, borderRadius: "10px", color: isAddingCard ? "var(--primary)" : "var(--text-dark)", fontWeight: "700", cursor: "pointer", transition: "all 0.2s" }}
                onClick={() => {
                  setIsAddingCard(true);
                  setActiveCardId(null);
                  setAddForm({ question: "", answer: "" });
                }}
              >
                + Thêm thẻ mới
              </button>
            </div>
          </div>

          {/* CỘT PHẢI: KHU VỰC CHỈNH SỬA / THÊM MỚI */}
          <div className="split-right-col" style={{ position: "relative" }}>
            
            {isAddingCard ? (
              <div style={{ animation: "fadeIn 0.3s ease", display: "flex", flexDirection: "column", height: "100%" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                  <h4 style={{ margin: 0, color: "var(--primary)", fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "8px" }}>
                    <i className="fa-solid fa-plus-circle"></i> Thêm thẻ mới
                  </h4>
                  <button onClick={() => setIsAddingCard(false)} style={{ background: "none", border: "none", color: "var(--text-gray)", cursor: "pointer", fontSize: "1.2rem" }}><i className="fa-solid fa-xmark"></i></button>
                </div>
                
                <div style={{ marginBottom: "15px", flex: 1, display: "flex", flexDirection: "column" }}>
                  <label style={{ display: "block", fontWeight: "700", color: "var(--text-dark)", marginBottom: "8px" }}>Mặt trước (Câu hỏi)</label>
                  <textarea
                    style={{ flex: 1, minHeight: "120px", width: "100%", padding: "15px", borderRadius: "12px", border: "1px solid var(--border)", background: "var(--bg-main)", color: "var(--text-dark)", fontFamily: "inherit", resize: "none", fontSize: "0.95rem", outline: "none", boxSizing: "border-box" }}
                    value={addForm.question}
                    onChange={(e) => setAddForm({ ...addForm, question: e.target.value })}
                    placeholder="Nhập câu hỏi vào đây..."
                    autoFocus
                  />
                </div>
                
                <div style={{ marginBottom: "20px", flex: 1, display: "flex", flexDirection: "column" }}>
                  <label style={{ display: "block", fontWeight: "700", color: "var(--text-dark)", marginBottom: "8px" }}>Mặt sau (Đáp án)</label>
                  <textarea
                    style={{ flex: 1, minHeight: "120px", width: "100%", padding: "15px", borderRadius: "12px", border: "1px solid var(--border)", background: "var(--bg-main)", color: "var(--text-dark)", fontFamily: "inherit", resize: "none", fontSize: "0.95rem", outline: "none", boxSizing: "border-box" }}
                    value={addForm.answer}
                    onChange={(e) => setAddForm({ ...addForm, answer: e.target.value })}
                    placeholder="Nhập đáp án vào đây..."
                  />
                </div>
                <button onClick={handleSaveNewCard} style={{ width: "100%", padding: "14px", background: "var(--primary)", color: "white", border: "none", borderRadius: "12px", fontWeight: "bold", fontSize: "1rem", cursor: "pointer", boxShadow: "0 4px 10px rgba(59, 130, 246, 0.3)" }}>
                  Lưu thẻ mới
                </button>
              </div>
            ) : activeCardId ? (
              <div style={{ animation: "fadeIn 0.3s ease", display: "flex", flexDirection: "column", height: "100%" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                  <h4 style={{ margin: 0, color: "var(--text-dark)", fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "8px" }}>
                    <i className="fa-solid fa-pen-to-square" style={{ color: "var(--text-gray)" }}></i> Chỉnh sửa thẻ
                  </h4>
                  <button onClick={() => setActiveCardId(null)} style={{ background: "none", border: "none", color: "var(--text-gray)", cursor: "pointer", fontSize: "1.2rem" }}><i className="fa-solid fa-xmark"></i></button>
                </div>
                
                <div style={{ marginBottom: "15px", flex: 1, display: "flex", flexDirection: "column" }}>
                  <label style={{ display: "block", fontWeight: "700", color: "var(--text-dark)", marginBottom: "8px" }}>Mặt trước (Câu hỏi)</label>
                  <textarea
                    style={{ flex: 1, minHeight: "120px", width: "100%", padding: "15px", borderRadius: "12px", border: "1px solid var(--border)", background: "var(--bg-main)", color: "var(--text-dark)", fontFamily: "inherit", resize: "none", fontSize: "0.95rem", outline: "none", boxSizing: "border-box" }}
                    value={editForm.question}
                    onChange={(e) => setEditForm({ ...editForm, question: e.target.value })}
                  />
                </div>
                
                <div style={{ marginBottom: "20px", flex: 1, display: "flex", flexDirection: "column" }}>
                  <label style={{ display: "block", fontWeight: "700", color: "var(--text-dark)", marginBottom: "8px" }}>Mặt sau (Đáp án)</label>
                  <textarea
                    style={{ flex: 1, minHeight: "120px", width: "100%", padding: "15px", borderRadius: "12px", border: "1px solid var(--border)", background: "var(--bg-main)", color: "var(--text-dark)", fontFamily: "inherit", resize: "none", fontSize: "0.95rem", outline: "none", boxSizing: "border-box" }}
                    value={editForm.answer}
                    onChange={(e) => setEditForm({ ...editForm, answer: e.target.value })}
                  />
                </div>

                <div style={{ display: "flex", gap: "10px" }}>
                  <button onClick={handleSaveEditCard} style={{ flex: 1, padding: "14px", background: "var(--primary)", color: "white", border: "none", borderRadius: "12px", fontWeight: "bold", fontSize: "1rem", cursor: "pointer", boxShadow: "0 4px 10px rgba(59, 130, 246, 0.3)" }}>Lưu thay đổi</button>
                  <button onClick={() => handleDeleteCard(activeCardId)} style={{ padding: "14px 20px", background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: "12px", fontWeight: "bold", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
                    <i className="fa-regular fa-trash-can"></i> Xóa
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--text-gray)", textAlign: "center" }}>
                <i className="fa-solid fa-layer-group" style={{ fontSize: "4rem", opacity: 0.2, marginBottom: "20px" }}></i>
                <p style={{ margin: 0, lineHeight: "1.6", fontSize: "1.05rem" }}>Chọn một thẻ bên trái để chỉnh sửa<br/>hoặc bấm <strong style={{color: "var(--primary)"}}>"+ Thêm thẻ mới"</strong></p>
              </div>
            )}

          </div>
        </div>

        {/* NÚT ĐÓNG MODAL (DƯỚI CÙNG BÊN PHẢI) */}
        <div style={{ padding: "15px 30px", borderTop: "1px solid var(--border)", background: "var(--bg-card)", display: "flex", justifyContent: "flex-end" }}>
          <button 
            onClick={onClose}
            style={{ padding: "12px 25px", background: "var(--bg-main)", border: "1px solid var(--border)", color: "var(--text-dark)", borderRadius: "10px", fontWeight: "bold", cursor: "pointer", transition: "all 0.2s" }}
          >
            Xong & Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManageDeckModal;