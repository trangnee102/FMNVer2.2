import React, { useState, useEffect } from "react";
import api from "../../services/api";
import "./ManageDeckModal.css";

const ManageDeckModal = ({ isOpen, onClose, selectedDeck, onRefreshDecks }) => {
  const [deckCards, setDeckCards] = useState([]);
  const [newDeckTitle, setNewDeckTitle] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  
  const [activeCardId, setActiveCardId] = useState(null);
  const [isAddingCard, setIsAddingCard] = useState(false);
  
  const emptyExamForm = {
    question: "",
    answer: "",
    question_type: "SINGLE_CHOICE",
    options: ["", "", "", ""],
    correct_answers: [],
    explanation: "",
    difficulty: "MEDIUM"
  };

  const [editForm, setEditForm] = useState(emptyExamForm);
  const [addForm, setAddForm] = useState(emptyExamForm);

  const [isPublic, setIsPublic] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);

  const loadCardsForDeck = async (deckId) => {
    try {
      const res = await api.get(`/flashcards/deck/${deckId}`);
      const data = res.data || res;
      if (data && data.success !== false) {
        setDeckCards(data.data || data || []);
      }
    } catch (error) {}
  };

  useEffect(() => {
    if (isOpen && selectedDeck) {
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
    if (!newDeckTitle.trim()) return alert("Tên bộ thẻ/đề thi không được để trống!");
    try {
      const res = await api.put(`/decks/${selectedDeck.id}`, { 
        title: newDeckTitle, 
        name: newDeckTitle 
      });
      if (res && res.success !== false) {
        setIsEditingTitle(false);
        if (onRefreshDecks) onRefreshDecks(); 
      }
    } catch (error) {}
  };

  const handleToggleShare = async (field, value) => {
    const updatedPublic = field === "is_public" ? value : isPublic;
    const updatedAnon = field === "is_anonymous" ? value : isAnonymous;

    if (field === "is_public") {
      setIsPublic(value);
      if (!value) {
        setIsAnonymous(false);
      }
    }
    if (field === "is_anonymous") setIsAnonymous(value);

    try {
      const res = await api.put(`/decks/${selectedDeck.id}`, {
        is_public: field === "is_public" ? value : isPublic,
        is_anonymous: field === "is_public" && !value ? false : (field === "is_anonymous" ? value : isAnonymous),
      });
      if (res && res.success !== false) {
        if (onRefreshDecks) onRefreshDecks();
      }
    } catch (error) {}
  };

  const handleDeleteDeck = async () => {
    const titleToDisplay = newDeckTitle || selectedDeck.title || selectedDeck.name;
    if (!window.confirm(`XÓA VĨNH VIỄN bộ dữ liệu "${titleToDisplay}"?`)) return;
    try {
      const res = await api.delete(`/decks/${selectedDeck.id}`);
      if (res && res.success !== false) {
        onClose();
        if (onRefreshDecks) onRefreshDecks();
      }
    } catch (error) {}
  };

  const handleDeleteCard = async (cardId) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa mục này?")) return;
    try {
      const res = await api.delete(`/flashcards/${cardId}`);
      if (res && res.success !== false) {
        setDeckCards(deckCards.filter((c) => c.id !== cardId));
        setActiveCardId(null);
        if (onRefreshDecks) onRefreshDecks(); 
      }
    } catch (error) {}
  };

  const buildPayload = (form) => {
    if (!selectedDeck.is_exam) {
      return {
        question: form.question,
        answer: form.answer,
        question_type: "FLASHCARD"
      };
    }

    const validOptions = form.question_type === "TRUE_FALSE" 
      ? form.options 
      : form.options.filter(opt => opt.trim() !== "");

    return {
      question: form.question,
      answer: form.correct_answers.join(" | "),
      question_type: form.question_type,
      options: JSON.stringify(validOptions),
      correct_answers: form.correct_answers.join(", "),
      explanation: form.explanation || "",
      difficulty: form.difficulty || "MEDIUM",
      category: selectedDeck.category || "THEORY"
    };
  };

  const handleSaveEditCard = async () => {
    if (!editForm.question.trim()) return alert("Vui lòng nhập câu hỏi!");
    if (!selectedDeck.is_exam && !editForm.answer.trim()) return alert("Vui lòng nhập đáp án!");
    if (selectedDeck.is_exam && editForm.correct_answers.length === 0) return alert("Vui lòng chọn đáp án đúng!");

    try {
      const payload = buildPayload(editForm);
      const res = await api.put(`/flashcards/${activeCardId}`, payload);
      if (res && res.success !== false) {
        setActiveCardId(null);
        await loadCardsForDeck(selectedDeck.id);
        if (onRefreshDecks) onRefreshDecks(); 
      }
    } catch (error) {
      alert("Lỗi khi cập nhật!");
    }
  };

  const handleSaveNewCard = async () => {
    if (!addForm.question.trim()) return alert("Vui lòng nhập câu hỏi!");
    if (!selectedDeck.is_exam && !addForm.answer.trim()) return alert("Vui lòng nhập đáp án!");
    if (selectedDeck.is_exam && addForm.correct_answers.length === 0) return alert("Vui lòng chọn đáp án đúng!");

    try {
      const payload = buildPayload(addForm);
      const res = await api.post(`/flashcards/deck/${selectedDeck.id}`, payload);
      if (res && res.success !== false) {
        setIsAddingCard(false);
        setAddForm(emptyExamForm);
        await loadCardsForDeck(selectedDeck.id);
        if (onRefreshDecks) onRefreshDecks(); 
      }
    } catch (error) {
      alert("Lỗi khi thêm mới!");
    }
  };

  const renderFormContent = (form, setForm) => {
    if (!selectedDeck.is_exam) {
      return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <div style={{ marginBottom: "15px", flex: 1, display: "flex", flexDirection: "column" }}>
            <label style={{ display: "block", fontWeight: "700", color: "var(--text-dark)", marginBottom: "8px" }}>Mặt trước (Câu hỏi)</label>
            <textarea
              style={{ flex: 1, minHeight: "120px", width: "100%", padding: "15px", borderRadius: "12px", border: "1px solid var(--border)", background: "var(--bg-main)", color: "var(--text-dark)", fontFamily: "inherit", resize: "none", fontSize: "0.95rem", outline: "none", boxSizing: "border-box" }}
              value={form.question}
              onChange={(e) => setForm({ ...form, question: e.target.value })}
              placeholder="Nhập câu hỏi vào đây..."
              autoFocus
            />
          </div>
          <div style={{ marginBottom: "20px", flex: 1, display: "flex", flexDirection: "column" }}>
            <label style={{ display: "block", fontWeight: "700", color: "var(--text-dark)", marginBottom: "8px" }}>Mặt sau (Đáp án)</label>
            <textarea
              style={{ flex: 1, minHeight: "120px", width: "100%", padding: "15px", borderRadius: "12px", border: "1px solid var(--border)", background: "var(--bg-main)", color: "var(--text-dark)", fontFamily: "inherit", resize: "none", fontSize: "0.95rem", outline: "none", boxSizing: "border-box" }}
              value={form.answer}
              onChange={(e) => setForm({ ...form, answer: e.target.value })}
              placeholder="Nhập đáp án vào đây..."
            />
          </div>
        </div>
      );
    }

    const getAlphabetLabel = (index) => String.fromCharCode(65 + index);
    const updateField = (field, value) => setForm({ ...form, [field]: value });

    return (
      <div style={{ display: "flex", flexDirection: "column", flex: 1, overflowY: "auto", paddingRight: "5px", overflowX: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
          <label style={{ fontWeight: "700", color: "var(--text-dark)" }}>Loại câu hỏi</label>
          <select
            value={form.question_type}
            onChange={(e) => {
              const newType = e.target.value;
              let newOptions = form.options;
              if (newType === "TRUE_FALSE") newOptions = ["Đúng", "Sai"];
              else if (form.question_type === "TRUE_FALSE") newOptions = ["", "", "", ""];
              setForm({ ...form, question_type: newType, options: newOptions, correct_answers: [] });
            }}
            style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--border)", background: "var(--bg-main)", fontSize: "0.9rem", color: "var(--text-dark)", outline: "none", cursor: "pointer" }}
          >
            <option value="SINGLE_CHOICE">Trắc nghiệm 1 đáp án</option>
            <option value="MULTIPLE_CHOICE">Nhiều đáp án</option>
            <option value="TRUE_FALSE">Đúng / Sai</option>
          </select>
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", fontWeight: "700", color: "var(--text-dark)", marginBottom: "8px" }}>Nội dung câu hỏi</label>
          <textarea
            value={form.question}
            onChange={(e) => updateField("question", e.target.value)}
            placeholder="Nhập nội dung câu hỏi..."
            style={{ width: "100%", minHeight: "80px", padding: "12px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg-main)", fontSize: "0.95rem", color: "var(--text-dark)", outline: "none", resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "15px" }}>
          <label style={{ display: "block", fontWeight: "700", color: "var(--text-dark)" }}>Các lựa chọn</label>
          {form.options.map((opt, optIdx) => {
            const isCorrect = form.correct_answers.includes(opt) && opt !== "";
            return (
              <div key={optIdx} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  onClick={() => {
                    if (!opt.trim()) return;
                    let newCorrect = [...form.correct_answers];
                    if (form.question_type !== "MULTIPLE_CHOICE") newCorrect = [opt];
                    else {
                      if (newCorrect.includes(opt)) newCorrect = newCorrect.filter(a => a !== opt);
                      else newCorrect.push(opt);
                    }
                    updateField("correct_answers", newCorrect);
                  }}
                  style={{ width: "24px", height: "24px", borderRadius: form.question_type === "MULTIPLE_CHOICE" ? "4px" : "50%", background: isCorrect ? "var(--primary)" : "var(--bg-main)", border: isCorrect ? "none" : "2px solid var(--border)", display: "flex", justifyContent: "center", alignItems: "center", color: "#fff", cursor: opt.trim() ? "pointer" : "not-allowed", flexShrink: 0 }}
                >
                  {isCorrect && <i className="fa-solid fa-check" style={{ fontSize: "0.7rem" }}></i>}
                </div>
                {form.question_type === "TRUE_FALSE" ? (
                  <div style={{ flex: 1, fontSize: "0.95rem", color: "var(--text-dark)", padding: "8px 0" }}>{opt}</div>
                ) : (
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => {
                      const newOpts = [...form.options];
                      const oldVal = newOpts[optIdx];
                      newOpts[optIdx] = e.target.value;
                      const newCorrect = form.correct_answers.map(ans => ans === oldVal ? e.target.value : ans);
                      setForm({ ...form, options: newOpts, correct_answers: newCorrect });
                    }}
                    placeholder={`Tùy chọn ${getAlphabetLabel(optIdx)}`}
                    style={{ flex: 1, border: "1px solid var(--border)", background: "var(--bg-main)", fontSize: "0.95rem", padding: "10px", borderRadius: "6px", outline: "none", color: "var(--text-dark)", boxSizing: "border-box" }}
                  />
                )}
                {form.question_type !== "TRUE_FALSE" && form.options.length > 2 && (
                  <button onClick={() => {
                    const newOpts = form.options.filter((_, i) => i !== optIdx);
                    const optToRemove = form.options[optIdx];
                    const newCorrect = form.correct_answers.filter(ans => ans !== optToRemove);
                    setForm({ ...form, options: newOpts, correct_answers: newCorrect });
                  }} style={{ background: "none", border: "none", color: "var(--text-gray)", cursor: "pointer", padding: "0 5px" }}>
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                )}
              </div>
            );
          })}
          {form.question_type !== "TRUE_FALSE" && form.options.length < 6 && (
            <button onClick={() => updateField("options", [...form.options, ""])} style={{ alignSelf: "flex-start", background: "none", border: "none", color: "var(--primary)", fontSize: "0.9rem", fontWeight: "600", cursor: "pointer", padding: "5px 0" }}>
              <i className="fa-solid fa-plus"></i> Thêm lựa chọn
            </button>
          )}
        </div>

        <div style={{ display: "flex", gap: "15px", marginBottom: "10px" }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontWeight: "700", color: "var(--text-dark)", marginBottom: "8px", fontSize: "0.9rem" }}>Giải thích đáp án</label>
            <textarea
              value={form.explanation}
              onChange={(e) => updateField("explanation", e.target.value)}
              placeholder="Nhập giải thích..."
              style={{ width: "100%", minHeight: "60px", padding: "10px", borderRadius: "6px", border: "1px solid var(--border)", background: "var(--bg-main)", fontSize: "0.9rem", color: "var(--text-dark)", outline: "none", resize: "vertical", boxSizing: "border-box" }}
            />
          </div>
          <div style={{ width: "120px" }}>
            <label style={{ display: "block", fontWeight: "700", color: "var(--text-dark)", marginBottom: "8px", fontSize: "0.9rem" }}>Độ khó</label>
            <select
              value={form.difficulty}
              onChange={(e) => updateField("difficulty", e.target.value)}
              style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid var(--border)", background: "var(--bg-main)", fontSize: "0.9rem", color: "var(--text-dark)", outline: "none", boxSizing: "border-box" }}
            >
              <option value="EASY">Dễ</option>
              <option value="MEDIUM">Trung bình</option>
              <option value="HARD">Khó</option>
            </select>
          </div>
        </div>
      </div>
    );
  };

  if (!isOpen || !selectedDeck) return null;

  return (
    <div className="manage-modal-overlay" onClick={onClose}>
      <div className="manage-modal-split" onClick={(e) => e.stopPropagation()}>
        
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
                  title="Sửa tên"
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
            <i className="fa-regular fa-trash-can"></i> Xóa bộ dữ liệu
          </button>
        </div>

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

        <div className="split-modal-body">
          <div className="split-left-col">
            <div className="split-left-header">
              <h4 style={{ margin: 0, color: "var(--text-dark)", fontSize: "1.05rem", fontWeight: "700" }}>
                {selectedDeck.is_exam ? `Danh sách câu hỏi (${deckCards.length})` : `Danh sách thẻ (${deckCards.length})`}
              </h4>
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

                      if (selectedDeck.is_exam) {
                        let parsedOpts = ["", "", "", ""];
                        try {
                          const o = JSON.parse(card.options);
                          if(Array.isArray(o) && o.length > 0) parsedOpts = o;
                        } catch(e) {}

                        let parsedCorrect = [];
                        if (card.correct_answers) {
                          parsedCorrect = card.correct_answers.split(",").map(s => s.trim()).filter(Boolean);
                        } else if (card.answer) {
                          parsedCorrect = card.answer.split(/[|,]/).map(s => s.trim()).filter(Boolean);
                        }

                        setEditForm({
                          question: card.question || "",
                          answer: card.answer || "",
                          question_type: card.question_type || "SINGLE_CHOICE",
                          options: parsedOpts,
                          correct_answers: parsedCorrect,
                          explanation: card.explanation || "",
                          difficulty: card.difficulty || "MEDIUM"
                        });
                      } else {
                        setEditForm({
                          question: card.question || card.front_content || "",
                          answer: card.answer || card.back_content || "",
                          question_type: "FLASHCARD"
                        });
                      }
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
                        {selectedDeck.is_exam ? (card.correct_answers || card.answer) : (card.answer || card.back_content)}
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
                  setAddForm(emptyExamForm);
                }}
              >
                + Thêm mục mới
              </button>
            </div>
          </div>

          <div className="split-right-col" style={{ position: "relative", display: "flex", flexDirection: "column" }}>
            {isAddingCard ? (
              <div style={{ animation: "fadeIn 0.3s ease", display: "flex", flexDirection: "column", height: "100%" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                  <h4 style={{ margin: 0, color: "var(--primary)", fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "8px" }}>
                    <i className="fa-solid fa-plus-circle"></i> Thêm mới
                  </h4>
                  <button onClick={() => setIsAddingCard(false)} style={{ background: "none", border: "none", color: "var(--text-gray)", cursor: "pointer", fontSize: "1.2rem" }}><i className="fa-solid fa-xmark"></i></button>
                </div>
                
                {renderFormContent(addForm, setAddForm)}

                <div style={{ marginTop: "15px" }}>
                  <button onClick={handleSaveNewCard} style={{ width: "100%", padding: "14px", background: "var(--primary)", color: "white", border: "none", borderRadius: "12px", fontWeight: "bold", fontSize: "1rem", cursor: "pointer", boxShadow: "0 4px 10px rgba(59, 130, 246, 0.3)" }}>
                    Lưu thêm mới
                  </button>
                </div>
              </div>
            ) : activeCardId ? (
              <div style={{ animation: "fadeIn 0.3s ease", display: "flex", flexDirection: "column", height: "100%" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                  <h4 style={{ margin: 0, color: "var(--text-dark)", fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "8px" }}>
                    <i className="fa-solid fa-pen-to-square" style={{ color: "var(--text-gray)" }}></i> Chỉnh sửa
                  </h4>
                  <button onClick={() => setActiveCardId(null)} style={{ background: "none", border: "none", color: "var(--text-gray)", cursor: "pointer", fontSize: "1.2rem" }}><i className="fa-solid fa-xmark"></i></button>
                </div>
                
                {renderFormContent(editForm, setEditForm)}

                <div style={{ display: "flex", gap: "10px", marginTop: "15px" }}>
                  <button onClick={handleSaveEditCard} style={{ flex: 1, padding: "14px", background: "var(--primary)", color: "white", border: "none", borderRadius: "12px", fontWeight: "bold", fontSize: "1rem", cursor: "pointer", boxShadow: "0 4px 10px rgba(59, 130, 246, 0.3)" }}>Lưu thay đổi</button>
                  <button onClick={() => handleDeleteCard(activeCardId)} style={{ padding: "14px 20px", background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: "12px", fontWeight: "bold", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
                    <i className="fa-regular fa-trash-can"></i> Xóa
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--text-gray)", textAlign: "center" }}>
                <i className="fa-solid fa-layer-group" style={{ fontSize: "4rem", opacity: 0.2, marginBottom: "20px" }}></i>
                <p style={{ margin: 0, lineHeight: "1.6", fontSize: "1.05rem" }}>Chọn một mục bên trái để chỉnh sửa<br/>hoặc bấm <strong style={{color: "var(--primary)"}}>"+ Thêm mục mới"</strong></p>
              </div>
            )}
          </div>
        </div>

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