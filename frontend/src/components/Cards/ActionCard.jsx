import React from "react";
import Button from "../common/Button"; // 👉 Đã sửa thành ../ để lùi ra ngoài 1 thư mục

const ActionCard = ({ title, desc, btnText, bgColor, btnVariant }) => {
  return (
    <div
      style={{
        backgroundColor: bgColor,
        padding: "25px",
        borderRadius: "var(--radius-lg)",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      <h4
        style={{
          color: "var(--text-dark)",
          marginBottom: "10px",
          fontSize: "1.1rem",
        }}
      >
        {title}
      </h4>
      <p
        style={{
          color: "var(--text-gray)",
          fontSize: "0.85rem",
          marginBottom: "20px",
          flex: 1,
        }}
      >
        {desc}
      </p>
      <Button text={btnText} variant={btnVariant} fullWidth={true} />
    </div>
  );
};

export default ActionCard;
