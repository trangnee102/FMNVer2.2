import { useState, useEffect } from "react";
import Sidebar from "../components/Layout/Sidebar";
import DiscoveryTab from "../components/Community/DiscoveryTab";
import LeaderboardTab from "../components/Community/LeaderboardTab";
import ChatTab from "../components/Community/ChatTab";
import "./DashboardPage.css";
import "./CommunityPage.css";

const CommunityPage = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState("explore");

  // 👉 BƯỚC QUAN TRỌNG: Lắng nghe tín hiệu từ Sidebar để tự động chuyển Tab
  useEffect(() => {
    const handleTabChange = (event) => {
      // event.detail chính là cái subId ('explore', 'leaderboard', 'contacts') được gửi từ Sidebar
      setActiveTab(event.detail);
    };

    // Bật radar lắng nghe tín hiệu "changeCommunityTab"
    window.addEventListener("changeCommunityTab", handleTabChange);

    // Tắt radar khi rời khỏi trang để tránh lỗi rò rỉ bộ nhớ
    return () => {
      window.removeEventListener("changeCommunityTab", handleTabChange);
    };
  }, []);

  return (
    <div className="dashboard-layout">
      <Sidebar currentView="community" onNavigate={onNavigate} />
      <main
        className="dashboard-content"
        style={{ backgroundColor: "#f8fafc" }}
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "30px" }}>
          {/* Header & Streak */}
          <header
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "30px",
            }}
          >
            <h1>
              <i className="fa-solid fa-users-rays"></i> Cộng đồng
            </h1>
            <div className="streak-widget">
              <i className="fa-solid fa-fire"></i> <span>12 Ngày</span>
            </div>
          </header>

          {/* 
            ĐÃ XÓA THANH ĐIỀU HƯỚNG (.community-nav) CŨ Ở ĐÂY. 
            Giờ giao diện sẽ vô cùng gọn gàng, điều hướng hoàn toàn bằng Sidebar!
          */}

          {/* Nội dung Tab hiển thị tùy theo activeTab */}
          <div className="tab-container">
            {activeTab === "explore" && <DiscoveryTab />}
            {activeTab === "leaderboard" && <LeaderboardTab />}
            {activeTab === "contacts" && <ChatTab />}
          </div>
        </div>
      </main>
    </div>
  );
};

export default CommunityPage;
