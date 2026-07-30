// frontend/src/pages/MyExamsPage.jsx
import { useState, useEffect, useCallback } from "react";
import Sidebar from "../components/Layout/Sidebar";
import ManageDeckModal from "../components/Modals/ManageDeckModal";
import api from "../services/api";
import "./DashboardPage.css";
import "./MyDecksPage.css";

const MyExamsPage = ({ onNavigate, onExam }) => {
  const [decks, setDecks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState("name-asc");
  const [favoriteDecks, setFavoriteDecks] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("favoriteExamIds") || "[]");
    } catch {
      return [];
    }
  });

  const [selectedDeck, setSelectedDeck] = useState(null);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);

  const [examModal, setExamModal] = useState({
    isOpen: false,
    deckId: null,
    deckName: "",
    easyCount: 0,
    mediumCount: 0,
    hardCount: 0,
    maxEasy: 0,
    maxMedium: 0,
    maxHard: 0,
    maxCards: 0,
    mode: "practice",
    timeLimit: 15, // 👉 ĐÃ THÊM: Thời gian mặc định (phút)
  });

  const fetchDecksData = useCallback(async () => {
    try {
      const decksRes = await api.get(`/decks?type=exam`);
      let rawDecks = decksRes.success
        ? decksRes.data || []
        : Array.isArray(decksRes)
          ? decksRes
          : [];

      setDecks(rawDecks);
    } catch (err) {
      console.error("Lỗi khi tải kho đề thi:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDecksData();
  }, [fetchDecksData]);

  const toggleFavoriteDeck = (deckId) => {
    setFavoriteDecks((prev) => {
      const isFavorite = prev.includes(deckId);
      const nextFavorites = isFavorite
        ? prev.filter((id) => id !== deckId)
        : [deckId, ...prev.filter((id) => id !== deckId)];
      localStorage.setItem("favoriteExamIds", JSON.stringify(nextFavorites));
      return nextFavorites;
    });

    setDecks((prevDecks) => {
      const deckIndex = prevDecks.findIndex((deck) => deck.id === deckId);
      if (deckIndex === -1) return prevDecks;
      const deckToMove = prevDecks[deckIndex];
      const newDecks = prevDecks.filter((deck) => deck.id !== deckId);
      return [deckToMove, ...newDecks];
    });
  };

  const openManageModal = (deck) => {
    setSelectedDeck(deck);
    setIsManageModalOpen(true);
  };

  const filteredDecks = decks.filter((deck) => {
    const search = searchQuery.trim().toLowerCase();
    if (!search) return true;
    return (
      (deck.title || deck.name || "").toLowerCase().includes(search) ||
      (deck.description || "").toLowerCase().includes(search)
    );
  });

  const sortedDecks = [...filteredDecks].sort((a, b) => {
    const aFavorite = favoriteDecks.includes(a.id) ? 0 : 1;
    const bFavorite = favoriteDecks.includes(b.id) ? 0 : 1;
    if (aFavorite !== bFavorite) return aFavorite - bFavorite;

    const cardsA = a.totalCards ?? 0;
    const cardsB = b.totalCards ?? 0;
    const nameA = (a.title || a.name || "").toLowerCase();
    const nameB = (b.title || b.name || "").toLowerCase();

    if (sortOption === "name-asc") return nameA.localeCompare(nameB);
    if (sortOption === "name-desc") return nameB.localeCompare(nameA);
    if (sortOption === "cards-desc") return cardsB - cardsA;
    if (sortOption === "cards-asc") return cardsA - cardsB;

    return 0;
  });

  const totalDecks = filteredDecks.length;
  const totalQuestions = filteredDecks.reduce(
    (acc, deck) => acc + (deck.totalCards ?? 0),
    0,
  );

  const renderEmptyState = () => {
    return (
      <div className="modern-empty-wrapper">
        <div className="modern-empty-state">
          <div className="empty-illustration">
            <i className="fa-solid fa-file-signature"></i>
          </div>
          <h2 style={{ color: "var(--text-dark)" }}>Chưa có đề thi nào</h2>
          <p style={{ color: "var(--text-gray)" }}>
            Bạn chưa tạo đề thi nào. Hãy để AI giúp bạn tạo đề thi trắc nghiệm
            đầu tiên!
          </p>
          <button
            className="btn-create-primary"
            onClick={() => onNavigate("create-exam")}
          >
            + Tạo đề thi ngay
          </button>
        </div>
      </div>
    );
  };

  const currentTotal =
    examModal.easyCount + examModal.mediumCount + examModal.hardCount;

  return (
    <div className="dashboard-layout">
      <Sidebar currentView="my-exams" onNavigate={onNavigate} />

      <main
        className="dashboard-content scrollable-content"
        style={{
          backgroundColor: "var(--bg-main)",
          overflowY: "auto",
          height: "100vh",
        }}
      >
        <div
          className="page-wrapper my-decks-wrapper"
          style={{ maxWidth: "1300px", margin: "0 auto", padding: "30px 40px" }}
        >
          <div className="modern-page-header">
            <div className="header-title-group">
              <h1
                style={{
                  color: "var(--text-dark)",
                  fontSize: "2rem",
                  fontWeight: "800",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                Kho Đề Thi 📝
              </h1>
              <p style={{ color: "var(--text-gray)", marginTop: "5px" }}>
                Nơi lưu trữ và quản lý các bài thi trắc nghiệm của bạn.
              </p>
            </div>

            <div className="header-actions-group">
              <button
                className="btn-create-primary"
                style={{
                  padding: "12px 20px",
                  fontSize: "0.95rem",
                  whiteSpace: "nowrap",
                  background: "#8b5cf6",
                  boxShadow: "0 4px 10px rgba(139, 92, 246, 0.3)",
                }}
                onClick={() => onNavigate("create-exam")}
              >
                + Soạn đề thi AI
              </button>

              <div className="modern-search-box">
                <i className="fa-solid fa-magnifying-glass"></i>
                <input
                  type="text"
                  placeholder="Tìm kiếm đề thi..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    backgroundColor: "var(--bg-card)",
                    color: "var(--text-dark)",
                    borderColor: "var(--border)",
                  }}
                />
              </div>
              <select
                className="modern-sort-select"
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                style={{
                  backgroundColor: "var(--bg-card)",
                  color: "var(--text-dark)",
                  borderColor: "var(--border)",
                }}
              >
                <option value="name-asc">Sắp xếp: Tên A-Z</option>
                <option value="name-desc">Sắp xếp: Tên Z-A</option>
                <option value="cards-desc">Sắp xếp: Câu hỏi nhiều nhất</option>
                <option value="cards-asc">Sắp xếp: Câu hỏi ít nhất</option>
              </select>
            </div>
          </div>

          <div className="modern-stats-grid">
            <div
              className="modern-stat-card stat-purple"
              style={{
                backgroundColor: "var(--bg-card)",
                borderColor: "var(--border)",
              }}
            >
              <div
                className="stat-icon"
                style={{
                  color: "#8b5cf6",
                  background: "rgba(139, 92, 246, 0.1)",
                }}
              >
                <i className="fa-solid fa-file-invoice"></i>
              </div>
              <div className="stat-info">
                <h2 style={{ color: "var(--text-dark)" }}>{totalDecks}</h2>
                <p style={{ color: "var(--text-gray)" }}>Đề thi</p>
              </div>
            </div>
            <div
              className="modern-stat-card stat-blue"
              style={{
                backgroundColor: "var(--bg-card)",
                borderColor: "var(--border)",
              }}
            >
              <div className="stat-icon">
                <i className="fa-solid fa-list-ol"></i>
              </div>
              <div className="stat-info">
                <h2 style={{ color: "var(--text-dark)" }}>{totalQuestions}</h2>
                <p style={{ color: "var(--text-gray)" }}>Tổng số câu hỏi</p>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div
              className="loading-state"
              style={{
                textAlign: "center",
                padding: "50px",
                color: "var(--text-gray)",
              }}
            >
              <i
                className="fa-solid fa-spinner fa-spin"
                style={{
                  fontSize: "2rem",
                  margin: "0 auto 15px auto",
                  display: "block",
                }}
              ></i>
              <p>Đang tải danh sách đề thi...</p>
            </div>
          ) : sortedDecks.length === 0 ? (
            renderEmptyState()
          ) : (
            <div className="vertical-decks-grid">
              {sortedDecks.map((deck) => {
                const isFavorite = favoriteDecks.includes(deck.id);
                const totalCardsCount = deck.totalCards || 0;

                const dEasy = deck.easyCount || 0;
                const dMedium = deck.mediumCount || 0;
                const dHard = deck.hardCount || 0;

                const originalTitle =
                  deck.title || deck.name || "Đề thi không tên";
                const displayTitle = originalTitle;

                return (
                  <div className="vertical-deck-card" key={deck.id}>
                    <div className="vdc-header">
                      <div
                        className="vdc-icon-main"
                        style={{
                          color: "#8b5cf6",
                          background: "rgba(139, 92, 246, 0.1)",
                        }}
                      >
                        <i className="fa-solid fa-file-contract"></i>
                      </div>
                      <div className="vdc-actions">
                        <button
                          className={`vdc-btn-icon ${isFavorite ? "favorite-active" : ""}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavoriteDeck(deck.id);
                          }}
                          title="Đánh dấu quan trọng"
                        >
                          <i
                            className={
                              isFavorite
                                ? "fa-solid fa-star"
                                : "fa-regular fa-star"
                            }
                          ></i>
                        </button>
                        <button
                          className="vdc-btn-icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            openManageModal(deck);
                          }}
                          title="Cài đặt đề thi"
                        >
                          <i className="fa-solid fa-ellipsis"></i>
                        </button>
                      </div>
                    </div>

                    <div className="vdc-title-wrapper">
                      <h3 className="vdc-title" title={displayTitle}>
                        {displayTitle}
                      </h3>
                    </div>

                    <div
                      className="vdc-stats-grid"
                      style={{ gridTemplateColumns: "1fr", marginTop: "15px" }}
                    >
                      <div
                        className="vdc-stat-box box-blue"
                        style={{
                          background: "rgba(59, 130, 246, 0.05)",
                          border: "1px solid rgba(59, 130, 246, 0.2)",
                        }}
                      >
                        <div className="vdc-stat-icon">
                          <i className="fa-solid fa-list-check"></i>
                        </div>
                        <div className="vdc-stat-val">{totalCardsCount}</div>
                        <div className="vdc-stat-label">Câu hỏi trong đề</div>
                      </div>
                    </div>

                    <div
                      className="vdc-footer"
                      style={{ display: "flex", gap: "8px", marginTop: "20px" }}
                    >
                      <button
                        className="vdc-btn-study"
                        style={{
                          flex: 1,
                          background:
                            "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
                          color: "white",
                          border: "none",
                          boxShadow: "0 4px 12px rgba(139, 92, 246, 0.3)",
                          fontWeight: "700",
                        }}
                        onClick={() =>
                          setExamModal({
                            isOpen: true,
                            deckId: deck.id,
                            deckName: displayTitle,
                            easyCount: dEasy,
                            mediumCount: dMedium,
                            hardCount: dHard,
                            maxEasy: dEasy,
                            maxMedium: dMedium,
                            maxHard: dHard,
                            maxCards: totalCardsCount,
                            mode: "practice",
                            timeLimit: totalCardsCount, // 👉 ĐÃ THÊM: Gợi ý 1 phút/câu
                          })
                        }
                      >
                        📝 Vào Học & Thi
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* POPUP CẤU HÌNH THI CHI TIẾT */}
      {examModal.isOpen && (
        <div className="cram-modal-overlay" style={{ zIndex: 1000 }}>
          <div
            className="cram-modal"
            style={{ padding: "30px", maxWidth: "450px", width: "90%" }}
          >
            <div style={{ textAlign: "center", marginBottom: "20px" }}>
              <div style={{ fontSize: "3rem", marginBottom: "10px" }}>⚙️</div>
              <h3
                style={{
                  color: "var(--text-dark)",
                  fontSize: "1.5rem",
                  fontWeight: "800",
                  margin: 0,
                }}
              >
                Cấu Hình Trước Khi Bắt Đầu
              </h3>
              <p
                style={{
                  color: "var(--text-gray)",
                  marginTop: "5px",
                  fontSize: "0.9rem",
                }}
              >
                {examModal.deckName}
              </p>
            </div>

            <div style={{ marginBottom: "25px" }}>
              <h4
                style={{
                  color: "var(--text-dark)",
                  marginBottom: "12px",
                  fontSize: "0.95rem",
                }}
              >
                1. Chọn chế độ:
              </h4>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  onClick={() =>
                    setExamModal({ ...examModal, mode: "practice" })
                  }
                  style={{
                    flex: 1,
                    padding: "12px",
                    borderRadius: "10px",
                    border:
                      examModal.mode === "practice"
                        ? "2px solid #8b5cf6"
                        : "1px solid var(--border)",
                    backgroundColor:
                      examModal.mode === "practice"
                        ? "rgba(139, 92, 246, 0.1)"
                        : "var(--bg-main)",
                    color:
                      examModal.mode === "practice"
                        ? "#8b5cf6"
                        : "var(--text-gray)",
                    fontWeight: "bold",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "5px",
                  }}
                >
                  <i
                    className="fa-solid fa-book-open-reader"
                    style={{ fontSize: "1.2rem" }}
                  ></i>
                  <span>Ôn Luyện</span>
                </button>
                <button
                  onClick={() => setExamModal({ ...examModal, mode: "exam" })}
                  style={{
                    flex: 1,
                    padding: "12px",
                    borderRadius: "10px",
                    border:
                      examModal.mode === "exam"
                        ? "2px solid #ef4444"
                        : "1px solid var(--border)",
                    backgroundColor:
                      examModal.mode === "exam"
                        ? "rgba(239, 68, 68, 0.1)"
                        : "var(--bg-main)",
                    color:
                      examModal.mode === "exam"
                        ? "#ef4444"
                        : "var(--text-gray)",
                    fontWeight: "bold",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "5px",
                  }}
                >
                  <i
                    className="fa-solid fa-stopwatch"
                    style={{ fontSize: "1.2rem" }}
                  ></i>
                  <span>Kiểm Tra</span>
                </button>
              </div>

              {/* 👉 ĐÃ THÊM: HIỂN THỊ CÀI ĐẶT THỜI GIAN NẾU CHỌN KIỂM TRA */}
              {examModal.mode === "exam" ? (
                <div
                  style={{
                    marginTop: "15px",
                    padding: "12px 15px",
                    backgroundColor: "var(--bg-main)",
                    borderRadius: "10px",
                    border: "1px dashed #ef4444",
                    animation: "fadeIn 0.3s",
                  }}
                >
                  <label
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      color: "var(--text-dark)",
                      fontWeight: "bold",
                    }}
                  >
                    <span>
                      <i
                        className="fa-solid fa-hourglass-half"
                        style={{ color: "#ef4444", marginRight: "8px" }}
                      ></i>
                      Thời gian làm bài:
                    </span>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <input
                        type="number"
                        min="1"
                        max="180"
                        value={examModal.timeLimit}
                        onChange={(e) => {
                          let val = Number(e.target.value);
                          if (val < 1) val = 1;
                          setExamModal({ ...examModal, timeLimit: val });
                        }}
                        style={{
                          width: "70px",
                          padding: "8px",
                          borderRadius: "6px",
                          border: "1px solid var(--border)",
                          textAlign: "center",
                          fontWeight: "bold",
                          color: "#ef4444",
                          outline: "none",
                        }}
                      />
                      <span>phút</span>
                    </div>
                  </label>
                </div>
              ) : (
                <p
                  style={{
                    fontSize: "0.85rem",
                    color: "var(--text-gray)",
                    marginTop: "12px",
                    textAlign: "center",
                    fontStyle: "italic",
                  }}
                >
                  💡 Không giới hạn thời gian. Check kết quả & xem giải thích
                  từng câu.
                </p>
              )}
            </div>

            <div
              style={{
                backgroundColor: "var(--bg-main)",
                padding: "15px",
                borderRadius: "12px",
                marginBottom: "25px",
                border: "1px solid var(--border)",
              }}
            >
              <h4
                style={{
                  color: "var(--text-dark)",
                  marginBottom: "15px",
                  fontSize: "0.95rem",
                  textAlign: "left",
                }}
              >
                2. Phân bổ câu hỏi ({examModal.maxCards} câu có sẵn)
              </h4>

              {/* MỨC ĐỘ DỄ */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "12px",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <label
                    style={{
                      color: "#10b981",
                      fontWeight: "600",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <i className="fa-solid fa-leaf"></i> Mức độ Dễ
                  </label>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-gray)",
                      marginTop: "2px",
                    }}
                  >
                    (Có sẵn: {examModal.maxEasy} câu)
                  </span>
                </div>
                <input
                  type="number"
                  min="0"
                  max={examModal.maxEasy}
                  value={examModal.easyCount}
                  onChange={(e) => {
                    let val = Number(e.target.value);
                    if (val > examModal.maxEasy) val = examModal.maxEasy;
                    if (val < 0) val = 0;
                    setExamModal({ ...examModal, easyCount: val });
                  }}
                  disabled={examModal.maxEasy === 0}
                  style={{
                    width: "80px",
                    padding: "8px",
                    borderRadius: "6px",
                    border: "1px solid var(--border)",
                    textAlign: "center",
                    fontWeight: "bold",
                    backgroundColor:
                      examModal.maxEasy === 0 ? "#e2e8f0" : "white",
                  }}
                />
              </div>

              {/* MỨC ĐỘ VỪA */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "12px",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <label
                    style={{
                      color: "#3b82f6",
                      fontWeight: "600",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <i className="fa-solid fa-water"></i> Mức độ Vừa
                  </label>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-gray)",
                      marginTop: "2px",
                    }}
                  >
                    (Có sẵn: {examModal.maxMedium} câu)
                  </span>
                </div>
                <input
                  type="number"
                  min="0"
                  max={examModal.maxMedium}
                  value={examModal.mediumCount}
                  onChange={(e) => {
                    let val = Number(e.target.value);
                    if (val > examModal.maxMedium) val = examModal.maxMedium;
                    if (val < 0) val = 0;
                    setExamModal({ ...examModal, mediumCount: val });
                  }}
                  disabled={examModal.maxMedium === 0}
                  style={{
                    width: "80px",
                    padding: "8px",
                    borderRadius: "6px",
                    border: "1px solid var(--border)",
                    textAlign: "center",
                    fontWeight: "bold",
                    backgroundColor:
                      examModal.maxMedium === 0 ? "#e2e8f0" : "white",
                  }}
                />
              </div>

              {/* MỨC ĐỘ KHÓ */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <label
                    style={{
                      color: "#ef4444",
                      fontWeight: "600",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <i className="fa-solid fa-fire"></i> Mức độ Khó
                  </label>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-gray)",
                      marginTop: "2px",
                    }}
                  >
                    (Có sẵn: {examModal.maxHard} câu)
                  </span>
                </div>
                <input
                  type="number"
                  min="0"
                  max={examModal.maxHard}
                  value={examModal.hardCount}
                  onChange={(e) => {
                    let val = Number(e.target.value);
                    if (val > examModal.maxHard) val = examModal.maxHard;
                    if (val < 0) val = 0;
                    setExamModal({ ...examModal, hardCount: val });
                  }}
                  disabled={examModal.maxHard === 0}
                  style={{
                    width: "80px",
                    padding: "8px",
                    borderRadius: "6px",
                    border: "1px solid var(--border)",
                    textAlign: "center",
                    fontWeight: "bold",
                    backgroundColor:
                      examModal.maxHard === 0 ? "#e2e8f0" : "white",
                  }}
                />
              </div>
            </div>

            <div
              style={{
                textAlign: "center",
                marginBottom: "25px",
                color: "var(--text-gray)",
              }}
            >
              Tổng số câu đã chọn:{" "}
              <strong style={{ color: "#8b5cf6", fontSize: "1.2rem" }}>
                {currentTotal}
              </strong>
            </div>

            <div style={{ display: "flex", gap: "15px" }}>
              <button
                style={{
                  flex: 1,
                  padding: "14px",
                  background: "var(--bg-main)",
                  border: "1px solid var(--border)",
                  borderRadius: "12px",
                  color: "var(--text-dark)",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
                onClick={() => setExamModal({ ...examModal, isOpen: false })}
              >
                Hủy
              </button>
              <button
                style={{
                  flex: 1,
                  padding: "14px",
                  background:
                    examModal.mode === "practice" ? "#8b5cf6" : "#ef4444",
                  border: "none",
                  borderRadius: "12px",
                  color: "white",
                  fontWeight: "700",
                  cursor: "pointer",
                  boxShadow:
                    examModal.mode === "practice"
                      ? "0 4px 12px rgba(139, 92, 246, 0.3)"
                      : "0 4px 12px rgba(239, 68, 68, 0.3)",
                }}
                onClick={() => {
                  if (currentTotal === 0) {
                    alert("Vui lòng chọn ít nhất 1 câu hỏi để bắt đầu!");
                    return;
                  }

                  // 👉 ĐÃ THÊM: Lưu timeLimit vào LocalStorage
                  localStorage.setItem(
                    "fmn_exam_config",
                    JSON.stringify({
                      easyCount: examModal.easyCount,
                      mediumCount: examModal.mediumCount,
                      hardCount: examModal.hardCount,
                      mode: examModal.mode,
                      timeLimit: examModal.timeLimit, // Truyền số phút sang ExamPage
                    }),
                  );
                  setExamModal({ ...examModal, isOpen: false });
                  if (onExam) onExam(examModal.deckId);
                }}
              >
                Bắt đầu{" "}
                {examModal.mode === "practice" ? "Ôn Luyện 🧠" : "Thi Thử ⏳"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ManageDeckModal
        isOpen={isManageModalOpen}
        onClose={() => {
          setIsManageModalOpen(false);
          setIsLoading(true);
          fetchDecksData();
        }}
        selectedDeck={selectedDeck}
        onRefreshDecks={() => {
          setIsLoading(true);
          fetchDecksData();
        }}
      />
    </div>
  );
};

export default MyExamsPage;
