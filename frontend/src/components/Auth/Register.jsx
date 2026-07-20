import React, { useState } from "react";
import Button from "../common/Button";
import "./Login.css";

const Register = ({ onRegister, onNavigateToLogin }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // 👉 THÊM: State để lưu thông báo lỗi
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); // Xóa lỗi cũ đi trước khi thử lại

    try {
      // 👉 BƯỚC 1: Gọi API Đăng ký xuống Backend
      // (Đảm bảo cổng 5000 khớp với Backend của cậu đang chạy)
      const response = await fetch("http://localhost:5000/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      // 👉 BƯỚC 2: Nếu Backend từ chối (VD: Trùng email)
      if (!response.ok) {
        throw new Error(data.message || "Đăng ký thất bại!");
      }

      // 👉 BƯỚC 3: Đăng ký thành công -> Lưu ngay Token vào Local Storage
      localStorage.setItem("token", data.token);

      // 👉 BƯỚC 4: Chuyển trang vào Dashboard
      onRegister(name || data.user.email);
    } catch (err) {
      // Bắt lỗi và ném vào State để in ra chữ đỏ
      setError(err.message);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div style={{ fontSize: "2.5rem", marginBottom: "10px" }}>🚀</div>
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
          Tạo tài khoản mới
        </h3>
        <p
          style={{
            color: "var(--text-gray)",
            marginBottom: "30px",
            fontSize: "0.9rem",
          }}
        >
          Bắt đầu hành trình học tập của bạn
        </p>

        {/* 👉 THÊM: Khu vực hiển thị lỗi chữ đỏ báo cho người dùng */}
        {error && (
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
            ❌ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Tên hiển thị</label>
            <input
              type="text"
              placeholder="VD: Trang IT"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group" style={{ marginBottom: "30px" }}>
            <label>Mật khẩu</label>
            <input
              type="password"
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button text="Đăng ký tài khoản" variant="primary" fullWidth={true} />
        </form>

        <div
          style={{
            marginTop: "25px",
            fontSize: "0.9rem",
            color: "var(--text-gray)",
          }}
        >
          Đã có tài khoản?{" "}
          <span
            onClick={onNavigateToLogin}
            style={{
              color: "var(--primary)",
              cursor: "pointer",
              fontWeight: "600",
            }}
          >
            Đăng nhập
          </span>
        </div>
      </div>
    </div>
  );
};

export default Register;
