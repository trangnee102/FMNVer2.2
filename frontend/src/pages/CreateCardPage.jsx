import React from "react";
import Sidebar from "../components/Layout/Sidebar";
import CreateOptionCard from "../components/Cards/CreateOptionCard";
import "./CreateCardPage.css";
import "./DashboardPage.css"; // Kế thừa layout lưới dashboard-layout và dashboard-content

// 👉 1. Thêm onNavigate vào đây để nhận "remote" từ App.jsx
const CreateCardPage = ({ onNavigate }) => {
  return (
    <div className="dashboard-layout">
      {/* 👉 2. Truyền dòng điện onNavigate xuống cho Sidebar và báo cho nó biết đang ở trang "create" */}
      <Sidebar currentView="create" onNavigate={onNavigate} />

      <main className="dashboard-content">
        {/* 👉 Thêm div bọc ngoài để đẩy toàn bộ nội dung ra tâm màn hình */}
        <div className="create-content-wrapper">
          <header className="create-header">
            <h1>Tạo bộ thẻ mới ✨</h1>
            <p>Chọn phương thức tạo thẻ phù hợp với bạn.</p>
          </header>

          <div className="create-page-container">
            {/* Gọi Component Card 1: Tạo Thủ Công (Màu Xanh Dương) */}
            <CreateOptionCard
              icon="fa-pen-to-square"
              title="Tạo thẻ thủ công"
              description="Tự tay nhập từng thuật ngữ và định nghĩa. Phù hợp khi bạn đã có sẵn nội dung ngắn gọn."
              colorVar="--primary"
              // 👉 Cắm phích điện! Bấm vào đây sẽ nhảy sang trang create-manual
              onClick={() => onNavigate("create-manual")}
            />

            {/* Gọi Component Card 2: Tạo bằng AI (Màu Xanh Lá) */}
            <CreateOptionCard
              icon="fa-wand-magic-sparkles"
              title="Tạo thẻ bằng AI"
              description="Tải tài liệu PDF, Word hoặc dán văn bản. AI sẽ tự động trích xuất nội dung và tạo flashcard cho bạn."
              colorVar="--green"
              isSpeed={true} // Bật badge "Siêu tốc"
              // 👉 ĐÃ THÊM: Cắm phích điện! Bấm vào đây sẽ nhảy sang trang AI
              onClick={() => onNavigate("create-ai")}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default CreateCardPage;
