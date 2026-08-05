import React from "react";
import { useParams } from "react-router-dom";
import QuickTestModalManager from "./QuickTestModalManager";
import Sidebar from "../../Layout/Sidebar";
import "../../../pages/Dashboard/DashboardPage.css";

const QuickTestHostPage = ({ onNavigate }) => {
  const { roomCode } = useParams();

  return (
    <div className="dashboard-layout">
      <Sidebar currentView="community" onNavigate={onNavigate} />
      <main className="dashboard-content" style={{ padding: 0 }}>
        <QuickTestModalManager
          open={true}
          initialRole="TEACHER"
          initialStep="hostLobby"
          isRouteMode={true}
          roomCode={roomCode}
          onNavigate={onNavigate}
        />
      </main>
    </div>
  );
};

export default QuickTestHostPage;