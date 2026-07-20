import React, { useState, useEffect } from "react";
import "./ManageDeckModal.css"; // 👉 ĐÃ THÊM: Nhúng file CSS mới

const ManageDeckModal = ({ isOpen, onClose, selectedDeck, onRefreshDecks }) => {
  const [deckCards, setDeckCards] = useState([]);
  const [newDeckTitle, setNewDeckTitle] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingCardId, setEditingCardId] = useState(null);
  const [editForm, setEditForm] = useState({ question: "", answer: "" });
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [addForm, setAddForm] = useState({ question: "", answer: "" });

  const [isPublic, setIsPublic] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);

  const loadCardsForDeck = async (deckId) => {
    try {
      const token = localStorage.getItem("token") || "";
      const res = await fetch(
        `http://localhost:5000/api/flashcards/deck/${deckId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
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
      setEditingCardId(null);
      setIsPublic(selectedDeck.is_public || false);
      setIsAnonymous(selectedDeck.is_anonymous || false);

      loadCardsForDeck(selectedDeck.id);
    }
  }, [isOpen, selectedDeck]);

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
        },
      );
      if (res.ok) {
        setIsEditingTitle(false);
        onRefreshDecks();
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
        },
      );
      if (res.ok) {
        onRefreshDecks();
      }
    } catch (error) {
      console.error("Lỗi cập nhật trạng thái chia sẻ:", error);
    }
  };

  const handleDeleteDeck = async () => {
    if (
      !window.confirm(
        `XÓA VĨNH VIỄN bộ thẻ "${selectedDeck.title || selectedDeck.name}"?`,
      )
    )
      return;
    try {
      const token = localStorage.getItem("token") || "";
      const res = await fetch(
        `http://localhost:5000/api/decks/${selectedDeck.id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (res.ok) {
        onClose();
        onRefreshDecks();
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
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (res.ok) setDeckCards(deckCards.filter((c) => c.id !== cardId));
    } catch (error) {
      console.error("Lỗi xóa thẻ:", error);
    }
  };

  const handleSaveEditCard = async (cardId) => {
    if (!editForm.question.trim() || !editForm.answer.trim())
      return alert("Điền đủ 2 mặt nhé!");
    try {
      const token = localStorage.getItem("token") || "";
      const res = await fetch(
        `http://localhost:5000/api/flashcards/${cardId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            question: editForm.question,
            answer: editForm.answer,
          }),
        },
      );
      if (res.ok) {
        setEditingCardId(null);
        loadCardsForDeck(selectedDeck.id);
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
        },
      );
      if (res.ok) {
        setIsAddingCard(false);
        setAddForm({ question: "", answer: "" });
        loadCardsForDeck(selectedDeck.id);
      }
    } catch (error) {
      console.error("Lỗi thêm thẻ mới:", error);
    }
  };

  if (!isOpen || !selectedDeck) return null;

  return (
    <div className="cram-modal-overlay" onClick={onClose}>
      <div className="manage-modal" onClick={(e) => e.stopPropagation()}>
        {/* HEADER */}
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
                <button
                  className="btn-save-title"
                  onClick={handleUpdateDeckName}
                >
                  Lưu
                </button>
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
                {selectedDeck.title || selectedDeck.name}
                <button
                  className="btn-edit-title"
                  onClick={() => setIsEditingTitle(true)}
                >
                  ✏️
                </button>
              </h2>
            )}
          </div>
          <button className="btn-delete-deck" onClick={handleDeleteDeck}>
            🗑️ Xóa bộ thẻ
          </button>
        </div>

        {/* SETTING CHIA SẺ */}
        <div className="share-settings-container">
          <h4 className="share-settings-title">🌐 Trạng thái chia sẻ</h4>
          <label className="share-label">
            <input
              type="checkbox"
              className="share-checkbox"
              checked={isPublic}
              onChange={(e) => handleToggleShare("is_public", e.target.checked)}
            />
            <span className="share-text-primary">Chia sẻ lên Cộng đồng</span>
          </label>
          <label className={`share-label ${!isPublic ? "disabled" : ""}`}>
            <input
              type="checkbox"
              className="share-checkbox"
              checked={isAnonymous}
              onChange={(e) =>
                handleToggleShare("is_anonymous", e.target.checked)
              }
              disabled={!isPublic}
            />
            <span className="share-text-secondary">
              Chia sẻ ẩn danh (Không hiện tên của bạn)
            </span>
          </label>
        </div>

        {/* DANH SÁCH THẺ */}
        <div className="manage-modal-body-content">
          <h4 className="card-list-title">
            Danh sách thẻ ({deckCards.length})
          </h4>
          <div className="card-list-container">
            {deckCards.map((card, index) => (
              <div key={card.id} className="card-item-box">
                {editingCardId === card.id ? (
                  <div className="card-edit-form">
                    <input
                      className="card-edit-input"
                      type="text"
                      value={editForm.question}
                      onChange={(e) =>
                        setEditForm({ ...editForm, question: e.target.value })
                      }
                      placeholder="Mặt trước (Câu hỏi)"
                    />
                    <input
                      className="card-edit-input"
                      type="text"
                      value={editForm.answer}
                      onChange={(e) =>
                        setEditForm({ ...editForm, answer: e.target.value })
                      }
                      placeholder="Mặt sau (Đáp án)"
                    />
                    <div className="card-edit-actions">
                      <button
                        className="btn-cancel-card"
                        onClick={() => setEditingCardId(null)}
                      >
                        Hủy
                      </button>
                      <button
                        className="btn-save-card"
                        onClick={() => handleSaveEditCard(card.id)}
                      >
                        Lưu lại
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="card-front-text">
                      <span className="card-index">#{index + 1}</span>
                      {card.question || card.front_content}
                    </div>
                    <div className="card-back-text">
                      {card.answer || card.back_content}
                    </div>
                    <div className="card-list-actions">
                      <button
                        className="btn-edit-card"
                        onClick={() => {
                          setEditingCardId(card.id);
                          setEditForm({
                            question: card.question || card.front_content,
                            answer: card.answer || card.back_content,
                          });
                        }}
                      >
                        ✏️ Sửa
                      </button>
                      <button
                        className="btn-delete-card"
                        onClick={() => handleDeleteCard(card.id)}
                      >
                        🗑️ Xóa
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* THÊM THẺ MỚI */}
          <div className="add-card-section">
            {isAddingCard ? (
              <div className="add-card-form">
                <h4 className="add-card-title">✨ Thêm thẻ mới</h4>
                <input
                  className="card-edit-input"
                  type="text"
                  value={addForm.question}
                  onChange={(e) =>
                    setAddForm({ ...addForm, question: e.target.value })
                  }
                  placeholder="Nhập mặt trước..."
                  autoFocus
                />
                <input
                  className="card-edit-input"
                  type="text"
                  value={addForm.answer}
                  onChange={(e) =>
                    setAddForm({ ...addForm, answer: e.target.value })
                  }
                  placeholder="Nhập mặt sau..."
                />
                <div className="card-edit-actions" style={{ marginTop: "5px" }}>
                  <button
                    className="btn-cancel-card"
                    onClick={() => {
                      setIsAddingCard(false);
                      setAddForm({ question: "", answer: "" });
                    }}
                  >
                    Hủy
                  </button>
                  <button
                    className="btn-confirm-add"
                    onClick={handleSaveNewCard}
                  >
                    Thêm ngay
                  </button>
                </div>
              </div>
            ) : (
              <button
                className="btn-trigger-add"
                onClick={() => setIsAddingCard(true)}
              >
                + Thêm thẻ mới vào bộ này
              </button>
            )}
          </div>
        </div>

        {/* NÚT XONG */}
        <button className="btn-close-modal" onClick={onClose}>
          Xong
        </button>
      </div>
    </div>
  );
};

export default ManageDeckModal;
