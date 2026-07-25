import React, { createContext, useState, useContext, useEffect } from "react";

// 1. Khởi tạo Két sắt chung
const AuthContext = createContext();

// 2. Tạo một cái Vỏ bọc (Provider) để bọc quanh dự án
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  // Ngay khi mở web, hệ thống sẽ tự động kiểm tra xem trước đó đã đăng nhập chưa
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        // 👉 ĐÃ NÂNG CẤP: Bọc try-catch để chống sập web nếu JSON bị hỏng
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error(
          "Dữ liệu Két sắt bị hỏng, đang tiến hành dọn dẹp:",
          error,
        );
        localStorage.removeItem("user");
        localStorage.removeItem("token");
      }
    }
  }, []);

  // Hàm này được gọi ngay sau khi API Login báo thành công
  const loginUser = (userData) => {
    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
  };

  // Hàm này được gọi khi người dùng bấm Đăng xuất
  const logoutUser = () => {
    setUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
  };

  return (
    <AuthContext.Provider value={{ user, loginUser, logoutUser }}>
      {children}
    </AuthContext.Provider>
  );
};

// 3. Tạo chiếc "chìa khóa" để các file khác mở Két sắt lấy dữ liệu
export const useAuth = () => useContext(AuthContext);
