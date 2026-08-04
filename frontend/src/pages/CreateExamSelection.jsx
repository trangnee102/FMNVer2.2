// frontend/src/pages/CreateExamSelection.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
// NHỚ IMPORT FILE CSS NÀY VÀO ĐỂ CÓ GIAO DIỆN
import "./CreateExamSelection.css";

const CreateExamSelection = () => {
  const navigate = useNavigate();

  return (
    <div className="exam-selection-container">
      <h1 className="exam-selection-title">Tạo bộ đề thi mới ✨</h1>
      <p className="exam-selection-subtitle">
        Chọn phương thức tạo đề thi phù hợp với nhu cầu của bạn.
      </p>

      <div className="exam-selection-cards">
        {/* LỰA CHỌN 1: THỦ CÔNG */}
        <div
          onClick={() => navigate("/create-exam/manual")}
          className="exam-selection-card"
        >
          <div className="exam-icon-box icon-manual">
            <i className="fa-solid fa-pen-to-square"></i>
          </div>
          <h2 className="exam-card-title">Tạo đề thủ công</h2>
          <p className="exam-card-desc">
            Tự tay biên soạn từng câu hỏi, thiết lập độ khó và cấu trúc ma trận.
            Phù hợp khi bạn đã có sẵn ngân hàng câu hỏi chi tiết.
          </p>
        </div>

        {/* LỰA CHỌN 2: BẰNG AI */}
        <div
          onClick={() => navigate("/create-exam/ai")}
          className="exam-selection-card"
        >
          <span className="exam-badge">Siêu tốc</span>
          <div className="exam-icon-box icon-ai">
            <i className="fa-solid fa-wand-magic-sparkles"></i>
          </div>
          <h2 className="exam-card-title">Tạo đề bằng AI</h2>
          <p className="exam-card-desc">
            Tải tài liệu PDF, Word hoặc văn bản. AI sẽ tự động phân tích nội
            dung, bám sát ma trận và sinh ra câu hỏi trắc nghiệm cho bạn.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CreateExamSelection;