// frontend/src/pages/Login/Register.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./Login.css"; // 👉 Dùng chung file CSS siêu xịn của Login

const Register = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false); 

  const navigate = useNavigate();
  const { loginUser } = useAuth(); 

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); 
    setIsLoading(true);

    try {
      const response = await fetch("http://localhost:5000/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        // Gửi bao vây cả 3 trường hợp tên để Backend hết đường "chối cãi"
        body: JSON.stringify({ 
          name: name,           // Dành cho Backend nhận 'name'
          full_name: name,      // Dành cho Backend nhận 'full_name'
          fullName: name,       // Dành cho Backend nhận 'fullName'
          email: email, 
          password: password 
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Đăng ký thất bại! Vui lòng thử lại.");
      }

      // Lưu Token và Cập nhật Context ngay lập tức
      localStorage.setItem("token", data.token);
      
      // Đảm bảo ghi đè tên thật vào dữ liệu trả về phòng trường hợp Backend vẫn trả sai
      const perfectUser = {
        ...data.user,
        name: name,
        full_name: name
      };
      
      if (loginUser) {
        loginUser(perfectUser);
      }

      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">🚀</div>
        <h2 className="login-title">ForgetMeNot</h2>
        <h3 className="login-subtitle">Tạo tài khoản mới</h3>
        <p className="login-desc">Bắt đầu hành trình học tập của bạn</p>

        {error && (
          <div className="error-message">
            ❌ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Box Tên hiển thị */}
          <div className="form-group" style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", width: "100%" }}>
            <div className="form-label-wrapper" style={{ width: "100%", textAlign: "left", marginBottom: "8px" }}>
              <label style={{ fontWeight: "600", color: "var(--text-dark)", fontSize: "0.95rem" }}>Tên hiển thị</label>
            </div>
            <input
              type="text"
              placeholder="VD: DAT IT"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={{ width: "100%", boxSizing: "border-box" }}
            />
          </div>

          {/* Box Email */}
          <div className="form-group" style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", width: "100%", marginTop: "15px" }}>
            <div className="form-label-wrapper" style={{ width: "100%", textAlign: "left", marginBottom: "8px" }}>
              <label style={{ fontWeight: "600", color: "var(--text-dark)", fontSize: "0.95rem" }}>Email</label>
            </div>
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ width: "100%", boxSizing: "border-box" }}
            />
          </div>

          {/* Box Mật khẩu */}
          <div className="form-group" style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", width: "100%", marginTop: "15px", marginBottom: "25px" }}>
            <div className="form-label-wrapper" style={{ width: "100%", textAlign: "left", marginBottom: "8px" }}>
              <label style={{ fontWeight: "600", color: "var(--text-dark)", fontSize: "0.95rem" }}>Mật khẩu</label>
            </div>
            <input
              type="password"
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ width: "100%", boxSizing: "border-box" }}
            />
          </div>

          {/* Nút Đăng ký tự động kế thừa class btn-login bóng mượt */}
          <button type="submit" className="btn-login" disabled={isLoading}>
            {isLoading ? "Đang xử lý..." : "Đăng ký tài khoản"}
          </button>
        </form>

        <div className="register-hint">
          Đã có tài khoản?{" "}
          <span onClick={() => navigate("/login")}>
            Đăng nhập
          </span>
        </div>
      </div>
    </div>
  );
};

export default Register;