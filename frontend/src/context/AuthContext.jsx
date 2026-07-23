import React, { createContext, useState, useContext, useEffect } from "react";

// 1. Khởi tạo Két sắt chung
const AuthContext = createContext();

// 2. Tạo một cái Vỏ bọc (Provider) để bọc quanh dự án
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  // 👉 ĐÃ THÊM: Lính gác cổng - chặn không cho hiển thị web khi chưa check xong Két
  const [isAuthReady, setIsAuthReady] = useState(false);

  // Ngay khi mở web, hệ thống sẽ tự động kiểm tra xem trước đó đã đăng nhập chưa
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
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

    // 👉 ĐÃ THÊM: Báo hiệu "Đã kiểm tra Két sắt xong, mở cổng cho web chạy đi!"
    setIsAuthReady(true);
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

  // 👉 ĐÃ THÊM: Nếu lính gác báo chưa check xong, trả về màn hình trống (hoặc icon xoay xoay) để tránh nháy giao diện
  if (!isAuthReady) {
    return null; // Hoặc cậu có thể thay bằng: return <div>Đang tải hệ thống...</div>
  }

  return (
    <AuthContext.Provider value={{ user, loginUser, logoutUser }}>
      {children}
    </AuthContext.Provider>
  );
};

// 3. Tạo chiếc "chìa khóa" để các file khác mở Két sắt lấy dữ liệu
export const useAuth = () => useContext(AuthContext);
