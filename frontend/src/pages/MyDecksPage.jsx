import React, { useState, useEffect } from "react";
import Sidebar from "../components/Layout/Sidebar";
import Button from "../components/common/Button";
import StatCard from "../components/Cards/StatCard";
import CramModeModal from "../components/Modals/CramModeModal";
import ManageDeckModal from "../components/Modals/ManageDeckModal";
import api from "../services/api"; // 👉 ĐÃ THÊM: Kẻ vận chuyển ngầm Axios
import "./DashboardPage.css";
import "./MyDecksPage.css";

const MyDecksPage = ({ onNavigate, onStudy }) => {
  const [decks, setDecks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedDeck, setSelectedDeck] = useState(null);
  const [isCramModalOpen, setIsCramModalOpen] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState("grid"); 

  const fetchDecks = async () => {
    try {
      const token = localStorage.getItem("token") || "";
      const res = await fetch("http://localhost:5000/api/decks", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) setDecks(data.data || []);
    } catch (error) {
      console.error("Lỗi khi tải bộ thẻ:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDecks();
  }, []);

  const openCramModal = (deck) => {
    setSelectedDeck(deck);
    setIsCramModalOpen(true);
  };

  const openManageModal = (deck) => {
    setSelectedDeck(deck);
    setIsManageModalOpen(true);
  };

  // 👉 ĐÃ THÊM: Bẫy sự kiện bấm nút Ôn Tập Thường
  const handleStudyClick = async (deckId) => {
    try {
      const token = localStorage.getItem("token") || "";

      // Chớp nhoáng gọi API xem bộ thẻ này còn bài để học không
      const res = await fetch(`http://localhost:5000/api/study/due/${deckId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const dueCount = data.data ? data.data.length : 0;

      if (dueCount === 0) {
        const userWantsToForce = window.confirm(
          "✨ Cậu đã học xong bài môn này rồi!\n\nCậu có muốn 'vượt rào' ôn trước các thẻ chưa đến hạn không?"
        );
        if (userWantsToForce) {
          if (onStudy) onStudy(deckId, true);
          else onNavigate("review", `${deckId}?force=true`);
        }
      } else {
        if (onStudy) onStudy(deckId, false);
        else onNavigate("review", deckId);
      }
    } catch (error) {
      if (onStudy) onStudy(deckId, false);
      else onNavigate("review", deckId);
    }
  };

  // Tính toán dữ liệu chuẩn xác cho Khu vực Thống kê tổng
  const totalDecks = decks.length;
  const totalCards = decks.reduce((sum, deck) => sum + (parseInt(deck.totalCards) || 0), 0);
  const totalDue = decks.reduce((sum, deck) => sum + (parseInt(deck.dueCards) || 0), 0);
  const totalOverdue = 0; 

  return (
    <div className="dashboard-layout">
      <Sidebar currentView="my-decks" onNavigate={onNavigate} />

      <main className="dashboard-content">
        <div className="page-wrapper">
          <header style={{ marginBottom: "30px" }}>
            {/* 👉 ĐÃ SỬA: Đổi tiêu đề trang ở đây */}
            <h1 style={{ color: "#2d3748" }}>Thư viện của tôi 📚</h1>
            <p style={{ color: "#718096" }}>
              Quản lý kho tàng kiến thức của bạn tại đây.
            </p>
          </header>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px", marginBottom: "40px" }}>
            <StatCard icon="fa-layer-group" label="Tổng số bộ thẻ" value={totalDecks} colorClass="bg-blue" />
            <StatCard icon="fa-file-lines" label="Tổng số thẻ" value={totalCards} colorClass="bg-green" />
            <StatCard icon="fa-clock" label="Thẻ cần ôn" value={totalDue} colorClass="bg-orange" />
            <StatCard icon="fa-circle-exclamation" label="Thẻ quá hạn" value={totalOverdue} colorClass="bg-red" />
          </div>

          {isLoading ? (
            <p style={{ textAlign: "center", color: "var(--text-gray)", padding: "40px" }}>
              <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: "10px" }}></i> Đang tải dữ liệu...
            </p>
          ) : (
            <div className={`decks-${viewMode}`} style={{
              display: "grid",
              /* 👉 Ép khung Grid tối ưu cho giao diện Card dọc (Fit 4 thẻ trên màn hình rộng) */
              gridTemplateColumns: viewMode === "grid" ? "repeat(auto-fill, minmax(260px, 1fr))" : "1fr",
              gap: "25px",
              marginBottom: "60px"
            }}>
              
              {decks.filter(d => (d.title || d.name).toLowerCase().includes(searchTerm.toLowerCase())).map((deck) => {
                
                // 👉 TÍNH TOÁN DỮ LIỆU THẺ CHI TIẾT
                const total = parseInt(deck.totalCards) || 0;
                const due = parseInt(deck.dueCards) || 0;
                const mastered = deck.masteredCards !== undefined ? parseInt(deck.masteredCards) : Math.max(0, total - due);
                const overdue = deck.overdueCards !== undefined ? parseInt(deck.overdueCards) : 0;
                
                const isEmpty = total === 0;
                const isCompleted = !isEmpty && due === 0;
                const progress = isEmpty ? 0 : Math.round((mastered / total) * 100);
                const isCramOn = deck.daysLeft !== null && deck.daysLeft !== undefined;

                return (
                  <div key={deck.id} style={{
                    background: "var(--bg-card)", padding: "20px", borderRadius: "16px",
                    border: "1px solid var(--border)", boxShadow: "0 4px 10px rgba(0,0,0,0.03)",
                    transition: "all 0.3s ease", display: "flex", flexDirection: "column", gap: "15px"
                  }}>
                    
                    {/* HÀNG 1: ICON VÀ BADGE (Góc phải) */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{
                        background: "rgba(59, 130, 246, 0.1)", color: "var(--primary)",
                        width: "48px", height: "48px", borderRadius: "14px",
                        display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem"
                      }}>
                        <i className="fa-solid fa-layer-group"></i>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        {isCramOn ? (
                          <div style={{ fontSize: "0.75rem", color: "var(--text-gray)" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "5px", justifyContent: "flex-end", color: "var(--text-dark)", fontWeight: "600" }}>
                              <i className="fa-regular fa-calendar"></i> Thi sau {deck.daysLeft} ngày
                            </div>
                            <div>{new Date(deck.examDateToUse).toLocaleDateString('vi-VN')}</div>
                          </div>
                        ) : isEmpty ? (
                          <span style={{ color: "#10b981", fontWeight: "bold", fontSize: "0.75rem" }}>Mới tạo</span>
                        ) : isCompleted ? (
                          <span style={{ color: "#10b981", fontWeight: "bold", fontSize: "0.75rem" }}>Hoàn thành</span>
                        ) : null}
                      </div>
                    </div>

                    {/* HÀNG 2: TIÊU ĐỀ (Căn giữa nổi bật) */}
                    <h3 style={{ 
                      margin: "5px 0", color: "var(--text-dark)", fontSize: "1.1rem", fontWeight: "700", 
                      textAlign: "center", minHeight: "45px", display: "flex", alignItems: "center", justifyContent: "center",
                      lineHeight: "1.4"
                    }}>
                      {deck.title || deck.name}
                    </h3>

                    {/* HÀNG 3: THANH TIẾN ĐỘ */}
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div style={{ flex: 1, height: "6px", background: "var(--bg-main)", borderRadius: "10px", overflow: "hidden" }}>
                        <div style={{ width: `${progress}%`, height: "100%", background: isCompleted ? "#10b981" : "var(--primary)", borderRadius: "10px", transition: "width 0.5s ease" }}></div>
                      </div>
                      <span style={{ fontSize: "0.85rem", fontWeight: "900", color: "var(--text-dark)" }}>{progress}%</span>
                    </div>

                    {/* HÀNG 4: DANH SÁCH THỐNG KÊ (Icon + Số + Chữ) */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", margin: "10px 0" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "0.85rem", color: "var(--text-gray)" }}>
                        <div style={{ width: "20px", display: "flex", justifyContent: "center", color: "#8b5cf6" }}><i className="fa-solid fa-file-lines"></i></div>
                        <div style={{ fontWeight: "900", color: "var(--text-dark)", width: "30px" }}>{total}</div> <div>Thẻ</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "0.85rem", color: "var(--text-gray)" }}>
                        <div style={{ width: "20px", display: "flex", justifyContent: "center", color: "#10b981" }}><i className="fa-regular fa-square-check"></i></div>
                        <div style={{ fontWeight: "900", color: "var(--text-dark)", width: "30px" }}>{mastered}</div> <div>Đã học</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "0.85rem", color: "var(--text-gray)" }}>
                        <div style={{ width: "20px", display: "flex", justifyContent: "center", color: "#f59e0b" }}><i className="fa-regular fa-clock"></i></div>
                        <div style={{ fontWeight: "900", color: "var(--text-dark)", width: "30px" }}>{due}</div> <div>Cần ôn</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "0.85rem", color: "var(--text-gray)" }}>
                        <div style={{ width: "20px", display: "flex", justifyContent: "center", color: "#ef4444" }}><i className="fa-solid fa-circle-exclamation"></i></div>
                        <div style={{ fontWeight: "900", color: "var(--text-dark)", width: "30px" }}>{overdue}</div> <div>Quá hạn</div>
                      </div>
                    </div>

                    {/* HÀNG 5: NÚT TOGGLE CRAM MODE CHUYÊN NGHIỆP */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid var(--border)", paddingTop: "15px", marginTop: "auto" }}>
                      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                        <i className="fa-solid fa-bolt" style={{ color: isCramOn ? "var(--primary)" : "var(--text-gray)", fontSize: "1.2rem" }}></i>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span style={{ fontSize: "0.85rem", fontWeight: "bold", color: "var(--text-dark)" }}>Cram Mode</span>
                          <span style={{ fontSize: "0.7rem", color: isCramOn ? "#ea580c" : "var(--text-gray)", fontWeight: isCramOn ? "bold" : "normal" }}>
                            {isCramOn ? `Đang bật (Thi sau ${deck.daysLeft} ngày)` : "Chế độ cấp tốc đang tắt"}
                          </span>
                        </div>
                      </div>
                      {/* Nút Gạt Switch */}
                      <div 
                        onClick={() => openCramModal(deck)}
                        style={{ 
                          width: "40px", height: "22px", background: isCramOn ? "var(--primary)" : "var(--border)", 
                          borderRadius: "20px", position: "relative", cursor: "pointer", transition: "0.3s" 
                        }}
                      >
                        <div style={{ 
                          width: "18px", height: "18px", background: "white", borderRadius: "50%", 
                          position: "absolute", top: "2px", left: isCramOn ? "20px" : "2px", transition: "0.3s",
                          boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
                        }}></div>
                      </div>
                    </div>

                    {/* HÀNG 6: NÚT HÀNH ĐỘNG CHÍNH MỚI */}
                    <div style={{ display: "flex", gap: "10px", marginTop: "15px" }}>
                      <div style={{ flex: 1 }}>
                        <Button 
                          text={isEmpty ? "Ôn Luyện" : (isCompleted ? "👁 Xem lại" : "Ôn luyện")} 
                          variant={isEmpty ? "green" : (isCompleted ? "outline" : "primary")} 
                          fullWidth 
                          onClick={() => handleStudyClick(deck.id, total)} 
                        />
                      </div>
                      <button 
                        onClick={() => openManageModal(deck)} 
                        title="Quản lý chi tiết"
                        style={{
                          width: "42px", height: "42px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg-main)", color: "var(--text-gray)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.2s ease"
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.background = "var(--border)"; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = "var(--bg-main)"; }}
                      >
                        <i className="fa-solid fa-gear"></i>
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* CARD TẠO BỘ THẺ MỚI DẠNG DASHED Ở CUỐI CÙNG */}
              <div 
                onClick={() => onNavigate("create")}
                style={{
                  background: "transparent", border: "2px dashed var(--border)", borderRadius: "16px", padding: "20px",
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", 
                  transition: "all 0.3s ease", minHeight: "420px", textAlign: "center"
                }}
                onMouseOver={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.background = "rgba(59, 130, 246, 0.02)"; }}
                onMouseOut={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "transparent"; }}
              >
                <div style={{ width: "60px", height: "60px", background: "var(--primary)", color: "white", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.8rem", marginBottom: "25px", boxShadow: "0 4px 10px rgba(59, 130, 246, 0.3)" }}>
                  <i className="fa-solid fa-plus"></i>
                </div>
                <h3 style={{ color: "var(--text-dark)", fontSize: "1.2rem", marginBottom: "15px", fontWeight: "bold" }}>
                  Tạo bộ thẻ mới
                </h3>
                <p style={{ color: "var(--text-gray)", fontSize: "0.9rem", marginBottom: "30px", lineHeight: "1.5" }}>
                  Bắt đầu tạo bộ thẻ để lưu trữ<br/>kiến thức của bạn.
                </p>
                <Button text="+ Tạo bộ thẻ" variant="outline" onClick={(e) => { e.stopPropagation(); onNavigate("create"); }} />
              </div>

            </div>
          )}
        </div>
      </main>

      <CramModeModal isOpen={isCramModalOpen} onClose={() => setIsCramModalOpen(false)} selectedDeck={selectedDeck} onNavigate={onNavigate} />
      <ManageDeckModal isOpen={isManageModalOpen} onClose={() => setIsManageModalOpen(false)} selectedDeck={selectedDeck} onRefreshDecks={fetchDecks} />
    </div>
  );
};

export default MyDecksPage;