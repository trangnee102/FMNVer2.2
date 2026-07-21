import React, { useState, useEffect } from "react";
import "./CreateFlashcardForm.css";
// 👉 ĐÃ THÊM: Import deckAPI để xài chiêu "Lưu 1 phát nguyên bộ"
import { deckAPI } from "../../services/api";

const CreateFlashcardForm = ({ onCancel }) => {
  // 👉 ĐÃ SỬA: Thay vì 1 thẻ, chúng ta quản lý cả 1 DANH SÁCH thẻ
  const [cards, setCards] = useState([{ question: "", answer: "" }]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [decks, setDecks] = useState([]);
  const [selectedDeck, setSelectedDeck] = useState("");
  const [newDeckName, setNewDeckName] = useState("");

  const [examDate, setExamDate] = useState("");
  const [redZoneDays, setRedZoneDays] = useState("");

  // Tách hàm fetchDecks ra để tái sử dụng lúc tạo môn mới xong
  const fetchDecks = async (autoSelectId = null) => {
    try {
      const token = localStorage.getItem("token") || "";
      const res = await fetch("http://localhost:5000/api/decks", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setDecks(data.data || []);
        // Nếu có ID truyền vào thì tự động chọn môn đó (Dùng cho lúc vừa tạo mới)
        if (autoSelectId) {
          setSelectedDeck(autoSelectId);
        } else if (data.data && data.data.length > 0 && !selectedDeck) {
          setSelectedDeck(data.data[0].id);
        }
      }
    } catch (error) {
      console.error("Lỗi khi tải danh sách môn học:", error);
    }
  };

  useEffect(() => {
    fetchDecks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 👉 CÁC HÀM XỬ LÝ DANH SÁCH THẺ
  const handleAddCard = () => {
    setCards([...cards, { question: "", answer: "" }]);
  };

  const handleRemoveCard = (index) => {
    if (cards.length === 1) {
      alert("Phải có ít nhất 1 thẻ chứ cậu!");
      return;
    }
    const newCards = cards.filter((_, i) => i !== index);
    setCards(newCards);
  };

  const handleCardChange = (index, field, value) => {
    const newCards = [...cards];
    newCards[index][field] = value;
    setCards(newCards);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (selectedDeck === "new" && !newDeckName.trim()) {
      alert("Vui lòng nhập tên bộ thẻ mới!");
      return;
    }
    if (!selectedDeck) {
      alert("Vui lòng chọn hoặc tạo một bộ thẻ!");
      return;
    }

    // Lọc bỏ những thẻ bị bỏ trống cả 2 mặt
    const validCards = cards.filter(
      (c) => c.question.trim() !== "" && c.answer.trim() !== "",
    );

    if (validCards.length === 0) {
      alert("Vui lòng điền nội dung cho ít nhất 1 thẻ hoàn chỉnh!");
      return;
    }

    setIsSubmitting(true);

    try {
      if (selectedDeck === "new") {
        // TRƯỜNG HỢP 1: TẠO MÔN MỚI -> Dùng API /decks/bulk mới code lúc nãy
        const payload = {
          title: newDeckName,
          exam_date: examDate || null,
          red_zone_days: redZoneDays ? parseInt(redZoneDays) : null,
          cards: validCards, // Gửi nguyên mảng thẻ đi
        };

        const response = await deckAPI.createDeckWithCards(payload);

        if (response.success) {
          alert(`Đã tạo môn mới và lưu ${validCards.length} thẻ thành công!`);

          // 👉 Đỉnh cao UX là đây: Load lại danh sách môn và CHỌN LUÔN môn vừa tạo
          await fetchDecks(response.data.id);

          // Reset form tạo môn
          setNewDeckName("");
          setExamDate("");
          setRedZoneDays("");
          // Xóa trắng danh sách thẻ để người dùng gõ tiếp lô mới
          setCards([{ question: "", answer: "" }]);
        } else {
          alert(`Lỗi từ Server: ${response.message}`);
        }
      } else {
        // TRƯỜNG HỢP 2: THÊM VÀO MÔN ĐÃ CÓ
        const token = localStorage.getItem("token") || "";

        // Chạy vòng lặp lưu từng thẻ (Dùng API cũ của cậu)
        const uploadPromises = validCards.map((card) =>
          fetch("http://localhost:5000/api/flashcards/create-manual", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              front_content: card.question,
              back_content: card.answer,
              deck_id: selectedDeck,
            }),
          }),
        );

        await Promise.all(uploadPromises);
        alert(`Đã lưu thêm ${validCards.length} thẻ vào bộ học!`);
        setCards([{ question: "", answer: "" }]); // Reset form
      }
    } catch (error) {
      alert("Không thể kết nối! Hãy kiểm tra Server Backend.");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <form className="manual-flashcard-form" onSubmit={handleSubmit}>
      <h2 style={{ marginBottom: "30px", color: "var(--text-dark)" }}>
        Nhập nội dung thẻ
      </h2>

      {/* KHU VỰC CHỌN MÔN HỌC (GIỮ NGUYÊN CODE CỦA CẬU) */}
      <div className="form-group">
        <label>Chọn Môn học / Bộ thẻ</label>
        <select
          className="form-input"
          value={selectedDeck}
          onChange={(e) => setSelectedDeck(e.target.value)}
          required
        >
          <option value="" disabled>
            -- Chọn môn học --
          </option>
          {decks.map((deck) => (
            <option key={deck.id} value={deck.id}>
              {deck.title || deck.name}
            </option>
          ))}
          <option
            value="new"
            style={{ fontWeight: "bold", color: "var(--primary)" }}
          >
            + Tạo môn học mới...
          </option>
        </select>
      </div>

      {selectedDeck === "new" && (
        <div
          className="new-deck-settings"
          style={{
            marginTop: "-10px",
            padding: "15px 20px",
            borderLeft: "4px solid #3b82f6",
            backgroundColor: "#f8fafc",
            borderRadius: "0 8px 8px 0",
            marginBottom: "25px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <div className="form-group" style={{ marginBottom: "15px" }}>
            <label
              style={{
                fontSize: "0.9rem",
                fontWeight: "600",
                color: "#334155",
              }}
            >
              Tên môn học mới <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="Ví dụ: Ôn thi cuối kỳ C++..."
              value={newDeckName}
              onChange={(e) => setNewDeckName(e.target.value)}
              required={selectedDeck === "new"}
            />
          </div>

          <div style={{ display: "flex", gap: "15px" }}>
            <div
              className="form-group"
              style={{ flex: 1, marginBottom: "12px" }}
            >
              <label
                style={{
                  fontSize: "0.85rem",
                  color: "#64748b",
                  fontWeight: "500",
                }}
              >
                Ngày thi (Tùy chọn)
              </label>
              <input
                type="date"
                className="form-input"
                value={examDate}
                min={todayStr}
                onChange={(e) => setExamDate(e.target.value)}
                style={{ cursor: "pointer" }}
              />
            </div>
            <div
              className="form-group"
              style={{ flex: 1, marginBottom: "12px" }}
            >
              <label
                style={{
                  fontSize: "0.85rem",
                  color: "#64748b",
                  fontWeight: "500",
                }}
              >
                Vùng đỏ (Báo trước X ngày)
              </label>
              <input
                type="number"
                className="form-input"
                placeholder="Ví dụ: 7"
                min="1"
                value={redZoneDays}
                onChange={(e) => setRedZoneDays(e.target.value)}
                disabled={!examDate}
              />
            </div>
          </div>
          <p
            style={{
              fontSize: "0.85rem",
              color: "#0369a1",
              margin: "5px 0 0 0",
              lineHeight: "1.5",
              display: "flex",
              alignItems: "flex-start",
              gap: "6px",
            }}
          >
            <i
              className="fa-solid fa-circle-info"
              style={{ marginTop: "3px" }}
            ></i>
            <span>
              Nếu thiết lập, hệ thống sẽ tự động bật cảnh báo Cram Mode khi rơi
              vào Vùng đỏ.
            </span>
          </p>
        </div>
      )}

      {/* 👉 ĐÃ SỬA: RENDER DANH SÁCH THẺ BẰNG HÀM MAP */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "20px",
          marginBottom: "20px",
        }}
      >
        {cards.map((card, index) => (
          <div
            key={index}
            style={{
              background: "#fff",
              padding: "20px",
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
              position: "relative",
            }}
          >
            {/* Header của từng Thẻ & Nút Xóa */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "15px",
                borderBottom: "1px solid #f1f5f9",
                paddingBottom: "10px",
              }}
            >
              <span style={{ fontWeight: "bold", color: "#3b82f6" }}>
                Thẻ số {index + 1}
              </span>

              <button
                type="button"
                onClick={() => handleRemoveCard(index)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#ef4444",
                  cursor: "pointer",
                  fontSize: "1.1rem",
                  padding: "5px",
                }}
                title="Xóa thẻ này"
              >
                <i className="fa-solid fa-trash"></i>
              </button>
            </div>

            <div className="form-group" style={{ marginBottom: "15px" }}>
              <label>Mặt trước (Câu hỏi / Thuật ngữ)</label>
              <textarea
                className="form-textarea"
                placeholder="Ví dụ: Định lý Pythagoras là gì?"
                value={card.question}
                onChange={(e) =>
                  handleCardChange(index, "question", e.target.value)
                }
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: "0" }}>
              <label>Mặt sau (Câu trả lời / Ý nghĩa)</label>
              <textarea
                className="form-textarea"
                placeholder="Ví dụ: Trong một tam giác vuông..."
                value={card.answer}
                onChange={(e) =>
                  handleCardChange(index, "answer", e.target.value)
                }
                required
              />
            </div>
          </div>
        ))}
      </div>

      {/* NÚT THÊM THẺ MỚI */}
      <button
        type="button"
        onClick={handleAddCard}
        style={{
          width: "100%",
          padding: "12px",
          background: "#f8fafc",
          color: "#3b82f6",
          border: "2px dashed #93c5fd",
          borderRadius: "8px",
          fontWeight: "bold",
          cursor: "pointer",
          marginBottom: "30px",
          transition: "0.2s",
        }}
        onMouseOver={(e) => (e.currentTarget.style.background = "#eff6ff")}
        onMouseOut={(e) => (e.currentTarget.style.background = "#f8fafc")}
      >
        <i className="fa-solid fa-plus" style={{ marginRight: "8px" }}></i>
        Thêm thẻ mới
      </button>

      {/* CÁC NÚT LƯU & HỦY */}
      <div className="form-actions">
        <button
          type="button"
          className="btn-cancel"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Hủy bỏ
        </button>

        <button
          type="submit"
          className="btn-save"
          disabled={isSubmitting}
          style={{ background: "#10b981" }}
        >
          {isSubmitting ? "Đang xử lý..." : `Lưu ${cards.length} thẻ ngay`}
        </button>
      </div>
    </form>
  );
};

export default CreateFlashcardForm;
