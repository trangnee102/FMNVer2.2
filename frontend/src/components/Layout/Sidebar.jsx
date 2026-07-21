import React, { useState } from "react";
import "./Sidebar.css";

const Sidebar = ({ currentView, onNavigate }) => {
  // 👉 ĐÃ SỬA: Lấy trạng thái từ localStorage để giữ nguyên khi chuyển trang
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const savedState = localStorage.getItem("sidebar_collapsed");
    return savedState !== null ? JSON.parse(savedState) : false; 
  });

  // 👉 ĐÃ SỬA: Hàm xử lý đóng/mở và lưu lại trạng thái vào bộ nhớ
  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem("sidebar_collapsed", JSON.stringify(newState));
  };

  // 👉 ĐÃ THÊM: Mảng subItems cho Cộng đồng
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
      id === "community"
    ) {
      if (onNavigate) onNavigate(id);
    } else {
      alert(
        "Tính năng này đang được cật lực xây dựng! 🛠️ Vui lòng quay lại sau nhé!",
      );
    }
  };

  // 👉 ĐÃ THÊM: Logic click riêng cho menu con
  const handleSubMenuClick = (parentId, subId) => {
    handleMenuClick(parentId); // Vẫn chuyển hướng khung chính sang Cộng đồng
    // Bắn một tín hiệu ra toàn hệ thống báo rằng tab con vừa bị thay đổi
    window.dispatchEvent(
      new CustomEvent("changeCommunityTab", { detail: subId }),
    );
  };

  const handleLogout = () => {
    if (window.confirm("Bạn có chắc chắn muốn đăng xuất không?")) {
      localStorage.removeItem("token");
      window.location.reload();
    }
  };

  return (
    <div className={`sidebar ${isCollapsed ? "collapsed" : ""}`}>
      {/* 👉 ĐÃ SỬA: Thêm inline-style để căn giữa icon 3 gạch khi Sidebar thu nhỏ */}
      <div 
        className="sidebar-header" 
        style={{ 
          display: "flex", 
          justifyContent: isCollapsed ? "center" : "space-between",
          alignItems: "center"
        }}
      >
        {!isCollapsed && <span className="logo">FORGETMENOT</span>}
        <i
          className="fa-solid fa-bars hamburger"
          onClick={toggleSidebar}
          style={{ cursor: "pointer" }}
        ></i>
      </div>

      <nav
        className="sidebar-menu"
        style={{ display: "flex", flexDirection: "column", height: "100%" }}
      >
        <div className="menu-items-container">
          {menuItems.map((item) => (
            <div key={item.id} className="menu-group">
              {/* Nút cha */}
              <div
                className={`menu-item ${currentView === item.id ? "active" : ""}`}
                onClick={() => handleMenuClick(item.id)}
              >
                <i className={`fa-solid ${item.icon}`}></i>
                {!isCollapsed && <span>{item.text}</span>}

                {/* Icon mũi tên xoay xoay khi có menu con */}
                {item.subItems && !isCollapsed && (
                  <i className="fa-solid fa-chevron-down submenu-arrow"></i>
                )}
              </div>

              {/* Danh sách thả xuống (Chỉ hiện khi rê chuột) */}
              {item.subItems && (
                <div className="submenu">
                  {item.subItems.map((sub) => (
                    <div
                      key={sub.id}
                      className="submenu-item"
                      onClick={(e) => {
                        e.stopPropagation(); // Ngăn click nhầm vào nút cha
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

        {/* Nút Đăng xuất */}
        <div
          className="menu-item logout-btn"
          onClick={handleLogout}
          style={{
            marginTop: "auto",
            color: "#d32f2f",
            fontWeight: "600",
            borderTop: "1px solid rgba(0,0,0,0.05)",
          }}
        >
          <i className="fa-solid fa-arrow-right-from-bracket"></i>
          {!isCollapsed && <span>Đăng xuất</span>}
        </div>
      </nav>
    </div>
  );
};

export default Sidebar;