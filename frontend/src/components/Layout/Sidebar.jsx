// frontend/src/components/Layout/Sidebar.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./Sidebar.css";

const Sidebar = ({ currentView, onNavigate }) => {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const savedState = localStorage.getItem("sidebar_collapsed");
    return savedState !== null ? JSON.parse(savedState) : false;
  });

  const navigate = useNavigate(); 
  const { user, logoutUser } = useAuth(); 

  const [userName, setUserName] = useState("Đang tải...");
  const [userEmail, setUserEmail] = useState("...");
  const [userAvatar, setUserAvatar] = useState(null);

  useEffect(() => {
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
      // 👉 ĐÃ FIX: Thuật toán lấy tên thông minh, không bao giờ bị lỗi trống tên
      const emailPrefix = currentUser.email ? currentUser.email.split('@')[0] : "Người dùng";
      setUserName(
        currentUser.full_name || 
        currentUser.name || 
        currentUser.username || 
        localStorage.getItem("current_user_name") || 
        emailPrefix
      );
      
      setUserEmail(
        currentUser.email || 
        localStorage.getItem("current_user_email") || 
        "Chưa cập nhật email"
      );
      
      setUserAvatar(currentUser.avatar || localStorage.getItem("user_avatar"));
    }

    const handleStorageChange = () => {
      setUserAvatar(localStorage.getItem("user_avatar"));
      const updatedName = localStorage.getItem("current_user_name");
      if (updatedName) setUserName(updatedName);
    };
    
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [user]); 

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
    handleMenuClick(parentId);
    setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent("changeCommunityTab", { detail: subId }),
      );
    }, 50); 
  };

  // 👉 ĐÃ FIX TẬN GỐC LỖI DÍNH DATA: Quét sạch rác bộ nhớ khi đăng xuất
  const handleLogout = () => {
    if (window.confirm("Bạn có chắc chắn muốn đăng xuất không?")) {
      // Giữ lại trạng thái đóng mở Sidebar
      const savedSidebarState = localStorage.getItem("sidebar_collapsed");
      
      // Quét sạch toàn bộ dữ liệu (Streak, user name, cache thẻ...)
      localStorage.clear(); 
      
      // Phục hồi lại trạng thái Sidebar
      if (savedSidebarState !== null) {
        localStorage.setItem("sidebar_collapsed", savedSidebarState);
      }

      logoutUser(); 
      navigate("/login"); 
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
          style={{ cursor: "pointer", fontSize: "1.2rem", color: "var(--text-gray, #64748b)" }}
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
                        e.stopPropagation();
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

        <div className={`sidebar-footer ${isCollapsed ? "footer-collapsed" : ""}`}>
          <div className="sidebar-user-profile">
            {userAvatar ? (
              <img
                src={userAvatar}
                alt="User Avatar"
                className="sidebar-avatar-img"
              />
            ) : (
              <div className="sidebar-avatar-placeholder">
                <i className="fa-solid fa-user"></i>
              </div>
            )}

            {!isCollapsed && (
              <div className="sidebar-user-info">
                <span className="sidebar-user-name" style={{ fontWeight: "700", color: "var(--text-dark)" }}>{userName}</span>
                <span className="sidebar-user-email" style={{ color: "var(--text-gray)" }}>{userEmail}</span>
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