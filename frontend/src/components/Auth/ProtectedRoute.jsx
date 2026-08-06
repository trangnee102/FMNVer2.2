import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import AIMentorChat from "../Study/AIMentorChat";

// Không hiện AI Mentor khi đang thi/kiểm tra để tránh gợi ý đáp án khi làm bài.
const MENTOR_HIDDEN_ROUTES = ["/exam"];

const ProtectedRoute = () => {
  const location = useLocation();
  // Thò tay vào túi kiểm tra xem có thẻ căn cước (Token) không
  const token = localStorage.getItem("token");

  // Nếu KHÔNG có token -> Trục xuất về trang Login
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const isMentorHidden = MENTOR_HIDDEN_ROUTES.includes(location.pathname);

  // Nếu CÓ token -> Hợp lệ, mở cửa cho phép đi tiếp vào các trang bên trong
  return (
    <>
      <Outlet />
      {!isMentorHidden && <AIMentorChat />}
    </>
  );
};

export default ProtectedRoute;
