import React, { useState, useRef, useEffect } from "react";
import Sidebar from "../../../components/Layout/Sidebar";
import CreateFlashcardForm from "../../../components/Forms/CreateFlashcardForm";

// 👉 ĐÃ FIX: Lùi ra 3 cấp thư mục để tìm đúng file DashboardPage.css trong thư mục Dashboard
import "../../../pages/Dashboard/DashboardPage.css";
import "./CreateCardPage.css";
const CreateFlashcardManualPage = ({ onNavigate }) => {
  return (
    <div className="dashboard-layout">
      {/* Vẫn giữ Sidebar và cho nó biết đang ở luồng "create" */}
      <Sidebar currentView="create" onNavigate={onNavigate} />

      <main className="dashboard-content">
        <div
          className="create-content-wrapper"
          style={{ justifyContent: "flex-start", paddingTop: "5vh" }}
        >
          <header className="create-header" style={{ marginBottom: "30px" }}>
            {/* 👉 ĐÃ SỬA: Xóa Emoji ✍️, thay bằng Icon FontAwesome màu xanh dương */}
            <h1>
              Tạo thẻ thủ công{" "}
              <i
                className="fa-solid fa-pen-to-square"
                style={{ color: "var(--primary)", marginLeft: "8px" }}
              ></i>
            </h1>
            {/* 👉 ĐÃ SỬA: Thay mã màu cứng thành biến màu hệ thống để đổi màu mượt mà */}
            <p style={{ color: "var(--text-gray)" }}>
              Nhập chi tiết từng mặt thẻ để thêm vào bộ nhớ của bạn.
            </p>
          </header>

          {/* Gọi cái Form cậu vừa code ra đây. Nếu bấm nút Hủy thì quay về trang Chọn phương thức */}
          <CreateFlashcardForm onCancel={() => onNavigate("create")} />
        </div>
      </main>
    </div>
  );
};

export default CreateFlashcardManualPage;