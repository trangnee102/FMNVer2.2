import React from "react";
import { Navigate, Outlet } from "react-router-dom";

const ProtectedRoute = () => {
  // Thò tay vào túi kiểm tra xem có thẻ căn cước (Token) không
  const token = localStorage.getItem("token");

  // Nếu KHÔNG có token -> Trục xuất về trang Login
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Nếu CÓ token -> Hợp lệ, mở cửa cho phép đi tiếp vào các trang bên trong
  return <Outlet />;
};

export default ProtectedRoute;
