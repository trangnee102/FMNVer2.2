import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; // 👉 ĐÃ THÊM: Import useNavigate để chuyển trang
import { useAuth } from "../../context/AuthContext"; // 👉 ĐÃ THÊM: Import useAuth để lấy hàm Đăng xuất
import "./Sidebar.css";

const Sidebar = ({ currentView, onNavigate }) => {
  // Lấy trạng thái từ localStorage để giữ nguyên khi chuyển trang
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const savedState = localStorage.getItem("sidebar_collapsed");
    return savedState !== null ? JSON.parse(savedState) : false;
  });

  // 👉 ĐÃ THÊM: State quản lý thông tin User hiển thị ở góc dưới
  const [userName, setUserName] = useState("Nguyễn Khắc Tuấn Đạt");
  const [userEmail, setUserEmail] = useState("nguyenkhactdat2007@gmail.com");
  const [userAvatar, setUserAvatar] = useState(null);

  // 👉 ĐÃ THÊM: Tự động lấy dữ liệu từ localStorage khi Sidebar xuất hiện
  useEffect(() => {
    const storedName = localStorage.getItem("current_user_name");
    const storedEmail = localStorage.getItem("current_user_email");
    const storedAvatar = localStorage.getItem("user_avatar");
    
    if (storedName) setUserName(storedName);
    if (storedEmail) setUserEmail(storedEmail);
    if (storedAvatar) setUserAvatar(storedAvatar);

    // Lắng nghe sự kiện nếu bên trang Settings có đổi ảnh thì Sidebar cũng đổi theo ngay lập tức
    const handleStorageChange = () => {
      setUserAvatar(localStorage.getItem("user_avatar"));
      setUserName(localStorage.getItem("current_user_name") || "Nguyễn Khắc Tuấn Đạt");
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

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
      id === "community" ||
      id === "settings" // 👉 ĐÃ MỞ KHÓA: Cho phép điều hướng đến trang Cài đặt
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

        {/* 👉 ĐÃ SỬA MỚI: Khu vực Profile và Đăng xuất ở cuối Sidebar */}
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
                <span className="sidebar-user-name">{userName}</span>
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