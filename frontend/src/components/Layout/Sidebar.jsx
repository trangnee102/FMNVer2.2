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

  const [expandedGroups, setExpandedGroups] = useState(() => {
    const savedExpanded = localStorage.getItem("sidebar_expanded");
    return savedExpanded !== null 
      ? JSON.parse(savedExpanded) 
      : { library: true, community: true };
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
      const emailPrefix = currentUser.email
        ? currentUser.email.split("@")[0]
        : "Người dùng";
      setUserName(
        currentUser.full_name ||
          currentUser.name ||
          currentUser.username ||
          localStorage.getItem("current_user_name") ||
          emailPrefix,
      );

      setUserEmail(
        currentUser.email ||
          localStorage.getItem("current_user_email") ||
          "Chưa cập nhật email",
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

  useEffect(() => {
    localStorage.setItem("sidebar_expanded", JSON.stringify(expandedGroups));
  }, [expandedGroups]);

  useEffect(() => {
    if (currentView === "my-decks" || currentView === "my-exams") {
      setExpandedGroups(prev => ({ ...prev, library: true }));
    } else if (currentView === "explore" || currentView === "quicktest" || currentView === "contacts") {
      setExpandedGroups(prev => ({ ...prev, community: true }));
    }
  }, [currentView]);

  const menuItems = [
    { id: "dashboard", icon: "fa-house", text: "Trang chủ" },
    {
      id: "library",
      icon: "fa-book-bookmark",
      text: "Thư viện",
      subItems: [
        { id: "my-decks", icon: "fa-layer-group", text: "Bộ thẻ" },
        { id: "my-exams", icon: "fa-file-invoice", text: "Bộ đề thi" },
      ],
    },
    { id: "create", icon: "fa-square-plus", text: "Tạo Thẻ" },
    { id: "create-exam", icon: "fa-file-signature", text: "Tạo Đề Thi" },
    { id: "review", icon: "fa-rotate", text: "Ôn tập" },
    { id: "stats", icon: "fa-chart-simple", text: "Thống kê" },
    {
      id: "community",
      icon: "fa-users",
      text: "Cộng đồng",
      subItems: [
        { id: "explore", icon: "fa-compass", text: "Khám phá" },
        
        { id: "contacts", icon: "fa-address-book", text: "Liên hệ" },
      ],
    },
    { id: "settings", icon: "fa-gear", text: "Cài đặt" },
  ];

  const handleMenuClick = (id) => {
    const item = menuItems.find(i => i.id === id);

    if (item && item.subItems) {
      setExpandedGroups(prev => ({ ...prev, [id]: !prev[id] }));
      
      if (!expandedGroups[id]) {
        if (id === "library" && currentView !== "my-exams" && currentView !== "my-decks") {
          if (onNavigate) onNavigate("my-decks");
        }
        if (id === "community" && !["explore", "quicktest", "contacts"].includes(currentView)) {
          if (onNavigate) onNavigate("explore");
        }
      }
    } else {
      if (
        id === "dashboard" ||
        id === "create" ||
        id === "create-exam" ||
        id === "review" ||
        id === "stats" ||
        id === "settings"
      ) {
        if (onNavigate) onNavigate(id);
      } else {
        alert("Tính năng này đang được cật lực xây dựng! 🛠️ Vui lòng quay lại sau nhé!");
      }
    }
  };

  const handleSubMenuClick = (parentId, subId) => {
    if (onNavigate) {
      onNavigate(subId);
    }
    if (parentId === "community") {
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent("changeCommunityTab", { detail: subId }),
        );
      }, 50);
    }
  };

  const handleLogout = () => {
    if (window.confirm("Bạn có chắc chắn muốn đăng xuất không?")) {
      const savedSidebarState = localStorage.getItem("sidebar_collapsed");
      localStorage.clear();
      if (savedSidebarState !== null) {
        localStorage.setItem("sidebar_collapsed", savedSidebarState);
      }
      logoutUser();
      navigate("/login");
    }
  };

  return (
    <div className={`sidebar ${isCollapsed ? "collapsed" : ""}`}>
      <style>
        {`
          .submenu-arrow {
            margin-left: auto;
            transition: transform 0.3s ease;
          }
          .menu-item.expanded .submenu-arrow {
            transform: rotate(180deg);
          }

          .sidebar:not(.collapsed) .submenu-container {
            display: none;
            overflow: hidden;
            flex-direction: column;
            margin-top: 5px;
          }
          .sidebar:not(.collapsed) .submenu-container.open {
            display: flex;
          }
          .sidebar:not(.collapsed) .custom-submenu-item {
            padding: 10px 15px 10px 48px;
            display: flex;
            align-items: center;
            gap: 12px;
            color: var(--text-gray, #64748b);
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
            border-radius: 8px;
            margin: 2px 10px;
          }
          .sidebar:not(.collapsed) .custom-submenu-item:hover,
          .sidebar:not(.collapsed) .custom-submenu-item.active {
            background: rgba(99, 102, 241, 0.1);
            color: #4f46e5;
            font-weight: 700;
          }

          .sidebar.collapsed .menu-group {
            position: relative;
          }
          .sidebar.collapsed .submenu-container {
            display: none !important;
          }
          .flyout-menu {
            display: none;
            position: absolute;
            left: 100%;
            top: 0;
            background: var(--bg-main, #ffffff);
            box-shadow: 4px 4px 20px rgba(0,0,0,0.15);
            border-radius: 12px;
            padding: 8px 0;
            min-width: 220px;
            z-index: 1000;
            border: 1px solid var(--border, #e2e8f0);
            margin-left: 5px;
          }
          
          .flyout-menu::before {
            content: '';
            position: absolute;
            left: -15px;
            top: 0;
            width: 15px;
            height: 100%;
          }

          .sidebar.collapsed .menu-group:hover .flyout-menu {
            display: flex;
            flex-direction: column;
          }
          
          .flyout-title {
            padding: 8px 20px;
            font-size: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: var(--text-gray, #64748b);
            font-weight: 800;
            border-bottom: 1px solid var(--border, #e2e8f0);
            margin-bottom: 4px;
          }
          .flyout-item {
            padding: 12px 20px;
            display: flex;
            align-items: center;
            gap: 12px;
            cursor: pointer;
            color: var(--text-dark, #1e293b);
            font-weight: 600;
            transition: all 0.2s;
          }
          .flyout-item:hover, .flyout-item.active {
            background: rgba(99, 102, 241, 0.1);
            color: #4f46e5;
          }
        `}
      </style>

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
              background:
                "linear-gradient(90deg, #2563eb 0%, #9333ea 50%, #ea580c 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              fontWeight: "900",
              fontSize: "1.05rem",
              letterSpacing: "1.5px",
              margin: 0,
              textShadow: "0px 4px 15px rgba(147, 51, 234, 0.15)",
            }}
          >
            FORGETMENOT
          </span>
        )}
        <i
          className="fa-solid fa-bars hamburger"
          onClick={toggleSidebar}
          style={{
            cursor: "pointer",
            fontSize: "1.2rem",
            color: "var(--text-gray, #64748b)",
          }}
        ></i>
      </div>

      <nav
        className="sidebar-menu"
        style={{ display: "flex", flexDirection: "column", height: "100%" }}
      >
        <div className="menu-items-container">
          {menuItems.map((item) => {
            const isActive =
              currentView === item.id ||
              (item.subItems &&
                item.subItems.some((sub) => sub.id === currentView));
            const isExpanded = expandedGroups[item.id];

            return (
              <div 
                key={item.id} 
                className="menu-group"
                // 👉 ĐÃ FIX: Tự động mở ra khi di chuột vào (Hover)
                onMouseEnter={() => {
                  if (item.subItems && !isCollapsed) {
                    setExpandedGroups((prev) => ({ ...prev, [item.id]: true }));
                  }
                }}
                // 👉 ĐÃ FIX: Tự động thu gọn khi đưa chuột ra ngoài (nếu không phải là nhóm đang học)
                onMouseLeave={() => {
                  if (item.subItems && !isCollapsed) {
                    const hasActiveSub = item.subItems.some(sub => sub.id === currentView);
                    if (!hasActiveSub && currentView !== item.id) {
                      setExpandedGroups((prev) => ({ ...prev, [item.id]: false }));
                    }
                  }
                }}
              >
                <div
                  className={`menu-item ${isActive ? "active" : ""} ${isExpanded ? "expanded" : ""}`}
                  onClick={() => handleMenuClick(item.id)}
                >
                  <i className={`fa-solid ${item.icon}`}></i>
                  {!isCollapsed && <span>{item.text}</span>}

                  {item.subItems && !isCollapsed && (
                    <i className="fa-solid fa-chevron-down submenu-arrow"></i>
                  )}
                </div>

                {item.subItems && (
                  <div className={`submenu-container ${isExpanded ? "open" : ""}`}>
                    {item.subItems.map((sub) => (
                      <div
                        key={sub.id}
                        className={`custom-submenu-item ${
                          currentView === sub.id ? "active" : ""
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSubMenuClick(item.id, sub.id);
                        }}
                      >
                        <i className={`fa-solid ${sub.icon}`} style={{ width: '20px', textAlign: 'center' }}></i>
                        <span>{sub.text}</span>
                      </div>
                    ))}
                  </div>
                )}

                {item.subItems && isCollapsed && (
                  <div className="flyout-menu">
                    <div className="flyout-title">{item.text}</div>
                    {item.subItems.map((sub) => (
                      <div
                        key={sub.id}
                        className={`flyout-item ${
                          currentView === sub.id ? "active" : ""
                        }`}
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
            );
          })}
        </div>

        <div
          className={`sidebar-footer ${isCollapsed ? "footer-collapsed" : ""}`}
        >
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
                <span
                  className="sidebar-user-name"
                  style={{ fontWeight: "700", color: "var(--text-dark)" }}
                >
                  {userName}
                </span>
                <span
                  className="sidebar-user-email"
                  style={{ color: "var(--text-gray)" }}
                >
                  {userEmail}
                </span>
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