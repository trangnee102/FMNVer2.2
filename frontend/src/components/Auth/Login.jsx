import React, { useState } from "react";
import Button from "../common/Button";
import "./Login.css";

const Login = ({ onLogin, onNavigateToRegister }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

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

        // 👉 ĐÃ SỬA: Lấy Email thay vì Name vì Database của cậu không có cột Name
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

  return (
    <div className="login-page">
      <div className="login-card">
        <div style={{ fontSize: "2.5rem", marginBottom: "10px" }}>🧠</div>
        <h2
          style={{
            color: "var(--primary)",
            marginBottom: "5px",
            fontSize: "1.5rem",
          }}
        >
          ForgetMeNot
        </h2>
        <h3 style={{ marginBottom: "10px", color: "var(--text-dark)" }}>
          Chào mừng trở lại!
        </h3>
        <p
          style={{
            color: "var(--text-gray)",
            marginBottom: "30px",
            fontSize: "0.9rem",
          }}
        >
          Đăng nhập để tiếp tục học tập
        </p>

        {errorMessage && (
          <div
            style={{
              color: "#d32f2f",
              backgroundColor: "#ffebee",
              padding: "10px",
              borderRadius: "5px",
              marginBottom: "15px",
              fontSize: "0.9rem",
              fontWeight: "500",
            }}
          >
            ❌ {errorMessage}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label
              style={{
                display: "block",
                fontWeight: "500",
                color: "var(--text-dark)",
                fontSize: "0.95rem",
              }}
            >
              Email
            </label>
            <input
              type="email"
              placeholder="your@email.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: "30px" }}>
            <label
              style={{
                display: "block",
                fontWeight: "500",
                color: "var(--text-dark)",
                fontSize: "0.95rem",
              }}
            >
              Mật khẩu
            </label>
            <input
              type="password"
              placeholder="********"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: "100%",
              padding: "12px",
              backgroundColor: "var(--primary)",
              color: "white",
              border: "none",
              borderRadius: "var(--radius-sm)",
              fontWeight: "600",
              cursor: isLoading ? "not-allowed" : "pointer",
            }}
          >
            {isLoading ? "Đang xử lý..." : "Đăng nhập"}
          </button>
        </form>

        <div
          style={{
            marginTop: "25px",
            fontSize: "0.9rem",
            color: "var(--text-gray)",
          }}
        >
          Chưa có tài khoản?{" "}
          <span
            onClick={onNavigateToRegister}
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
    </div>
  );
};

export default Login;
