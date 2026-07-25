import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom"; // 👉 ĐÃ THÊM: Import thư viện định tuyến
import "./index.css";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    {/* 👉 ĐÃ THÊM: Bọc BrowserRouter ra ngoài cùng để quản lý URL cho toàn dự án */}
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
