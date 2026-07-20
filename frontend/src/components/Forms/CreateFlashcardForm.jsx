import React, { useState, useEffect } from "react";
import "./CreateFlashcardForm.css";

const CreateFlashcardForm = ({ onCancel }) => {
  const [frontContent, setFrontContent] = useState("");
  const [backContent, setBackContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [decks, setDecks] = useState([]);
  const [selectedDeck, setSelectedDeck] = useState("");
  const [newDeckName, setNewDeckName] = useState("");

  const [examDate, setExamDate] = useState("");
  const [redZoneDays, setRedZoneDays] = useState("");

  useEffect(() => {
    const fetchDecks = async () => {
      try {
        const token = localStorage.getItem("token") || "";
        const res = await fetch("http://localhost:5000/api/decks", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        if (res.ok && data.success) {
          setDecks(data.data || []);
          if (data.data && data.data.length > 0) {
            setSelectedDeck(data.data[0].id);
          }
        }
      } catch (error) {
        console.error("Lỗi khi tải danh sách môn học:", error);
      }
    };
    fetchDecks();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (selectedDeck === "new" && !newDeckName.trim()) {
      alert("Vui lòng nhập tên bộ thẻ mới!"); // 👉 ĐÃ SỬA: Bỏ emoji
      return;
    }
    if (!selectedDeck) {
      alert("Vui lòng chọn hoặc tạo một bộ thẻ!"); // 👉 ĐÃ SỬA: Bỏ emoji
      return;
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem("token") || "";

      const response = await fetch(
        "http://localhost:5000/api/flashcards/create-manual",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            front_content: frontContent,
            back_content: backContent,
            deck_id: selectedDeck === "new" ? null : selectedDeck,
            new_deck_name: selectedDeck === "new" ? newDeckName : null,
            exam_date: selectedDeck === "new" && examDate ? examDate : null,
            red_zone_days:
              selectedDeck === "new" && redZoneDays
                ? parseInt(redZoneDays)
                : null,
          }),
        },
      );

      const data = await response.json();

      if (response.ok) {
        alert("Đã lưu thẻ thành công!"); // 👉 ĐÃ SỬA: Bỏ emoji
        setFrontContent("");
        setBackContent("");

        if (selectedDeck === "new") {
          setNewDeckName("");
          setExamDate("");
          setRedZoneDays("");
        }
      } else {
        alert(`Lỗi từ Server: ${data.message || "Không thể lưu thẻ"}`); // 👉 ĐÃ SỬA: Bỏ emoji
      }
    } catch (error) {
      alert("Không thể kết nối! Hãy kiểm tra Server Backend."); // 👉 ĐÃ SỬA: Bỏ emoji
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
          {/* 👉 ĐÃ SỬA: Bỏ emoji, dùng dấu cộng text chuẩn mực */}
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
            borderLeft: "4px solid #3b82f6", // Màu xanh dương chuyên nghiệp
            backgroundColor: "#f8fafc",
            borderRadius: "0 8px 8px 0",
            marginBottom: "25px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)", // Đổ bóng nhẹ
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

          {/* 👉 ĐÃ SỬA: Thay emoji bằng FontAwesome icon */}
          <p
            style={{
              fontSize: "0.85rem",
              color: "#0369a1", // Xanh dương đậm trầm tính
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

      <div className="form-group">
        <label>Mặt trước (Câu hỏi / Thuật ngữ)</label>
        <textarea
          className="form-textarea"
          placeholder="Ví dụ: Định lý Pythagoras là gì?"
          value={frontContent}
          onChange={(e) => setFrontContent(e.target.value)}
          required
        />
      </div>

      <div className="form-group">
        <label>Mặt sau (Câu trả lời / Ý nghĩa)</label>
        <textarea
          className="form-textarea"
          placeholder="Ví dụ: Trong một tam giác vuông..."
          value={backContent}
          onChange={(e) => setBackContent(e.target.value)}
          required
        />
      </div>

      <div className="form-actions">
        <button
          type="button"
          className="btn-cancel"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Hủy bỏ
        </button>

        <button type="submit" className="btn-save" disabled={isSubmitting}>
          {isSubmitting ? "Đang lưu..." : "Lưu thẻ"}
        </button>
      </div>
    </form>
  );
};

export default CreateFlashcardForm;
