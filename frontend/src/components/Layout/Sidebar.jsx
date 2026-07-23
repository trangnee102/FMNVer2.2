import React, { useState } from "react";
import { useNavigate } from "react-router-dom"; // 👉 ĐÃ THÊM: Công cụ điều hướng
import { useAuth } from "../../context/AuthContext"; // 👉 ĐÃ THÊM: Két sắt chứa dữ liệu người dùng
import "./Sidebar.css";

const Sidebar = ({ currentView, onNavigate }) => {
  // Lấy trạng thái từ localStorage để giữ nguyên khi chuyển trang
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const savedState = localStorage.getItem("sidebar_collapsed");
    return savedState !== null ? JSON.parse(savedState) : false;
  });

  const navigate = useNavigate(); // 👉 Khởi tạo bản đồ
  const { logoutUser } = useAuth(); // 👉 Lấy tính năng "Dọn sạch két sắt" ra dùng

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
      id === "community"
    ) {
      if (onNavigate) onNavigate(id);
    } else {
      alert(
        "Tính năng này đang được cật lực xây dựng! 🛠️ Vui lòng quay lại sau nhé!",
      );
    }
  };

  const handleSubMenuClick = (parentId, subId) => {
    handleMenuClick(parentId);
    // Bắn một tín hiệu ra toàn hệ thống báo rằng tab con vừa bị thay đổi
    window.dispatchEvent(
      new CustomEvent("changeCommunityTab", { detail: subId }),
    );
  };

  // 👉 ĐÃ SỬA: Hàm Đăng xuất chuẩn theo luồng mới
  const handleLogout = () => {
    if (window.confirm("Bạn có chắc chắn muốn đăng xuất không?")) {
      logoutUser(); // Xóa sạch token và thông tin user trong Két sắt
      navigate("/login"); // Đá thẳng về trang Đăng nhập mượt mà không cần reload
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
