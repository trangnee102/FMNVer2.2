import React, { useState, useEffect, useCallback } from "react";
import Sidebar from "../Layout/Sidebar";
import api from "../../services/api";
import "../../pages/ReviewPage.css";

const ReviewDashboard = ({ onNavigate }) => {
  const [decks, setDecks] = useState([]);
  const [exams, setExams] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeMainTab, setActiveMainTab] = useState("flashcard");

  const fetchAllData = useCallback(async () => {
    try {
      const todayString = new Date().toISOString().split("T")[0];
      const t = new Date().getTime();

      const [decksRes, examsRes, summaryRes] = await Promise.all([
        api.get(`/decks?t=${t}`).catch(() => []),
        api.get(`/decks?type=exam&t=${t}`).catch(() => []),
        api
          .get(
            `/dashboard/summary?currentDate=${encodeURIComponent(todayString)}&t=${t}`,
          )
          .catch(() => null),
      ]);

      let rawDecks = decksRes.success
        ? decksRes.data || []
        : Array.isArray(decksRes)
          ? decksRes
          : [];
      let rawExams = examsRes.success
        ? examsRes.data || []
        : Array.isArray(examsRes)
          ? examsRes
          : [];

      if (Array.isArray(rawDecks) && rawDecks.length > 0) {
        const examsOnly = rawDecks.filter(
          (d) =>
            d.type === "exam" ||
            d.is_exam ||
            d.is_exam === 1 ||
            d.is_exam === true,
        );
        const flashcardsOnly = rawDecks.filter(
          (d) =>
            !(
              d.type === "exam" ||
              d.is_exam ||
              d.is_exam === 1 ||
              d.is_exam === true
            ),
        );
        if (examsOnly.length > 0 && rawExams.length === 0) rawExams = examsOnly;
        if (flashcardsOnly.length > 0) rawDecks = flashcardsOnly;
      }

      const summaryData =
        summaryRes && summaryRes.success !== false
          ? summaryRes.data || summaryRes
          : null;
      const summaryDecks = summaryData?.decks || [];

      const augmentedDecks = rawDecks.map((deck) => {
        const sDeck = summaryDecks.find((sd) => sd.id === deck.id) || {};
        const totalCards =
          sDeck.totalCards ??
          sDeck._count?.Flashcards ??
          deck.totalCards ??
          deck.cards?.length ??
          deck._count?.Flashcards ??
          0;
        let dueCount =
          sDeck.dueCount ??
          sDeck.dueCards ??
          deck.dueCount ??
          deck.dueCards ??
          0;
        let masteredCount =
          sDeck.masteredCount ??
          sDeck.masteredCards ??
          deck.masteredCount ??
          deck.masteredCards ??
          0;
        let overdueCount = sDeck.overdueCount ?? deck.overdueCount ?? 0;

        if (masteredCount === 0 && totalCards > 0) {
          masteredCount = Math.max(0, totalCards - dueCount - overdueCount);
        }

        return {
          ...deck,
          totalCards,
          masteredCount,
          dueCount,
          overdueCount,
        };
      });

      setDecks(augmentedDecks);
      setExams(rawExams);
    } catch (error) {
      console.error("Lỗi tải dữ liệu ôn tập:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const handleStudyClick = (deckId) => {
    const targetDeck = decks.find((d) => d.id === deckId);
    if (!targetDeck) return;
    if (targetDeck.totalCards === 0) {
      if (onNavigate) onNavigate("create");
      return;
    }
    if (onNavigate) onNavigate("review", deckId);
  };

  const handleCramClick = (deckId) => {
    if (onNavigate) onNavigate("cram-review", deckId);
  };

  const handleExamCramClick = (examId) => {
    if (onNavigate) onNavigate("cram-review", examId);
  };

  const totalCardsCount = decks.reduce(
    (sum, d) => sum + (d.totalCards || 0),
    0,
  );
  const totalDue = decks.reduce((sum, d) => sum + (d.dueCount || 0), 0);
  const totalExamsDue = exams.length;

  return (
    <div className="dashboard-layout">
      <Sidebar currentView="review" onNavigate={onNavigate} />
      <main
        className="dashboard-content scrollable-content"
        style={{
          backgroundColor: "var(--bg-main)",
          overflowY: "auto",
          height: "100vh",
        }}
      >
        <div
          className="page-wrapper"
          style={{ width: "100%", margin: "0 auto", padding: "30px 40px", boxSizing: "border-box" }}
        >
          <div
            className="modern-page-header"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "30px",
            }}
          >
            <div className="header-title-group">
              <h1
                style={{
                  color: "var(--text-dark)",
                  fontSize: "2rem",
                  fontWeight: "800",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  margin: 0,
                }}
              >
                Ôn tập 🧠
              </h1>
              <p
                style={{
                  color: "var(--text-gray)",
                  marginTop: "5px",
                  margin: 0,
                }}
              >
                Tiếp tục học với các bộ thẻ và luyện đề đến hạn hôm nay.
              </p>
            </div>
            <div
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                padding: "10px 18px",
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontWeight: "700",
                color: "var(--text-dark)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
              }}
            >
              <i
                className="fa-regular fa-calendar"
                style={{ color: "#4f46e5" }}
              ></i>{" "}
              Hôm nay
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "20px",
              marginBottom: "35px",
            }}
          >
            <div
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "16px",
                padding: "24px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                boxShadow: "0 4px 15px rgba(0,0,0,0.02)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    color: "var(--text-gray)",
                    fontWeight: "600",
                    fontSize: "0.95rem",
                  }}
                >
                  Flashcard
                </span>
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "10px",
                    background: "rgba(79, 70, 229, 0.1)",
                    color: "#4f46e5",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.2rem",
                  }}
                >
                  <i className="fa-solid fa-layer-group"></i>
                </div>
              </div>
              <div
                style={{
                  fontSize: "2rem",
                  fontWeight: "900",
                  color: "var(--text-dark)",
                  lineHeight: 1,
                }}
              >
                {totalDue}
              </div>
              <div style={{ fontSize: "0.85rem", color: "var(--text-gray)" }}>
                thẻ đến hạn
              </div>
              <div
                style={{
                  width: "100%",
                  height: "6px",
                  background: "var(--border)",
                  borderRadius: "3px",
                  overflow: "hidden",
                  marginTop: "4px",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${totalCardsCount > 0 ? Math.round((totalDue / totalCardsCount) * 100) : 0}%`,
                    background: "#4f46e5",
                  }}
                ></div>
              </div>
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "var(--text-gray)",
                  marginTop: "2px",
                }}
              >
                Trong tổng số {totalCardsCount} thẻ
              </div>
            </div>

            <div
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "16px",
                padding: "24px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                boxShadow: "0 4px 15px rgba(0,0,0,0.02)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    color: "var(--text-gray)",
                    fontWeight: "600",
                    fontSize: "0.95rem",
                  }}
                >
                  Bộ đề thi
                </span>
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "10px",
                    background: "rgba(16, 185, 129, 0.1)",
                    color: "#10b981",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.2rem",
                  }}
                >
                  <i className="fa-solid fa-file-lines"></i>
                </div>
              </div>
              <div
                style={{
                  fontSize: "2rem",
                  fontWeight: "900",
                  color: "var(--text-dark)",
                  lineHeight: 1,
                }}
              >
                {totalExamsDue}
              </div>
              <div style={{ fontSize: "0.85rem", color: "var(--text-gray)" }}>
                đề đến hạn
              </div>
              <div
                style={{
                  width: "100%",
                  height: "6px",
                  background: "var(--border)",
                  borderRadius: "3px",
                  overflow: "hidden",
                  marginTop: "4px",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: "100%",
                    background: "#10b981",
                  }}
                ></div>
              </div>
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "var(--text-gray)",
                  marginTop: "2px",
                }}
              >
                Trong tổng số {exams.length} đề
              </div>
            </div>
          </div>

          <div>
            <div
              style={{
                display: "flex",
                gap: "15px",
                marginBottom: "20px",
                borderBottom: "1px solid var(--border)",
                paddingBottom: "10px",
              }}
            >
              <button
                onClick={() => setActiveMainTab("flashcard")}
                style={{
                  background:
                    activeMainTab === "flashcard"
                      ? "var(--primary)"
                      : "transparent",
                  color:
                    activeMainTab === "flashcard"
                      ? "white"
                      : "var(--text-gray)",
                  border: "none",
                  padding: "10px 22px",
                  borderRadius: "10px",
                  fontWeight: "700",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                Ôn Flashcard ({decks.length})
              </button>
              <button
                onClick={() => setActiveMainTab("exam")}
                style={{
                  background:
                    activeMainTab === "exam"
                      ? "var(--primary)"
                      : "transparent",
                  color:
                    activeMainTab === "exam" ? "white" : "var(--text-gray)",
                  border: "none",
                  padding: "10px 22px",
                  borderRadius: "10px",
                  fontWeight: "700",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                Luyện đề thi ({exams.length})
              </button>
            </div>

            {isLoading ? (
              <div
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
                <p>Đang tải dữ liệu...</p>
              </div>
            ) : activeMainTab === "flashcard" ? (
              decks.length === 0 ? (
                <div
                  style={{
                    background: "var(--bg-card)",
                    padding: "40px",
                    borderRadius: "16px",
                    textAlign: "center",
                    border: "1px solid var(--border)",
                  }}
                >
                  <h3 style={{ color: "var(--text-dark)" }}>
                    Không có bộ thẻ nào
                  </h3>
                  <p style={{ color: "var(--text-gray)" }}>
                    Bạn chưa tạo bộ thẻ nào trong hệ thống.
                  </p>
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "15px",
                  }}
                >
                  <h3
                    style={{
                      color: "var(--text-dark)",
                      fontSize: "1.1rem",
                      fontWeight: "800",
                      margin: "0 0 5px 0",
                    }}
                  >
                    Thẻ cần ôn hôm nay
                  </h3>
                  {decks.map((deck) => {
                    const total = deck.totalCards || 0;
                    const mastered = deck.masteredCount || 0;
                    const progress =
                      total === 0 ? 0 : Math.round((mastered / total) * 100);
                    const originalTitle =
                      deck.title || deck.name || "Bộ thẻ không tên";
                    const cleanTitle = originalTitle
                      .replace(/\(ai generated\)/i, "")
                      .trim();

                    return (
                      <div
                        key={deck.id}
                        style={{
                          background: "var(--bg-card)",
                          border: "1px solid var(--border)",
                          borderRadius: "16px",
                          padding: "20px 25px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "20px",
                          boxShadow: "0 2px 10px rgba(0,0,0,0.02)",
                          width: "100%",
                          boxSizing: "border-box",
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h4
                            style={{
                              color: "var(--text-dark)",
                              margin: "0 0 10px 0",
                              fontSize: "1.1rem",
                              fontWeight: "700",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {cleanTitle}
                          </h4>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "15px",
                            }}
                          >
                            <div
                              style={{
                                flex: 1,
                                height: "8px",
                                background: "var(--border)",
                                borderRadius: "6px",
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  height: "100%",
                                  width: `${progress}%`,
                                  background: "var(--primary)",
                                }}
                              ></div>
                            </div>
                            <span
                              style={{
                                fontSize: "0.85rem",
                                fontWeight: "700",
                                color: "var(--text-dark)",
                                minWidth: "65px",
                                textAlign: "right",
                              }}
                            >
                              {mastered} / {total} thẻ
                            </span>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: "10px", flexShrink: 0 }}>
                          <button
                            style={{
                              background: "var(--bg-main)",
                              color: "var(--text-dark)",
                              border: "1px solid var(--border)",
                              padding: "10px 16px",
                              borderRadius: "10px",
                              fontWeight: "600",
                              cursor: "pointer",
                              whiteSpace: "nowrap",
                            }}
                            onClick={() => handleStudyClick(deck.id)}
                          >
                            Ôn ngay
                          </button>

                          <button
                            style={{
                              background:
                                "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                              color: "white",
                              border: "none",
                              padding: "10px 16px",
                              borderRadius: "10px",
                              fontWeight: "700",
                              cursor: "pointer",
                              whiteSpace: "nowrap",
                              boxShadow: "0 4px 10px rgba(245, 158, 11, 0.3)",
                            }}
                            onClick={() => handleCramClick(deck.id)}
                          >
                            🔥 Lò luyện
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : exams.length === 0 ? (
              <div
                style={{
                  background: "var(--bg-card)",
                  padding: "40px",
                  borderRadius: "16px",
                  textAlign: "center",
                  border: "1px solid var(--border)",
                }}
              >
                <h3 style={{ color: "var(--text-dark)" }}>
                  Chưa có bộ đề thi nào
                </h3>
                <p style={{ color: "var(--text-gray)" }}>
                  Hãy tạo bộ đề thi mới trong mục Tạo đề thi.
                </p>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "15px",
                }}
              >
                <h3
                  style={{
                    color: "var(--text-dark)",
                    fontSize: "1.1rem",
                    fontWeight: "800",
                    margin: "0 0 5px 0",
                  }}
                >
                  Đề thi cần luyện hôm nay
                </h3>
                {exams.map((exam) => {
                  const examTitle = (exam.title || exam.name || "Đề thi")
                    .replace(/\(ai generated\)/i, "")
                    .trim();
                  return (
                    <div
                      key={exam.id}
                      style={{
                        background: "var(--bg-card)",
                        border: "1px solid var(--border)",
                        borderRadius: "16px",
                        padding: "20px 25px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "20px",
                        boxShadow: "0 2px 10px rgba(0,0,0,0.02)",
                        width: "100%",
                        boxSizing: "border-box",
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            marginBottom: "6px",
                          }}
                        >
                          <i
                            className="fa-solid fa-file-invoice"
                            style={{ color: "#10b981" }}
                          ></i>
                          <h4
                            style={{
                              color: "var(--text-dark)",
                              margin: 0,
                              fontSize: "1.1rem",
                              fontWeight: "700",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {examTitle}
                          </h4>
                        </div>
                        <p
                          style={{
                            margin: 0,
                            color: "var(--text-gray)",
                            fontSize: "0.85rem",
                          }}
                        >
                          Độ khó: {exam.difficulty || "Trung bình"} •{" "}
                          {exam.totalQuestions || exam.cards?.length || 0} câu
                          hỏi
                        </p>
                      </div>
                      <div style={{ display: "flex", gap: "10px", flexShrink: 0 }}>
                        <button
                          style={{
                            background: "#8b5cf6",
                            color: "white",
                            border: "none",
                            padding: "10px 16px",
                            borderRadius: "10px",
                            fontWeight: "700",
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                            boxShadow: "0 4px 12px rgba(139, 92, 246, 0.2)",
                          }}
                          onClick={() => {
                            if (onNavigate) onNavigate("quicktest", exam.id);
                          }}
                        >
                          Làm ngay
                        </button>

                        <button
                          style={{
                            background:
                              "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                            color: "white",
                            border: "none",
                            padding: "10px 16px",
                            borderRadius: "10px",
                            fontWeight: "700",
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                            boxShadow: "0 4px 10px rgba(245, 158, 11, 0.3)",
                          }}
                          onClick={() => handleExamCramClick(exam.id)}
                        >
                          🔥 Lò luyện
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ReviewDashboard;