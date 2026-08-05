import React from "react";
import { useParams } from "react-router-dom";
import QuickTestModalManager from "./QuickTestModalManager";
import Sidebar from "../../Layout/Sidebar";
import "../../../pages/Dashboard/DashboardPage.css";

const QuickTestStudentPage = ({ onNavigate }) => {
  const { roomCode } = useParams();

  return (
    <div className="dashboard-layout">
      <Sidebar currentView="community" onNavigate={onNavigate} />
      <main className="dashboard-content" style={{ padding: 0 }}>
        <QuickTestModalManager 
          open={true} 
          initialRole="STUDENT" 
          initialStep="join" 
          isRouteMode={true} 
          roomCode={roomCode}
          onNavigate={onNavigate}
        />
      </main>
    </div>
  );
};

export default QuickTestStudentPage;