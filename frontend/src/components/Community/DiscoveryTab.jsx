// frontend/src/components/Community/DiscoveryTab.jsx
import React, { useState, useEffect } from "react";
import "./DiscoveryTab.css";
import { communityAPI } from "../../services/api";
import Latex from "react-latex-next";
import "katex/dist/katex.min.css";

const DiscoveryTab = () => {
  const [search, setSearch] = useState("");
  const [decks, setDecks] = useState([]);

  // 👉 ĐÃ THÊM: Các state quản lý Bảng xem chi tiết và nút Tải về
  const [selectedDeck, setSelectedDeck] = useState(null);
  const [deckDetails, setDeckDetails] = useState([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isCloning, setIsCloning] = useState(false);

  useEffect(() => {
    const fetchDecks = async () => {
      try {
        const data = await communityAPI.getDiscoveryDecks();
        setDecks(data);
      } catch (error) {
        console.error("Lỗi khi tải bộ thẻ khám phá:", error);
      }
    };

    fetchDecks();
  }, []);

  // 👉 ĐÃ THÊM: Hàm mở bảng xem trước thẻ khi click vào
  const handleOpenDeck = async (deck) => {
    setSelectedDeck(deck);
    setIsLoadingDetails(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:5000/api/community/decks/${deck.id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const result = await response.json();
      if (result.success) {
        setDeckDetails(result.data.Flashcards || []);
      } else {
        alert("Lỗi: " + result.message);
      }
    } catch (error) {
      alert("Lỗi kết nối khi tải chi tiết thẻ!");
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleCloseModal = () => {
    setSelectedDeck(null);
    setDeckDetails([]);
  };

  // 👉 ĐÃ THÊM: Hàm tải bộ thẻ về tài khoản cá nhân
  const handleCloneDeck = async () => {
    if (!selectedDeck) return;
    setIsCloning(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:5000/api/community/decks/${selectedDeck.id}/clone`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const result = await response.json();
      if (result.success) {
        alert("🎉 " + result.message);
        handleCloseModal(); // Đóng bảng sau khi tải xong
        // Tải lại danh sách thẻ để cập nhật số lượt tải mới
        const newData = await communityAPI.getDiscoveryDecks();
        setDecks(newData);
      } else {
        alert("Lỗi: " + result.message);
      }
    } catch (error) {
      alert("Lỗi kết nối khi tải bộ thẻ!");
    } finally {
      setIsCloning(false);
    }
  };

  // 👉 ĐÃ THÊM: Bộ dịch toán học cho thẻ (Giống hệt bên AI)
  const renderMath = (text) => {
    if (!text) return "";
    let processedText = text.replace(/\\\\/g, "\\");
    return <Latex>{processedText}</Latex>;
  };

  return (
    <div className="discovery-tab">
      <div className="search-bar">
        <i className="fa-solid fa-magnifying-glass"></i>
        <input
          placeholder="Tìm kiếm bộ thẻ, chủ đề..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="filter-group">
        {["Tất cả", "Ngoại ngữ", "Lập trình", "Toán học"].map((f) => (
          <button key={f} className="filter-btn">
            {f}
          </button>
        ))}
      </div>

      <h3>🔥 Bộ thẻ nổi bật</h3>
      <div className="deck-grid">
        {decks.length > 0 ? (
          decks.map((deck) => (
            <div
              key={deck.id}
              className="deck-card"
              onClick={() => handleOpenDeck(deck)} // 👉 Bấm vào thẻ để mở Modal
              style={{ cursor: "pointer" }} // Đổi con trỏ chuột thành hình bàn tay để báo hiệu có thể click
            >
              <h4>{deck.title}</h4>
              <p>
                <i className="fa-solid fa-user"></i> {deck.author}
              </p>
              <div className="deck-stats">
                <span>{deck.cards} thẻ</span>
                {/* 👉 ĐÃ ĐỔI: Chuyển lượt xem thành lượt tải và thêm icon download */}
                <span>
                  <i className="fa-solid fa-download"></i> {deck.views} lượt tải
                </span>
              </div>
            </div>
          ))
        ) : (
          <p
            style={{ color: "#94a3b8", fontStyle: "italic", marginTop: "10px" }}
          >
            Đang tải dữ liệu hoặc chưa có bộ thẻ nào được chia sẻ...
          </p>
        )}
      </div>

      {/* ========================================== */}
      {/* 👉 ĐÃ THÊM: GIAO DIỆN BẢNG MODAL XEM TRƯỚC VÀ TẢI THẺ */}
      {/* ========================================== */}
      {selectedDeck && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.6)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "white",
              padding: "25px",
              borderRadius: "12px",
              width: "90%",
              maxWidth: "650px",
              maxHeight: "85vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
            }}
          >
            {/* Header của Bảng */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "2px solid #f1f5f9",
                paddingBottom: "15px",
                marginBottom: "20px",
              }}
            >
              <div>
                <h2
                  style={{
                    margin: "0 0 5px 0",
                    color: "#1e293b",
                    fontSize: "1.5rem",
                  }}
                >
                  {selectedDeck.title}
                </h2>
                <span style={{ fontSize: "0.9rem", color: "#64748b" }}>
                  <i className="fa-solid fa-user"></i> Tác giả:{" "}
                  {selectedDeck.author}
                </span>
              </div>
              <button
                onClick={handleCloseModal}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "1.8rem",
                  color: "#94a3b8",
                  cursor: "pointer",
                }}
              >
                &times;
              </button>
            </div>

            {/* Nội dung danh sách thẻ */}
            <div style={{ overflowY: "auto", flex: 1, paddingRight: "10px" }}>
              {isLoadingDetails ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px 0",
                    color: "#6366f1",
                  }}
                >
                  <i
                    className="fa-solid fa-spinner fa-spin"
                    style={{ fontSize: "2rem", marginBottom: "10px" }}
                  ></i>
                  <p>Đang tải nội dung bộ thẻ...</p>
                </div>
              ) : deckDetails.length > 0 ? (
                deckDetails.map((card, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: "#f8fafc",
                      padding: "15px",
                      borderRadius: "10px",
                      marginBottom: "12px",
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    <div style={{ marginBottom: "12px", color: "#334155" }}>
                      <strong style={{ color: "#6366f1" }}>Hỏi:</strong>{" "}
                      <span className="format-text">
                        {renderMath(card.question)}
                      </span>
                    </div>
                    <div style={{ color: "#334155" }}>
                      <strong style={{ color: "#10b981" }}>Đáp:</strong>{" "}
                      <span className="format-text">
                        {renderMath(card.answer)}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px 0",
                    color: "#94a3b8",
                  }}
                >
                  <i
                    className="fa-regular fa-folder-open"
                    style={{ fontSize: "3rem", marginBottom: "10px" }}
                  ></i>
                  <p>Bộ thẻ này trống!</p>
                </div>
              )}
            </div>

            {/* Footer chứa nút Tải về */}
            <div
              style={{
                marginTop: "20px",
                paddingTop: "20px",
                borderTop: "2px solid #f1f5f9",
                display: "flex",
                justifyContent: "flex-end",
                gap: "12px",
              }}
            >
              <button
                onClick={handleCloseModal}
                style={{
                  padding: "10px 20px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  background: "white",
                  color: "#475569",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                Đóng
              </button>
              <button
                onClick={handleCloneDeck}
                disabled={isCloning || deckDetails.length === 0}
                style={{
                  padding: "10px 20px",
                  borderRadius: "8px",
                  border: "none",
                  background: "#6366f1",
                  color: "white",
                  fontWeight: "600",
                  cursor:
                    isCloning || deckDetails.length === 0
                      ? "not-allowed"
                      : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  opacity: isCloning || deckDetails.length === 0 ? 0.7 : 1,
                  transition: "all 0.2s",
                }}
              >
                {isCloning ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin"></i> Đang tải...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-cloud-arrow-down"></i> Tải về thư
                    viện
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiscoveryTab;
