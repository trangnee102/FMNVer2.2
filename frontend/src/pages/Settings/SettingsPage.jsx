import React, { useState, useRef, useEffect } from "react";
import Sidebar from "../../components/Layout/Sidebar";
import { translations } from "../../translations";
import { useAuth } from "../../context/AuthContext";
import { authAPI } from "../../services/api";
import "./SettingsPage.css";

const SettingsPage = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState("general");
  const { user, loginUser } = useAuth();
  const [currentLang, setCurrentLang] = useState(
    localStorage.getItem("language") || "vi",
  );
  
  const t = translations?.[currentLang] || {};

  const [avatar, setAvatar] = useState(
    localStorage.getItem("user_avatar") || null,
  );
  const fileInputRef = useRef(null);
  const [isSaving, setIsSaving] = useState(false);

  const formatJoinDate = (dateString) => {
    if (!dateString) return new Date().toLocaleDateString("vi-VN");
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN");
  };

  const [userInfo, setUserInfo] = useState({
    displayName: user?.full_name || "",
    email: user?.email || "",
    joinDate: formatJoinDate(user?.created_at || user?.createdAt),
  });

  useEffect(() => {
    if (user) {
      setUserInfo((prev) => ({
        ...prev,
        displayName: user.full_name || prev.displayName,
        email: user.email || prev.email,
        joinDate: formatJoinDate(user.created_at || user.createdAt),
      }));
    }
  }, [user]);

  const [toggles, setToggles] = useState({
    darkMode: localStorage.getItem("theme") === "dark",
    communityNotification: false,
    emailNotification: false,
    soundNotification: true,
    studyReminder: true,
    dueNotification: true,
    achievementNotification: true,
    twoFactorAuth: false,
  });

  const [show2FAModal, setShow2FAModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordStep, setPasswordStep] = useState("current");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  const handleToggle = (key) => {
    if (key === "twoFactorAuth") {
      setShow2FAModal(true);
      return;
    }

    setToggles((prev) => {
      const newState = !prev[key];
      if (key === "darkMode") {
        if (newState) {
          document.documentElement?.classList.add("dark-mode");
          localStorage.setItem("theme", "dark");
        } else {
          document.documentElement?.classList.remove("dark-mode");
          localStorage.setItem("theme", "light");
        }
      }
      return { ...prev, [key]: newState };
    });
  };

  const confirm2FA = () => {
    setToggles((prev) => ({ ...prev, twoFactorAuth: !prev.twoFactorAuth }));
    setShow2FAModal(false);
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (passwordStep === "current") {
      if (currentPassword === "123456") {
        setPasswordStep("new");
      } else {
        setPasswordError("Mật khẩu hiện tại không chính xác!");
      }
    } else if (passwordStep === "new") {
      if (newPassword.length < 6) {
        setPasswordError("Mật khẩu mới phải có ít nhất 6 ký tự!");
        return;
      }
      setPasswordSuccess("🎉 Đổi mật khẩu thành công!");
      setTimeout(() => {
        closePasswordModal();
      }, 2000);
    } else if (passwordStep === "forgot") {
      if (!forgotEmail) {
        setPasswordError("Vui lòng nhập email!");
        return;
      }
      setPasswordSuccess("✅ Đã gửi yêu cầu tạo lại mật khẩu vào email!");
      setTimeout(() => {
        closePasswordModal();
      }, 3000);
    }
  };

  const closePasswordModal = () => {
    setShowPasswordModal(false);
    setPasswordStep("current");
    setCurrentPassword("");
    setNewPassword("");
    setForgotEmail("");
    setPasswordError("");
    setPasswordSuccess("");
  };

  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    setCurrentLang(newLang);
    localStorage.setItem("language", newLang);
    window.location.reload();
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUserInfo((prev) => ({ ...prev, [name]: value }));
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result);
        localStorage.setItem("user_avatar", reader.result);
        window.dispatchEvent(new Event("storage"));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveSettings = async () => {
    if (!user?.id) {
      alert("Lỗi: Không tìm thấy thông tin người dùng!");
      return;
    }
    
    setIsSaving(true);
    try {
      const payload = {
        userId: user.id,
        full_name: userInfo.displayName,
        email: userInfo.email,
      };

      const data = await authAPI.updateProfile(payload);

      if (data.token) {
        localStorage.setItem("token", data.token);
      }
      if (data.user) {
        loginUser(data.user);
      }

      alert("💾 Đã lưu cài đặt vào cơ sở dữ liệu thành công!");
    } catch (error) {
      alert("❌ Lỗi: " + (error.message || "Lưu cài đặt thất bại!"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="settings-page-wrapper">
      <Sidebar currentView="settings" onNavigate={onNavigate} />

      <div className="settings-main-content">
        <div className="settings-header-title">
          <h2>{t.settingsTitle || "Cài Đặt"}</h2>
          <p>{t.settingsDesc || "Quản lý tài khoản và tùy chọn ứng dụng"}</p>
        </div>

        <div className="settings-card">
          <div className="profile-header">
            <div className="profile-avatar">
              {avatar ? (
                <img
                  src={avatar}
                  alt="Avatar"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    borderRadius: "50%",
                  }}
                />
              ) : (
                <i className="fa-solid fa-user"></i>
              )}
            </div>
            <div className="profile-info-content">
              <h3>{userInfo.displayName || "Người dùng"}</h3>
              <p className="profile-email">{userInfo.email || "Chưa cập nhật email"}</p>
              <p className="profile-date">
                <i className="fa-solid fa-calendar-days"></i> Tham gia:{" "}
                {userInfo.joinDate}
              </p>

              <div className="profile-actions-buttons">
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  style={{ display: "none" }}
                  onChange={handleAvatarChange}
                />
                <button
                  className="btn-outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <i className="fa-solid fa-camera"></i> Đổi ảnh
                </button>
                <button
                  className="btn-outline"
                  onClick={() => setShowPasswordModal(true)}
                >
                  <i className="fa-solid fa-key"></i> Đổi mật khẩu
                </button>
                <button className="btn-outline">
                  <i className="fa-solid fa-laptop"></i> Quản lý phiên
                </button>
              </div>
            </div>
          </div>

          <div className="settings-nav-tabs">
            <div
              className={`nav-tab ${activeTab === "general" ? "active" : ""}`}
              onClick={() => setActiveTab("general")}
            >
              <i className="fa-solid fa-sliders"></i> {t.tabGeneral || "Chung"}
            </div>
            
            <div
              className={`nav-tab ${activeTab === "notifications" ? "active" : ""}`}
              onClick={() => setActiveTab("notifications")}
            >
              <i className="fa-solid fa-bell"></i> Thông báo
            </div>

            <div
              className={`nav-tab ${activeTab === "security" ? "active" : ""}`}
              onClick={() => setActiveTab("security")}
            >
              <i className="fa-solid fa-shield-halved"></i>{" "}
              {t.tabSecurity || "Bảo mật"}
            </div>
            
            <div
              className={`nav-tab ${activeTab === "account" ? "active" : ""}`}
              onClick={() => setActiveTab("account")}
            >
              <i className="fa-solid fa-user-gear"></i>{" "}
              {t.tabAccount || "Tài khoản"}
            </div>
          </div>

          {activeTab === "general" && (
            <div className="tab-content fade-in">
              <div className="settings-section">
                <h4 className="section-title">
                  <i
                    className="fa-solid fa-palette"
                    style={{ color: "#4f46e5" }}
                  ></i>{" "}
                  {t.uiSection || "Giao diện"}
                </h4>
                <div className="setting-row">
                  <div className="setting-details">
                    <span className="setting-name">
                      {t.darkMode || "Chế độ tối"}
                    </span>
                    <span className="setting-desc">
                      {t.darkModeDesc || "Chuyển sang giao diện tối để dễ nhìn hơn ban đêm"}
                    </span>
                  </div>
                  <label className="custom-toggle">
                    <input
                      type="checkbox"
                      checked={toggles.darkMode}
                      onChange={() => handleToggle("darkMode")}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>

              <div className="settings-section">
                <h4 className="section-title">
                  <i
                    className="fa-solid fa-graduation-cap"
                    style={{ color: "#4f46e5" }}
                  ></i>{" "}
                  Học tập
                </h4>
                <div className="setting-row">
                  <div className="setting-details">
                    <span className="setting-name">Nhắc nhở ôn tập</span>
                    <span className="setting-desc">
                      Nhận thông báo hàng ngày để duy trì thói quen học tập
                    </span>
                  </div>
                  <label className="custom-toggle">
                    <input
                      type="checkbox"
                      checked={toggles.studyReminder}
                      onChange={() => handleToggle("studyReminder")}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === "notifications" && (
            <div className="tab-content fade-in">
              <div className="settings-section">
                <h4 className="section-title">
                  <i
                    className="fa-solid fa-bell"
                    style={{ color: "#4f46e5" }}
                  ></i>{" "}
                  Cài đặt thông báo
                </h4>
                <div className="setting-row">
                  <div className="setting-details">
                    <span className="setting-name">Thông báo cộng đồng</span>
                    <span className="setting-desc">
                      Nhận thông báo khi có người nhắn tin hoặc tương tác
                    </span>
                  </div>
                  <label className="custom-toggle">
                    <input
                      type="checkbox"
                      checked={toggles.communityNotification}
                      onChange={() => handleToggle("communityNotification")}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === "security" && (
            <div className="tab-content fade-in">
              <div className="settings-section">
                <h4 className="section-title">
                  <i
                    className="fa-solid fa-shield-halved"
                    style={{ color: "#4f46e5" }}
                  ></i>{" "}
                  Bảo mật
                </h4>

                <div className="setting-row">
                  <div className="setting-details">
                    <span className="setting-name">
                      Xác thực hai yếu tố (2FA)
                    </span>
                    <span className="setting-desc">
                      Tăng cường bảo mật bằng ứng dụng authenticator hoặc email
                    </span>
                  </div>
                  <label className="custom-toggle">
                    <input
                      type="checkbox"
                      checked={toggles.twoFactorAuth}
                      onChange={() => handleToggle("twoFactorAuth")}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                <div className="setting-row">
                  <div className="setting-details">
                    <span className="setting-name">Đổi mật khẩu</span>
                    <span className="setting-desc">
                      Cập nhật mật khẩu tài khoản định kỳ để an toàn hơn
                    </span>
                  </div>
                  <button
                    className="btn-action-small"
                    onClick={() => setShowPasswordModal(true)}
                  >
                    <i className="fa-solid fa-key"></i> Thay đổi
                  </button>
                </div>

                <div className="setting-row">
                  <div className="setting-details">
                    <span className="setting-name">Phiên đăng nhập</span>
                    <span className="setting-desc">
                      Kiểm tra và đăng xuất khỏi các thiết bị khác
                    </span>
                  </div>
                  <button className="btn-action-small">
                    <i className="fa-solid fa-laptop"></i> Quản lý
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "account" && (
            <div className="tab-content fade-in">
              <div className="settings-section">
                <h4 className="section-title">
                  <i
                    className="fa-solid fa-user-gear"
                    style={{ color: "#4f46e5" }}
                  ></i>{" "}
                  Thông tin cá nhân
                </h4>

                <div className="account-form">
                  <div className="form-group">
                    <div className="form-label">
                      <strong>Tên hiển thị</strong>
                      <span>Tên sẽ được hiển thị trên hồ sơ của bạn</span>
                    </div>
                    <input
                      type="text"
                      name="displayName"
                      value={userInfo.displayName}
                      onChange={handleInputChange}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <div className="form-label">
                      <strong>Email</strong>
                      <span>Địa chỉ email dùng để đăng nhập</span>
                    </div>
                    <input
                      type="email"
                      name="email"
                      value={userInfo.email}
                      onChange={handleInputChange}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <div className="form-label">
                      <strong>Ngày tham gia</strong>
                      <span>Hệ thống ghi nhận ngày bạn tạo tài khoản</span>
                    </div>
                    <input
                      type="text"
                      value={userInfo.joinDate}
                      disabled
                      className="form-input disabled-input"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="settings-footer">
            <button 
              className="btn-save-settings" 
              onClick={handleSaveSettings}
              disabled={isSaving}
            >
              {isSaving ? (
                <><i className="fa-solid fa-spinner fa-spin"></i> Đang lưu...</>
              ) : (
                <><i className="fa-solid fa-floppy-disk"></i> {t.saveBtn || "Lưu cài đặt"}</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Modal 2FA */}
      {show2FAModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            zIndex: 1000,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div
            style={{
              background: "#FFFFFF",
              padding: "30px",
              borderRadius: "16px",
              width: "90%",
              maxWidth: "450px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
              color: "#111827",
            }}
          >
            <h3
              style={{
                margin: "0 0 15px 0",
                fontSize: "1.3rem",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <i
                className="fa-solid fa-shield-halved"
                style={{ color: "#4F46E5" }}
              ></i>
              {toggles.twoFactorAuth
                ? "Tắt xác thực hai yếu tố?"
                : "Bật xác thực hai yếu tố (2FA)"}
            </h3>

            <p
              style={{
                color: "#6B7280",
                fontSize: "0.95rem",
                marginBottom: "25px",
                lineHeight: "1.6",
              }}
            >
              {toggles.twoFactorAuth
                ? "Việc tắt tính năng này sẽ làm giảm mức độ bảo mật tài khoản của bạn. Bạn có chắc chắn muốn tắt không?"
                : "Thay vì chỉ dùng mật khẩu, bạn cần cung cấp thêm một mã PIN, mã gửi qua SMS, hoặc vân tay để chứng minh đúng là bạn."}
            </p>

            <div
              style={{
                display: "flex",
                gap: "12px",
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={() => setShow2FAModal(false)}
                style={{
                  padding: "10px 20px",
                  borderRadius: "10px",
                  border: "1px solid #D1D5DB",
                  background: "transparent",
                  color: "#374151",
                  cursor: "pointer",
                  fontWeight: "600",
                }}
              >
                Hủy
              </button>
              <button
                onClick={confirm2FA}
                style={{
                  padding: "10px 20px",
                  borderRadius: "10px",
                  border: "none",
                  background: toggles.twoFactorAuth ? "#EF4444" : "#4F46E5",
                  color: "white",
                  cursor: "pointer",
                  fontWeight: "600",
                }}
              >
                {toggles.twoFactorAuth ? "Tắt 2FA" : "Tiếp tục thiết lập"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Password */}
      {showPasswordModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            zIndex: 1000,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div
            style={{
              background: "#FFFFFF",
              padding: "30px",
              borderRadius: "16px",
              width: "90%",
              maxWidth: "400px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
              color: "#111827",
            }}
          >
            <h3 style={{ margin: "0 0 15px 0", fontSize: "1.3rem" }}>
              {passwordStep === "current" && "Xác nhận mật khẩu"}
              {passwordStep === "new" && "Tạo mật khẩu mới"}
              {passwordStep === "forgot" && "Khôi phục mật khẩu"}
            </h3>

            {passwordError && (
              <div
                style={{
                  padding: "12px",
                  marginBottom: "20px",
                  borderRadius: "10px",
                  fontSize: "0.9rem",
                  backgroundColor: "#FEF2F2",
                  color: "#991B1B",
                  border: "1px solid #FECACA"
                }}
              >
                ❌ {passwordError}
              </div>
            )}
            {passwordSuccess && (
              <div
                style={{
                  padding: "12px",
                  marginBottom: "20px",
                  borderRadius: "10px",
                  fontSize: "0.9rem",
                  backgroundColor: "#F0FDF4",
                  color: "#166534",
                  border: "1px solid #BBF7D0"
                }}
              >
                {passwordSuccess}
              </div>
            )}

            <form onSubmit={handlePasswordSubmit}>
              {passwordStep === "current" && (
                <>
                  <p
                    style={{
                      color: "#6B7280",
                      fontSize: "0.9rem",
                      marginBottom: "20px",
                    }}
                  >
                    Vui lòng nhập mật khẩu hiện tại để tiếp tục.
                  </p>
                  <input
                    type="password"
                    placeholder="Mật khẩu hiện tại..."
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      marginBottom: "10px",
                      borderRadius: "10px",
                      border: "1px solid #D1D5DB",
                      background: "transparent",
                      color: "#111827",
                      outline: "none",
                      boxSizing: "border-box"
                    }}
                  />
                  <div style={{ textAlign: "right", marginBottom: "25px" }}>
                    <span
                      onClick={() => {
                        setPasswordStep("forgot");
                        setPasswordError("");
                      }}
                      style={{
                        fontSize: "0.85rem",
                        color: "#4F46E5",
                        cursor: "pointer",
                        fontWeight: "600",
                      }}
                    >
                      Quên mật khẩu?
                    </span>
                  </div>
                </>
              )}

              {passwordStep === "new" && (
                <>
                  <p
                    style={{
                      color: "#6B7280",
                      fontSize: "0.9rem",
                      marginBottom: "20px",
                    }}
                  >
                    Mật khẩu mới phải có ít nhất 6 ký tự.
                  </p>
                  <input
                    type="password"
                    placeholder="Nhập mật khẩu mới..."
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      marginBottom: "25px",
                      borderRadius: "10px",
                      border: "1px solid #D1D5DB",
                      background: "transparent",
                      color: "#111827",
                      outline: "none",
                      boxSizing: "border-box"
                    }}
                  />
                </>
              )}

              {passwordStep === "forgot" && (
                <>
                  <p
                    style={{
                      color: "#6B7280",
                      fontSize: "0.9rem",
                      marginBottom: "20px",
                    }}
                  >
                    Nhập email đăng ký của bạn. Chúng tôi sẽ gửi yêu cầu thay
                    đổi mật khẩu vào email này.
                  </p>
                  <input
                    type="email"
                    placeholder="Nhập email..."
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      marginBottom: "25px",
                      borderRadius: "10px",
                      border: "1px solid #D1D5DB",
                      background: "transparent",
                      color: "#111827",
                      outline: "none",
                      boxSizing: "border-box"
                    }}
                  />
                </>
              )}

              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  justifyContent: "flex-end",
                }}
              >
                <button
                  type="button"
                  onClick={closePasswordModal}
                  style={{
                    padding: "10px 20px",
                    borderRadius: "10px",
                    border: "1px solid #D1D5DB",
                    background: "transparent",
                    color: "#374151",
                    cursor: "pointer",
                    fontWeight: "600",
                  }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  style={{
                    padding: "10px 20px",
                    borderRadius: "10px",
                    border: "none",
                    background: "#4F46E5",
                    color: "white",
                    cursor: "pointer",
                    fontWeight: "600",
                  }}
                >
                  {passwordStep === "current" && "Tiếp theo"}
                  {passwordStep === "new" && "Lưu mật khẩu"}
                  {passwordStep === "forgot" && "Gửi yêu cầu"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;