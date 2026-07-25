import React, { useState } from "react";
import { useNavigate } from "react-router-dom"; // 👉 ĐÃ THÊM: Công cụ chuyển trang chuẩn
import { useAuth } from "../../context/AuthContext"; // 👉 ĐÃ THÊM: Chìa khóa mở Két sắt
import Button from "../common/Button";
import "./Login.css";

const Register = () => {
  // 👉 ĐÃ XÓA: Không cần nhận props từ App.jsx nữa
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false); // Thêm state loading cho mượt

  const navigate = useNavigate();
  const { loginUser } = useAuth(); // Kéo hàm cất dữ liệu từ Két sắt ra

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); // Xóa lỗi cũ đi trước khi thử lại
    setIsLoading(true);

    try {
      // Gọi API Đăng ký xuống Backend
      const response = await fetch("http://localhost:5000/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        // 👉 ĐÃ SỬA: Nhớ gửi kèm cả Tên hiển thị (full_name) xuống Backend nhé!
        body: JSON.stringify({ full_name: name, email, password }),
      });

      const data = await response.json();

      // Nếu Backend từ chối (VD: Trùng email)
      if (!response.ok) {
        throw new Error(data.message || "Đăng ký thất bại!");
      }

      // 🎉 BƯỚC 1: Đăng ký thành công -> Lưu ngay Token vào Local Storage
      localStorage.setItem("token", data.token);

      // 🎉 BƯỚC 2: Cất toàn bộ thông tin User mới tạo vào Két sắt
      loginUser(data.user);

      // 🎉 BƯỚC 3: Chuyển trang thẳng vào Dashboard bằng URL
      navigate("/dashboard");
    } catch (err) {
      // Bắt lỗi và ném vào State để in ra chữ đỏ
      setError(err.message);
    } finally {
      setIsLoading(false);
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

        {/* Khu vực hiển thị lỗi chữ đỏ báo cho người dùng */}
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
            {isLoading ? "Đang xử lý..." : "Đăng ký tài khoản"}
          </button>
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
            // 👉 ĐÃ SỬA: Chuyển trang bằng URL
            onClick={() => navigate("/login")}
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
