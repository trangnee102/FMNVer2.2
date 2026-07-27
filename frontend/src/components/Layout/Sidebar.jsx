// frontend/src/components/Layout/Sidebar.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext"; // 👉 ĐÃ THÊM: Lấy thông tin user chuẩn xác từ Context
import "./Sidebar.css";

const Sidebar = ({ currentView, onNavigate }) => {
  // Lấy trạng thái từ localStorage để giữ nguyên khi chuyển trang
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const savedState = localStorage.getItem("sidebar_collapsed");
    return savedState !== null ? JSON.parse(savedState) : false;
  });

  const navigate = useNavigate(); 
  const { user, logoutUser } = useAuth(); // 👉 Lấy user và hàm đăng xuất từ Context

  // 👉 CẬP NHẬT: State quản lý thông tin User không còn bị fix cứng
  const [userName, setUserName] = useState("Đang tải...");
  const [userEmail, setUserEmail] = useState("...");
  const [userAvatar, setUserAvatar] = useState(null);

  // 👉 CẬP NHẬT: Tự động lấy dữ liệu và đồng bộ chuẩn xác
  useEffect(() => {
    // 1. Đồng bộ tên và email từ Context hoặc LocalStorage
    let currentUser = user;
    if (!currentUser) {
      try {
        const storedUser = localStorage.getItem("user");
        if (storedUser) currentUser = JSON.parse(storedUser);
      } catch (e) {
        console.error("Lỗi đọc dữ liệu tài khoản:", e);
      }
    }

    if (currentUser) {
      // Ưu tiên tên thật từ DB, nếu không có mới lấy tên lưu cục bộ ở Settings
      setUserName(
        currentUser.full_name || 
        currentUser.name || 
        currentUser.username || 
        localStorage.getItem("current_user_name") || 
        "Người dùng"
      );
      setUserEmail(
        currentUser.email || 
        localStorage.getItem("current_user_email") || 
        "Chưa cập nhật email"
      );
    }

    // 2. Load Avatar
    setUserAvatar(localStorage.getItem("user_avatar"));

    // 3. Lắng nghe sự kiện nếu bên trang Settings có cập nhật thì Sidebar cũng đổi theo ngay lập tức
    const handleStorageChange = () => {
      setUserAvatar(localStorage.getItem("user_avatar"));
      const updatedName = localStorage.getItem("current_user_name");
      if (updatedName) setUserName(updatedName);
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [user]); // Chạy lại nếu user từ Context thay đổi

  // Hàm xử lý đóng/mở và lưu lại trạng thái vào bộ nhớ
  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem("sidebar_collapsed", JSON.stringify(newState));
  };

  const menuItems = [
    { id: "dashboard", icon: "fa-house", text: "Trang chủ" },
    { id: "my-decks", icon: "fa-book-bookmark", text: "Thư viện của tôi" },
    { id: "create", icon: "fa-square-plus", text: "Tạo thẻ" },
    { id: "review", icon: "fa-layer-group", text: "Ôn tập" },
    { id: "stats", icon: "fa-chart-simple", text: "Thống kê" },
    {
      id: "community",
      icon: "fa-users",
      text: "Cộng đồng",
      subItems: [
        { id: "explore", icon: "fa-compass", text: "Khám phá" },
        { id: "leaderboard", icon: "fa-ranking-star", text: "Bảng xếp hạng" },
        { id: "contacts", icon: "fa-address-book", text: "Liên hệ" },
      ],
    },
    { id: "settings", icon: "fa-gear", text: "Cài đặt" },
  ];

  const handleMenuClick = (id) => {
    if (
      id === "dashboard" ||
      id === "create" ||
      id === "my-decks" ||
      id === "review" ||
      id === "stats" ||
      id === "community" ||
      id === "settings"
    ) {
      if (onNavigate) onNavigate(id);
    } else {
      alert("Tính năng này đang được cật lực xây dựng! 🛠️ Vui lòng quay lại sau nhé!");
    }
  };

  const handleSubMenuClick = (parentId, subId) => {
    // 1. Chuyển view chính sang "community" trước
    handleMenuClick(parentId);
    
    // 2. Dùng setTimeout (50ms) để đợi trang Cộng Đồng load lên xong xuôi, 
    // sau đó mới bắn tín hiệu chuyển sang tab con.
    setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent("changeCommunityTab", { detail: subId }),
      );
    }, 50); 
  };

  const handleLogout = () => {
    if (window.confirm("Bạn có chắc chắn muốn đăng xuất không?")) {
      logoutUser(); // Xóa sạch token và thông tin user trong Két sắt
      navigate("/login"); // Đá thẳng về trang Đăng nhập mượt mà
    }
  };

  return (
    <div className={`sidebar ${isCollapsed ? "collapsed" : ""}`}>
      <div
        className="sidebar-header"
        style={{
          display: "flex",
          justifyContent: isCollapsed ? "center" : "space-between",
          alignItems: "center",
          padding: "20px 15px",
        }}
      >
        {!isCollapsed && (
          /* 👉 ĐÃ SỬA: Logo "FORGETMENOT" chuyên nghiệp, gradient màu sắc rực rỡ */
          <span 
            className="logo"
            style={{
              background: "linear-gradient(90deg, #2563eb 0%, #9333ea 50%, #ea580c 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              fontWeight: "900",
              fontSize: "1.05rem",
              letterSpacing: "1.5px",
              margin: 0,
              textShadow: "0px 4px 15px rgba(147, 51, 234, 0.15)"
            }}
          >
            FORGETMENOT
          </span>
        )}
        <i
          className="fa-solid fa-bars hamburger"
          onClick={toggleSidebar}
          style={{ cursor: "pointer", fontSize: "1.2rem", color: "#64748b" }}
        ></i>
      </div>

      <nav
        className="sidebar-menu"
        style={{ display: "flex", flexDirection: "column", height: "100%" }}
      >
        <div className="menu-items-container">
          {menuItems.map((item) => (
            <div key={item.id} className="menu-group">
              <div
                className={`menu-item ${currentView === item.id ? "active" : ""}`}
                onClick={() => handleMenuClick(item.id)}
              >
                <i className={`fa-solid ${item.icon}`}></i>
                {!isCollapsed && <span>{item.text}</span>}

                {item.subItems && !isCollapsed && (
                  <i className="fa-solid fa-chevron-down submenu-arrow"></i>
                )}
              </div>

              {item.subItems && (
                <div className="submenu">
                  {item.subItems.map((sub) => (
                    <div
                      key={sub.id}
                      className="submenu-item"
                      onClick={(e) => {
                        e.stopPropagation(); // Chặn sự kiện click nảy lên thẻ cha
                        handleSubMenuClick(item.id, sub.id);
                      }}
                    >
                      <i className={`fa-solid ${sub.icon}`}></i>
                      <span>{sub.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Khu vực Profile và Đăng xuất ở cuối Sidebar */}
        <div className={`sidebar-footer ${isCollapsed ? "footer-collapsed" : ""}`}>
          <div className="sidebar-user-profile">
            {userAvatar ? (
              <img src={userAvatar} alt="User Avatar" className="sidebar-avatar-img" />
            ) : (
              <div className="sidebar-avatar-placeholder">
                <i className="fa-solid fa-user"></i>
              </div>
            )}
            
            {!isCollapsed && (
              <div className="sidebar-user-info">
                <span className="sidebar-user-name" style={{ fontWeight: "700" }}>{userName}</span>
                <span className="sidebar-user-email">{userEmail}</span>
              </div>
            )}
          </div>
          
          <button 
            className="sidebar-logout-icon-btn" 
            onClick={handleLogout}
            title="Đăng xuất"
          >
            <i className="fa-solid fa-arrow-right-from-bracket"></i>
          </button>
        </div>

      </nav>
    </div>
  );
};

export default Sidebar;