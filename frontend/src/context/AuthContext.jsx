import React, { createContext, useState, useContext, useEffect } from "react";

// 1. Khởi tạo Két sắt chung
const AuthContext = createContext();

// 2. Tạo một cái Vỏ bọc (Provider) để bọc quanh dự án
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // 👉 ĐÃ THÊM: Trạng thái chờ tải dữ liệu

  // Ngay khi mở web, hệ thống sẽ tự động kiểm tra xem trước đó đã đăng nhập chưa
  useEffect(() => {
    const checkLoggedIn = () => {
      setIsLoading(true);
      try {
        const storedUser = localStorage.getItem("user");
        const token = localStorage.getItem("token");

        // Chỉ xác nhận đăng nhập nếu có cả thông tin user VÀ thẻ token
        if (storedUser && token) {
          // Bọc try-catch để chống sập web nếu JSON bị hỏng
          setUser(JSON.parse(storedUser));
        } else {
          // Thiếu dữ liệu thì dọn sạch để tránh lỗi kẹt "Đang tải..."
          localStorage.removeItem("user");
          localStorage.removeItem("token");
          localStorage.removeItem("current_user_email");
        }
      } catch (error) {
        console.error("Dữ liệu Két sắt bị hỏng, đang tiến hành dọn dẹp:", error);
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        localStorage.removeItem("current_user_email");
        setUser(null);
      } finally {
        setIsLoading(false); // 👉 Báo hiệu đã load xong dữ liệu Két sắt
      }
    };

    checkLoggedIn();
  }, []);

  // 👉 ĐÃ CẬP NHẬT: Hàm login nhận vào cả token và userData (Khớp 100% với Login.jsx)
  const login = (token, userData) => {
    setUser(userData);
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(userData));
    
    if (userData?.email) {
      localStorage.setItem("current_user_email", userData.email);
    }
  };

  // Hàm này được gọi khi người dùng bấm Đăng xuất
  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("current_user_email");
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        setUser, // Truyền thêm setUser để SettingsPage có thể sửa tên/ảnh
        login, // Hàm chuẩn cho Login.jsx mới
        loginUser: login, // Giữ lại tên cũ để các file cũ không bị lỗi (Tương thích ngược)
        logout, // Hàm chuẩn
        logoutUser: logout, // Giữ lại tên cũ
        isLoading // 👉 Phục vụ cho Sidebar hết bị kẹt chữ "Đang tải..."
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// 3. Tạo chiếc "chìa khóa" để các file khác mở Két sắt lấy dữ liệu
export const useAuth = () => useContext(AuthContext);