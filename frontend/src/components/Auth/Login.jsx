import React, { useState } from "react";
import Button from "../common/Button";
import "./Login.css";

const Login = ({ onLogin, onNavigateToRegister }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Các state để quản lý Hộp thoại Quên Mật Khẩu (Modal)
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotStatus, setForgotStatus] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // 🎉 THÀNH CÔNG: Lưu Token
        localStorage.setItem("token", data.token);
        onLogin(data.user?.email || "Bạn");
      } else {
        // ❌ THẤT BẠI: Hiện lỗi đỏ
        setErrorMessage(data.message || "Đăng nhập thất bại!");
      }
    } catch (error) {
      setErrorMessage("Không thể kết nối đến máy chủ Backend!");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Hàm xử lý khi bấm nút "Gửi yêu cầu" khôi phục mật khẩu
  const handleForgotPasswordSubmit = (e) => {
    e.preventDefault();
    if (!forgotEmail) {
      setForgotStatus("⚠️ Vui lòng nhập địa chỉ email!");
      return;
    }
    
    setForgotStatus("⏳ Đang gửi yêu cầu...");
    
    setTimeout(() => {
      setForgotStatus("✅ Đã gửi hướng dẫn khôi phục vào email của bạn!");
      setTimeout(() => {
        setShowForgotModal(false);
        setForgotStatus("");
        setForgotEmail("");
      }, 3000);
    }, 1500);
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">🧠</div>
        <h2 className="login-title">ForgetMeNot</h2>
        <h3 className="login-subtitle">Chào mừng trở lại!</h3>
        <p className="login-desc">Đăng nhập để tiếp tục học tập</p>

        {errorMessage && (
          <div className="error-message">
            ❌ {errorMessage}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <div className="form-label-wrapper">
              <label>Email</label>
            </div>
            <input
              type="email"
              placeholder="your@email.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <div className="form-label-wrapper">
              <label>Mật khẩu</label>
            </div>
            <input
              type="password"
              placeholder="********"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {/* 👉 ĐÃ SỬA: Đưa nút "Quên mật khẩu?" xuống dưới ô nhập và căn sang phải */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "6px" }}>
              <span className="forgot-link" onClick={() => setShowForgotModal(true)}>
                Quên mật khẩu?
              </span>
            </div>
          </div>

          <button type="submit" className="btn-login" disabled={isLoading}>
            {isLoading ? "Đang xử lý..." : "Đăng nhập"}
          </button>
        </form>

        <div className="register-hint">
          Chưa có tài khoản?{" "}
          <span onClick={onNavigateToRegister}>Đăng ký ngay</span>
        </div>
      </div>

      {/* =========================================================================
          MODAL QUÊN MẬT KHẨU (Giao diện đè lên màn hình)
      ========================================================================= */}
      {showForgotModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ margin: "0 0 10px 0", fontSize: "1.4rem" }}>Khôi phục mật khẩu</h3>
            <p style={{ color: "var(--text-gray)", fontSize: "0.9rem", marginBottom: "20px" }}>
              Nhập email bạn đã dùng để đăng ký. Chúng tôi sẽ gửi một liên kết để đặt lại mật khẩu.
            </p>

            {forgotStatus && (
              <div style={{
                padding: "12px", marginBottom: "15px", borderRadius: "8px", fontSize: "0.9rem", fontWeight: "600",
                backgroundColor: forgotStatus.includes("✅") ? "rgba(34, 197, 94, 0.1)" : (forgotStatus.includes("⏳") ? "rgba(56, 189, 248, 0.1)" : "rgba(239, 68, 68, 0.1)"),
                color: forgotStatus.includes("✅") ? "#16a34a" : (forgotStatus.includes("⏳") ? "#0284c7" : "#dc2626"),
                border: `1px solid ${forgotStatus.includes("✅") ? "rgba(34, 197, 94, 0.2)" : (forgotStatus.includes("⏳") ? "rgba(56, 189, 248, 0.2)" : "rgba(239, 68, 68, 0.2)")}`
              }}>
                {forgotStatus}
              </div>
            )}

            <form onSubmit={handleForgotPasswordSubmit}>
              <input
                type="email"
                placeholder="Nhập email của bạn..."
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                style={{
                  width: "100%", padding: "14px 16px", marginBottom: "25px",
                  borderRadius: "10px", border: "1.5px solid var(--border)",
                  background: "var(--bg-main)", color: "var(--text-dark)", outline: "none", fontSize: "1rem"
                }}
              />
              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => { setShowForgotModal(false); setForgotStatus(""); setForgotEmail(""); }}
                  style={{
                    padding: "12px 20px", borderRadius: "8px", border: "1.5px solid var(--border)",
                    background: "transparent", color: "var(--text-gray)", cursor: "pointer", fontWeight: "600"
                  }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  style={{
                    padding: "12px 20px", borderRadius: "8px", border: "none",
                    background: "var(--primary)", color: "white", cursor: "pointer", fontWeight: "600"
                  }}
                >
                  Gửi yêu cầu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;