import { useState, useEffect } from "react";
import Sidebar from "../components/Layout/Sidebar";
import DiscoveryTab from "../components/Community/DiscoveryTab";
import LeaderboardTab from "../components/Community/LeaderboardTab";
import ChatTab from "../components/Community/ChatTab";
import "./DashboardPage.css";
import "./CommunityPage.css";

const CommunityPage = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState("explore");

  useEffect(() => {
    const handleTabChange = (event) => {
      setActiveTab(event.detail);
    };

    window.addEventListener("changeCommunityTab", handleTabChange);

    return () => {
      window.removeEventListener("changeCommunityTab", handleTabChange);
    };
  }, []);

  return (
    <div className="dashboard-layout">
      <Sidebar currentView="community" onNavigate={onNavigate} />
      <main className="dashboard-content">
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "30px" }}>
          <header
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "30px",
            }}
          >
            <h1 style={{ color: "var(--text-dark)", transition: "color 0.3s ease" }}>
              <i className="fa-solid fa-users-rays"></i> Cộng đồng,nơi giao lưu với những thiên tài
            </h1>
            
          </header>

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