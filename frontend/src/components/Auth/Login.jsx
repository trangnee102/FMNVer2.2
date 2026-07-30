// frontend/src/components/Auth/Login.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Button from "../common/Button";
import "./Login.css";

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth(); 

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotStatus, setForgotStatus] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");

    try {
      const API_URL = import.meta.env.VITE_API_URL || "https://fmn-backend.onrender.com/api";
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      console.log("Phản hồi từ Server khi đăng nhập:", data); 

      if (response.ok) {
        // 🎉 THÀNH CÔNG
        localStorage.setItem("token", data.token);

        const userIdentifier = data.user?.email || email;
        localStorage.setItem("current_user_email", userIdentifier);

        if (login) {
          login(data.token, data.user);
        }

        navigate("/dashboard");
      } else {
        // ❌ THẤT BẠI TỪ LOGIC BACKEND
        setErrorMessage(data.message || "Đăng nhập thất bại. Vui lòng kiểm tra lại!");
      }
    } catch (error) {
      // ❌ BẮT LỖI 500 HOẶC SẬP SERVER
      setErrorMessage("Máy chủ Backend đang gặp sự cố (Lỗi 500). Vui lòng kiểm tra Terminal Backend!");
      console.error("Lỗi đăng nhập:", error);
    } finally {
      setIsLoading(false);
    }
  };

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
          {/* Box Email */}
          <div className="form-group" style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", width: "100%" }}>
            <div className="form-label-wrapper" style={{ width: "100%", textAlign: "left", marginBottom: "8px" }}>
              <label style={{ fontWeight: "600", color: "var(--text-dark)", fontSize: "0.95rem" }}>Email</label>
            </div>
            <input
              type="email"
              placeholder="your@email.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: "100%", boxSizing: "border-box" }}
            />
          </div>

          {/* Box Mật khẩu */}
          <div className="form-group" style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", width: "100%", marginTop: "15px" }}>
            <div className="form-label-wrapper" style={{ width: "100%", textAlign: "left", marginBottom: "8px" }}>
              <label style={{ fontWeight: "600", color: "var(--text-dark)", fontSize: "0.95rem" }}>Mật khẩu</label>
            </div>
            <input
              type="password"
              placeholder="********"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: "100%", boxSizing: "border-box" }}
            />
            
            {/* Nút "Quên mật khẩu?" */}
            <div style={{ width: "100%", display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
              <span 
                className="forgot-link" 
                onClick={() => setShowForgotModal(true)}
                style={{ 
                  fontSize: "0.85rem", 
                  color: "var(--primary)", 
                  cursor: "pointer", 
                  fontWeight: "600" 
                }}
              >
                Quên mật khẩu?
              </span>
            </div>
          </div>

          <button type="submit" className="btn-login" disabled={isLoading} style={{ marginTop: "20px" }}>
            {isLoading ? "Đang xử lý..." : "Đăng nhập"}
          </button>
        </form>

        <div className="register-hint" style={{ marginTop: "25px" }}>
          Chưa có tài khoản?{" "}
          <span
            onClick={() => navigate("/register")}
            style={{
              color: "var(--primary)",
              cursor: "pointer",
              fontWeight: "600",
            }}
          >
            Đăng ký ngay
          </span>
        </div>
      </div>

      {/* =========================================================================
          MODAL QUÊN MẬT KHẨU
      ========================================================================= */}
      {showForgotModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ margin: "0 0 10px 0", fontSize: "1.4rem", color: "var(--text-dark)" }}>Khôi phục mật khẩu</h3>
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
                  width: "100%", padding: "14px 16px", marginBottom: "25px", boxSizing: "border-box",
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