// src/components/common/Button.jsx
import React from "react";
import "./Button.css"; // Gọi bộ áo riêng của nút vào

const Button = ({
  text,
  onClick,
  variant = "primary", // Mặc định là nút màu Xanh dương chính
  icon,
  fullWidth = false, // Nút có dài hết cỡ hay không
  className = "",
}) => {
  return (
    <button
      className={`btn-common btn-${variant} ${fullWidth ? "btn-full" : ""} ${className}`}
      onClick={onClick}
    >
      {/* Nếu truyền icon vào thì hiển thị icon */}
      {icon && <span className="btn-icon">{icon}</span>}
      {text}
    </button>
  );
};

export default Button;
