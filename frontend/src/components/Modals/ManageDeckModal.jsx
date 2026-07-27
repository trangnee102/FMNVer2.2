// frontend/src/components/Modals/ManageDeckModal.jsx
import React, { useState, useEffect } from "react";
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
      const token = localStorage.getItem("token") || "";
      const t = new Date().getTime(); // Ép phá cache để lấy thẻ mới nhất
      const res = await fetch(
        `http://localhost:5000/api/flashcards/deck/${deckId}?t=${t}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (res.ok && data.success) setDeckCards(data.data || []);
    } catch (error) {
      console.error("Lỗi tải chi tiết bộ thẻ:", error);
    }
  };

  useEffect(() => {
    if (isOpen && selectedDeck) {
      setNewDeckTitle(selectedDeck.title || selectedDeck.name);
      setIsEditingTitle(false);
      setIsAddingCard(false);
      setActiveCardId(null);
      setIsPublic(selectedDeck.is_public || false);
      setIsAnonymous(selectedDeck.is_anonymous || false);

      loadCardsForDeck(selectedDeck.id);
    }
  }, [isOpen, selectedDeck]);

  // Cập nhật lại Tên bộ thẻ
  const handleUpdateDeckName = async () => {
    if (!newDeckTitle.trim()) return alert("Tên bộ thẻ không được để trống!");
    try {
      const token = localStorage.getItem("token") || "";
      const res = await fetch(
        `http://localhost:5000/api/decks/${selectedDeck.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ title: newDeckTitle, name: newDeckTitle }),
        }
      );
      if (res.ok) {
        setIsEditingTitle(false);
        if (onRefreshDecks) onRefreshDecks(); // Ép trang ngoài gọi lại API ngay
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
      const token = localStorage.getItem("token") || "";
      const res = await fetch(
        `http://localhost:5000/api/decks/${selectedDeck.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            is_public: updatedPublic,
            is_anonymous: updatedAnon,
          }),
        }
      );
      if (res.ok) {
        if (onRefreshDecks) onRefreshDecks();
      }
    } catch (error) {
      console.error("Lỗi cập nhật trạng thái chia sẻ:", error);
    }
  };

  const handleDeleteDeck = async () => {
    if (!window.confirm(`XÓA VĨNH VIỄN bộ thẻ "${selectedDeck.title || selectedDeck.name}"?`)) return;
    try {
      const token = localStorage.getItem("token") || "";
      const res = await fetch(
        `http://localhost:5000/api/decks/${selectedDeck.id}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        onClose();
        if (onRefreshDecks) onRefreshDecks();
      }
    } catch (error) {
      console.error("Lỗi khi xóa:", error);
    }
  };

  const handleDeleteCard = async (cardId) => {
    if (!window.confirm("Xóa thẻ này?")) return;
    try {
      const token = localStorage.getItem("token") || "";
      const res = await fetch(
        `http://localhost:5000/api/flashcards/${cardId}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        setDeckCards(deckCards.filter((c) => c.id !== cardId));
        setActiveCardId(null);
        if (onRefreshDecks) onRefreshDecks(); // Ép cập nhật lại số liệu Thống kê bên ngoài
      }
    } catch (error) {
      console.error("Lỗi xóa thẻ:", error);
    }
  };

  const handleSaveEditCard = async () => {
    if (!editForm.question.trim() || !editForm.answer.trim())
      return alert("Điền đủ 2 mặt thẻ nhé!");
    try {
      const token = localStorage.getItem("token") || "";
      const res = await fetch(
        `http://localhost:5000/api/flashcards/${activeCardId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            question: editForm.question,
            answer: editForm.answer,
            // Không gửi next_review lên nữa để Backend tự lo
          }),
        }
      );
      if (res.ok) {
        setActiveCardId(null);
        await loadCardsForDeck(selectedDeck.id);
        if (onRefreshDecks) onRefreshDecks(); // Ép cập nhật thẻ Cần ôn/Quá hạn
      }
    } catch (error) {
      console.error("Lỗi sửa thẻ:", error);
    }
  };

  const handleSaveNewCard = async () => {
    if (!addForm.question.trim() || !addForm.answer.trim())
      return alert("Điền đủ 2 mặt!");
    try {
      const token = localStorage.getItem("token") || "";
      const res = await fetch(
        `http://localhost:5000/api/flashcards/deck/${selectedDeck.id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            question: addForm.question,
            answer: addForm.answer,
          }),
        }
      );
      if (res.ok) {
        setIsAddingCard(false);
        setAddForm({ question: "", answer: "" });
        await loadCardsForDeck(selectedDeck.id);
        if (onRefreshDecks) onRefreshDecks(); // Cập nhật lại Tống số thẻ
      }
    } catch (error) {
      console.error("Lỗi thêm thẻ mới:", error);
    }
  };

  if (!isOpen || !selectedDeck) return null;

  return (
    <div className="cram-modal-overlay" onClick={onClose}>
      <div className="manage-modal" onClick={(e) => e.stopPropagation()}>
        
        {/* ===================================== */}
        {/* HEADER: TÊN BỘ THẺ & NÚT XÓA          */}
        {/* ===================================== */}
        <div className="manage-modal-header">
          <div style={{ flex: 1, paddingRight: "15px" }}>
            <p className="manage-modal-subtitle">ĐANG QUẢN LÝ:</p>
            {isEditingTitle ? (
              <div className="edit-title-group">
                <input
                  className="edit-title-input"
                  value={newDeckTitle}
                  onChange={(e) => setNewDeckTitle(e.target.value)}
                  autoFocus
                />
                <button className="btn-save-title" onClick={handleUpdateDeckName}>Lưu</button>
                <button
                  className="btn-cancel-title"
                  onClick={() => {
                    setIsEditingTitle(false);
                    setNewDeckTitle(selectedDeck.title || selectedDeck.name);
                  }}
                >
                  Hủy
                </button>
              </div>
            ) : (
              <h2 className="manage-deck-title">
                {newDeckTitle || selectedDeck.name}
                <button
                  className="btn-edit-title"
                  onClick={() => setIsEditingTitle(true)}
                  title="Sửa tên bộ thẻ"
                >
                  ✏️
                </button>
              </h2>
            )}
          </div>
          <button className="btn-delete-deck" onClick={handleDeleteDeck}>
            <i className="fa-regular fa-trash-can"></i> Xóa bộ thẻ
          </button>
        </div>

        {/* ===================================== */}
        {/* SETTING CHIA SẺ                       */}
        {/* ===================================== */}
        <div className="share-settings-container">
          <div className="share-row">
            <label className="share-label">
              <input
                type="checkbox"
                className="share-checkbox"
                checked={isPublic}
                onChange={(e) => handleToggleShare("is_public", e.target.checked)}
              />
              <span className="share-text-primary"><i className="fa-solid fa-earth-americas"></i> Chia sẻ lên Cộng đồng</span>
            </label>
            <label className={`share-label ${!isPublic ? "disabled" : ""}`}>
              <input
                type="checkbox"
                className="share-checkbox"
                checked={isAnonymous}
                onChange={(e) => handleToggleShare("is_anonymous", e.target.checked)}
                disabled={!isPublic}
              />
              <span className="share-text-secondary"><i className="fa-solid fa-user-ninja"></i> Ẩn danh</span>
            </label>
          </div>
        </div>

        {/* ===================================== */}
        {/* THÂN MODAL: LAYOUT SPLIT TRÁI / PHẢI  */}
        {/* ===================================== */}
        <div className="manage-modal-split-body">
          
          {/* CỘT TRÁI: DANH SÁCH THẺ */}
          <div className="manage-left-panel">
            <div className="panel-header">
              <h4>Danh sách thẻ ({deckCards.length})</h4>
            </div>
            
            <div className="compact-card-list">
              {deckCards.map((card, index) => {
                const isActive = activeCardId === card.id;
                return (
                  <div 
                    key={card.id} 
                    className={`compact-card-item ${isActive ? "active" : ""}`}
                    onClick={() => {
                      setActiveCardId(card.id);
                      setIsAddingCard(false);
                      setEditForm({
                        question: card.question || card.front_content,
                        answer: card.answer || card.back_content
                      });
                    }}
                  >
                    <span className="compact-card-index">{index + 1}</span>
                    <div className="compact-card-preview">
                      <div className="preview-q">{card.question || card.front_content}</div>
                      <div className="preview-a">{card.answer || card.back_content}</div>
                    </div>
                    {isActive && <i className="fa-solid fa-chevron-right active-indicator"></i>}
                  </div>
                );
              })}
            </div>

            <button 
              className={`btn-trigger-add ${isAddingCard ? "active" : ""}`}
              onClick={() => {
                setIsAddingCard(true);
                setActiveCardId(null);
                setAddForm({ question: "", answer: "" });
              }}
            >
              + Thêm thẻ mới
            </button>
          </div>

          {/* CỘT PHẢI: KHU VỰC CHỈNH SỬA / THÊM MỚI */}
          <div className="manage-right-panel">
            
            {isAddingCard ? (
              <div className="right-panel-form fade-in">
                <div className="form-header">
                  <h4>✨ Thêm thẻ mới</h4>
                  <button className="btn-close-form" onClick={() => setIsAddingCard(false)}><i className="fa-solid fa-xmark"></i></button>
                </div>
                <div className="form-group">
                  <label>Mặt trước (Câu hỏi)</label>
                  <textarea
                    className="right-panel-textarea"
                    value={addForm.question}
                    onChange={(e) => setAddForm({ ...addForm, question: e.target.value })}
                    placeholder="Nhập câu hỏi vào đây..."
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label>Mặt sau (Đáp án)</label>
                  <textarea
                    className="right-panel-textarea"
                    value={addForm.answer}
                    onChange={(e) => setAddForm({ ...addForm, answer: e.target.value })}
                    placeholder="Nhập đáp án vào đây..."
                  />
                </div>
                <button className="btn-save-full" onClick={handleSaveNewCard}>Thêm ngay</button>
              </div>
            ) : activeCardId ? (
              <div className="right-panel-form fade-in">
                <div className="form-header">
                  <h4>✏️ Chỉnh sửa thẻ</h4>
                  <button className="btn-close-form" onClick={() => setActiveCardId(null)}><i className="fa-solid fa-xmark"></i></button>
                </div>
                
                <div className="form-group">
                  <label>Mặt trước</label>
                  <textarea
                    className="right-panel-textarea"
                    value={editForm.question}
                    onChange={(e) => setEditForm({ ...editForm, question: e.target.value })}
                  />
                </div>
                
                <div className="form-group">
                  <label>Mặt sau</label>
                  <textarea
                    className="right-panel-textarea"
                    value={editForm.answer}
                    onChange={(e) => setEditForm({ ...editForm, answer: e.target.value })}
                  />
                </div>

                <div className="right-panel-actions">
                  <button className="btn-save-full" onClick={handleSaveEditCard}>Lưu thay đổi</button>
                  <button className="btn-delete-full" onClick={() => handleDeleteCard(activeCardId)}>
                    <i className="fa-regular fa-trash-can"></i> Xóa
                  </button>
                </div>
              </div>
            ) : (
              <div className="right-panel-empty">
                <i className="fa-solid fa-layer-group empty-icon"></i>
                <p>Chọn một thẻ bên trái để chỉnh sửa<br/>hoặc bấm "+ Thêm thẻ mới"</p>
              </div>
            )}

          </div>
        </div>

        {/* NÚT ĐÓNG MODAL */}
        <div className="manage-modal-footer">
          <button className="btn-close-modal" onClick={onClose}>
            Xong & Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManageDeckModal;