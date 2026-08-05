// frontend/src/components/Auth/Login.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Button from "../common/Button";
import "./Login.css";
import { toast, Toaster } from "react-hot-toast"; // Đã thêm Toaster để hiện thông báo đẹp

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth(); 

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  
  // States cho modal quên mật khẩu
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [isResetting, setIsResetting] = useState(false);

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
        localStorage.setItem("token", data.token);

        const userIdentifier = data.user?.email || email;
        localStorage.setItem("current_user_email", userIdentifier);

        if (login) {
          login(data.token, data.user);
        }

        navigate("/dashboard");
      } else {
        setErrorMessage(data.message || "Đăng nhập thất bại. Vui lòng kiểm tra lại!");
      }
    } catch (error) {
      setErrorMessage("Máy chủ Backend đang gặp sự cố (Lỗi 500). Vui lòng kiểm tra Terminal Backend!");
      console.error("Lỗi đăng nhập:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // 👉 ĐÃ CẬP NHẬT: Hàm gọi API quên mật khẩu thật
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!forgotEmail) {
      toast.error("Vui lòng nhập email của bạn.");
      return;
    }
    
    setIsResetting(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      });
      const data = await response.json();
      
      if (data.success) {
        toast.success(data.message || "Đã gửi link khôi phục vào email của bạn!");
        setTimeout(() => {
          setShowForgotModal(false);
          setForgotEmail("");
        }, 2000);
      } else {
        toast.error(data.message || "Lỗi gửi yêu cầu");
      }
    } catch (error) {
      toast.error("Lỗi khi kết nối đến máy chủ.");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="login-page">
      <Toaster position="top-right" />
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

      {showForgotModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ margin: "0 0 10px 0", fontSize: "1.4rem", color: "var(--text-dark)" }}>Khôi phục mật khẩu</h3>
            <p style={{ color: "var(--text-gray)", fontSize: "0.9rem", marginBottom: "20px" }}>
              Nhập email bạn đã dùng để đăng ký. Chúng tôi sẽ gửi một liên kết để đặt lại mật khẩu.
            </p>

            <form onSubmit={handleForgotPassword}>
              <input
                type="email"
                placeholder="Nhập email của bạn..."
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                required
                style={{
                  width: "100%", padding: "14px 16px", marginBottom: "25px", boxSizing: "border-box",
                  borderRadius: "10px", border: "1.5px solid var(--border)",
                  background: "var(--bg-main)", color: "var(--text-dark)", outline: "none", fontSize: "1rem"
                }}
              />
              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => { setShowForgotModal(false); setForgotEmail(""); }}
                  style={{
                    padding: "12px 20px", borderRadius: "8px", border: "1.5px solid var(--border)",
                    background: "transparent", color: "var(--text-gray)", cursor: "pointer", fontWeight: "600"
                  }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isResetting}
                  style={{
                    padding: "12px 20px", borderRadius: "8px", border: "none",
                    background: "var(--primary)", color: "white", cursor: "pointer", fontWeight: "600",
                    opacity: isResetting ? 0.7 : 1
                  }}
                >
                  {isResetting ? "Đang gửi..." : "Gửi yêu cầu"}
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