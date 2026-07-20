import React from "react";

const DashboardHeader = ({ userName }) => {
  return (
    <header className="content-header">
      <h1>Xin chào, {userName}! 👋</h1>
      <p>Hôm nay là một ngày tuyệt vời để học tập.</p>
    </header>
  );
};

export default DashboardHeader;
