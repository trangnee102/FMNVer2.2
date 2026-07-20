import React from "react";
import "./CreateOptionCard.css";

// 👉 1. Đã sửa: Nhận thêm prop onClick từ trang cha truyền xuống
const CreateOptionCard = ({
  icon,
  title,
  description,
  colorVar,
  isSpeed,
  onClick,
}) => {
  return (
    <div
      className="create-option-card"
      // 💡 Trick xịn: Truyền tên biến màu (VD: --primary, --green) từ Props vào CSS
      style={{ "--card-color": `var(${colorVar})` }}
      onClick={onClick} // 👉 2. Đã sửa: Kích hoạt mạch điện, khi bấm vào thẻ sẽ chạy hàm này
    >
      {/* Nếu isSpeed = true thì mới hiện cục badge này */}
      {isSpeed && <div className="badge-speed">Siêu tốc</div>}

      <div className="option-icon-wrapper">
        <i className={`fa-solid ${icon}`}></i>
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
};

export default CreateOptionCard;
