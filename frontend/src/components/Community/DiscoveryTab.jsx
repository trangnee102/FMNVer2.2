import React, { useState, useEffect } from "react";
import "./DiscoveryTab.css";
import { communityAPI } from "../../services/api";
import Latex from "react-latex-next";
import "katex/dist/katex.min.css";

const DiscoveryTab = () => {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("flashcard");
  const [sortBy, setSortBy] = useState("newest");

  const [decks, setDecks] = useState([]);
  const [exams, setExams] = useState([]);

  const [selectedDeck, setSelectedDeck] = useState(null);
  const [deckDetails, setDeckDetails] = useState([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isCloning, setIsCloning] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    const fetchCommunityData = async () => {
      try {
        const [decksData, examsData] = await Promise.all([
          communityAPI.getDiscoveryDecks ? communityAPI.getDiscoveryDecks().catch(() => []) : Promise.resolve([]),
          communityAPI.getDiscoveryExams ? communityAPI.getDiscoveryExams().catch(() => []) : Promise.resolve([])
        ]);

        const rawDecks = Array.isArray(decksData) ? decksData : decksData.data || [];
        const rawExams = Array.isArray(examsData) ? examsData : examsData.data || [];

        const pureDecks = rawDecks.filter(item => !item.is_exam);
        const pureExams = rawExams.length > 0 ? rawExams.filter(item => item.is_exam) : rawDecks.filter(item => item.is_exam);

        setDecks(pureDecks);
        setExams(pureExams);
      } catch (error) {
        console.error("Lỗi khi tải dữ liệu cộng đồng:", error);
      }
    };

    fetchCommunityData();
  }, [activeTab]);

  const currentListSource = activeTab === "flashcard" ? decks : exams;

  const totalShared = currentListSource.length;
  const totalDownloads = currentListSource.reduce((sum, item) => sum + (item.views || item.downloadCount || item.usedCount || 0), 0);
  const uniqueContributors = new Set(currentListSource.map(item => item.author || item.user?.full_name)).size;

  const handleOpenDeck = async (item) => {
    setSelectedDeck(item);
    setIsLoadingDetails(true);
    try {
      const token = localStorage.getItem("token");
      const isExamItem = activeTab === "exam" || item.is_exam === true;
      const endpoint = isExamItem 
        ? `http://localhost:5000/api/community/exams/${item.id}`
        : `http://localhost:5000/api/community/decks/${item.id}`;

      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (result.success) {
        setDeckDetails(result.data.Flashcards || result.data.questions || result.data.cards || []);
      } else {
        alert("Lỗi: " + result.message);
      }
    } catch (error) {
      alert("Lỗi kết nối khi tải chi tiết nội dung!");
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleCloseModal = () => {
    setSelectedDeck(null);
    setDeckDetails([]);
  };

  const handleCloneDeck = async () => {
    if (!selectedDeck) return;
    setIsCloning(true);
    try {
      const token = localStorage.getItem("token");
      const isExamItem = activeTab === "exam" || selectedDeck.is_exam === true;
      const endpoint = isExamItem
        ? `http://localhost:5000/api/community/exams/${selectedDeck.id}/clone`
        : `http://localhost:5000/api/community/decks/${selectedDeck.id}/clone`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (result.success) {
        alert("🎉 " + result.message);
        handleCloseModal();
        const [decksData, examsData] = await Promise.all([
          communityAPI.getDiscoveryDecks().catch(() => []),
          communityAPI.getDiscoveryExams ? communityAPI.getDiscoveryExams().catch(() => []) : Promise.resolve([])
        ]);
        const rawDecks = Array.isArray(decksData) ? decksData : decksData.data || [];
        const rawExams = Array.isArray(examsData) ? examsData : examsData.data || [];
        setDecks(rawDecks.filter(item => !item.is_exam));
        setExams(rawExams.length > 0 ? rawExams.filter(item => item.is_exam) : rawDecks.filter(item => item.is_exam));
      } else {
        alert("Lỗi: " + result.message);
      }
    } catch (error) {
      alert("Lỗi kết nối khi tải về tài khoản!");
    } finally {
      setIsCloning(false);
    }
  };

  const renderMath = (text) => {
    if (!text) return "";
    let processedText = text.replace(/\\\\/g, "\\");
    return <Latex>{processedText}</Latex>;
  };

  const filterAndSortData = (list) => {
    return list
      .filter((item) => {
        const titleMatch = (item.title || item.name || "").toLowerCase().includes(search.toLowerCase());
        return titleMatch;
      })
      .sort((a, b) => {
        if (sortBy === "newest") return new Date(b.created_at || b.updatedAt || 0) - new Date(a.created_at || a.updatedAt || 0);
        if (sortBy === "popular" || sortBy === "downloads") return (b.views || b.downloadCount || 0) - (a.views || a.downloadCount || 0);
        if (sortBy === "az") return (a.title || a.name || "").localeCompare(b.title || b.name || "");
        return 0;
      });
  };

  const currentList = filterAndSortData(currentListSource);
  const totalPages = Math.ceil(currentList.length / itemsPerPage) || 1;
  const paginatedData = currentList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="discovery-tab">
      <div className="discovery-header-section">
        <h2>Khám phá</h2>
        <p>Tìm kiếm và sử dụng các bộ Flashcard và bộ đề được cộng đồng chia sẻ.</p>
      </div>

      <div className="discovery-search-filter-wrapper">
        <div className="search-bar">
          <i className="fa-solid fa-magnifying-glass"></i>
          <input
            placeholder="Tìm kiếm bộ Flashcard hoặc bộ đề..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      <div className="discovery-tabs-navigation">
        <button
          className={`tab-nav-btn ${activeTab === "flashcard" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("flashcard");
            setCurrentPage(1);
          }}
        >
          Bộ thẻ Flashcard
        </button>
        <button
          className={`tab-nav-btn ${activeTab === "exam" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("exam");
            setCurrentPage(1);
          }}
        >
          Bộ đề thi
        </button>
      </div>

      <div className="stats-cards-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <div className="stat-card-item">
          <div className="stat-card-icon blue"><i className="fa-solid fa-layer-group"></i></div>
          <div className="stat-card-info">
            <span className="stat-card-value">{totalShared}</span>
            <span className="stat-card-label">Tổng bộ chia sẻ</span>
          </div>
        </div>
        <div className="stat-card-item">
          <div className="stat-card-icon green"><i className="fa-solid fa-cloud-arrow-down"></i></div>
          <div className="stat-card-info">
            <span className="stat-card-value">{totalDownloads}</span>
            <span className="stat-card-label">Lượt tải</span>
          </div>
        </div>
        <div className="stat-card-item">
          <div className="stat-card-icon purple"><i className="fa-solid fa-users"></i></div>
          <div className="stat-card-info">
            <span className="stat-card-value">{uniqueContributors}</span>
            <span className="stat-card-label">Người chia sẻ</span>
          </div>
        </div>
      </div>

      <div className="advanced-filters-toolbar">
        <div className="dropdown-filter-item">
          <span>Sắp xếp:</span>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="newest">Mới nhất</option>
            <option value="popular">Phổ biến</option>
            <option value="downloads">Lượt tải nhiều</option>
            <option value="az">Tên A-Z</option>
          </select>
        </div>
      </div>

      <div className="discovery-table-card">
        {paginatedData.length > 0 ? (
          <div className="table-responsive">
            <table className="community-data-table">
              <thead>
                <tr>
                  <th>{activeTab === "flashcard" ? "Bộ thẻ" : "Bộ đề thi"}</th>
                  <th>Người chia sẻ</th>
                  <th>Ngày cập nhật</th>
                  <th>Lượt tải</th>
                  <th>{activeTab === "flashcard" ? "Số thẻ" : "Số câu"}</th>
                  <th style={{ textAlign: "right" }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((item) => {
                  const title = item.title || item.name || "Không tên";
                  const cleanName = title.replace(/\(ai generated\)/i, "").trim();
                  const authorName = item.author || item.user?.full_name || "Thành viên";
                  const dateStr = item.updatedAt ? new Date(item.updatedAt).toLocaleDateString("vi-VN") : "Gần đây";
                  const downloads = item.views || item.downloadCount || item.usedCount || 0;
                  const countNumber = item.cards || item.totalQuestions || item._count?.Flashcards || 0;

                  return (
                    <tr key={item.id}>
                      <td>
                        <div className="table-row-title">
                          <i className={`fa-solid ${activeTab === "flashcard" ? "fa-layer-group" : "fa-file-lines"} row-type-icon`}></i>
                          <span>{cleanName}</span>
                        </div>
                      </td>
                      <td>{authorName}</td>
                      <td>{dateStr}</td>
                      <td>{downloads}</td>
                      <td>{countNumber}</td>
                      <td style={{ textAlign: "right" }}>
                        <button className="btn-view-details" onClick={() => handleOpenDeck(item)}>
                          Xem chi tiết
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-community-state">
            <i className="fa-regular fa-folder-open"></i>
            <p>Hiện chưa có dữ liệu.</p>
            <button className="btn-refresh-data" onClick={() => window.location.reload()}>
              Làm mới
            </button>
          </div>
        )}
      </div>

      <div className="pagination-footer-bar">
        <div className="pagination-info">
          Hiển thị {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, currentList.length)} của {currentList.length} kết quả
        </div>
        <div className="pagination-controls">
          <button
            className="page-nav-btn"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
          >
            &lt;
          </button>
          {Array.from({ length: totalPages }).map((_, idx) => (
            <button
              key={idx + 1}
              className={`page-number-btn ${currentPage === idx + 1 ? "active" : ""}`}
              onClick={() => setCurrentPage(idx + 1)}
            >
              {idx + 1}
            </button>
          ))}
          <button
            className="page-nav-btn"
            disabled={currentPage === totalPages || totalPages === 0}
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
          >
            &gt;
          </button>
          <select
            className="items-per-page-select"
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
          >
            <option value={10}>10 / trang</option>
            <option value={20}>20 / trang</option>
            <option value={50}>50 / trang</option>
            <option value={100}>100 / trang</option>
          </select>
        </div>
      </div>

      {selectedDeck && (
        <div className="community-modal-overlay">
          <div className="community-modal-content">
            <div className="community-modal-header">
              <div>
                <h2>{selectedDeck.title || selectedDeck.name}</h2>
                <span><i className="fa-solid fa-user"></i> Tác giả: {selectedDeck.author || selectedDeck.user?.full_name || "Thành viên"}</span>
              </div>
              <button className="community-modal-close" onClick={handleCloseModal}>&times;</button>
            </div>

            <div className="community-modal-body">
              {isLoadingDetails ? (
                <div className="modal-loading-box">
                  <i className="fa-solid fa-spinner fa-spin"></i>
                  <p>Đang tải nội dung chi tiết...</p>
                </div>
              ) : deckDetails.length > 0 ? (
                deckDetails.map((card, idx) => (
                  <div key={idx} className="modal-card-item">
                    <div className="modal-card-question">
                      <strong>Hỏi:</strong> <span>{renderMath(card.question || card.front_content)}</span>
                    </div>
                    <div className="modal-card-answer">
                      <strong>Đáp:</strong> <span>{renderMath(card.answer || card.back_content || card.correct_answers)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="modal-empty-box">
                  <i className="fa-regular fa-folder-open"></i>
                  <p>Bộ này không có nội dung thẻ hoặc câu hỏi.</p>
                </div>
              )}
            </div>

            <div className="community-modal-footer">
              <button className="btn-modal-cancel" onClick={handleCloseModal}>Đóng</button>
              <button className="btn-modal-download" onClick={handleCloneDeck} disabled={isCloning || deckDetails.length === 0}>
                {isCloning ? <><i className="fa-solid fa-spinner fa-spin"></i> Đang tải...</> : <><i className="fa-solid fa-cloud-arrow-down"></i> Tải về thư viện</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiscoveryTab;