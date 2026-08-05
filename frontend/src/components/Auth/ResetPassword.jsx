import React, { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Lock, Eye, EyeOff, Loader2, ArrowLeft } from "lucide-react";
import { toast, Toaster } from "react-hot-toast";

const ResetPassword = ({ onNavigate }) => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      toast.error("Đường dẫn không hợp lệ hoặc đã hết hạn.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Mật khẩu nhập lại không khớp!");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success(data.message);
        setTimeout(() => {
          if (onNavigate) onNavigate();
          else navigate("/login");
        }, 2000);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error("Lỗi kết nối đến máy chủ.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Lỗi đường dẫn</h2>
          <p className="text-slate-600 mb-6">Link khôi phục mật khẩu không hợp lệ hoặc đã hết hạn.</p>
          <button
            onClick={() => onNavigate ? onNavigate() : navigate("/login")}
            className="text-blue-600 hover:underline flex items-center justify-center w-full"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Quay lại trang đăng nhập
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4 font-sans">
      <Toaster position="top-right" />
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative border border-slate-100">
        <div className="p-8 md:p-10">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-slate-800 mb-3 tracking-tight">Tạo mật khẩu mới</h2>
            <p className="text-slate-500 text-sm">Vui lòng nhập mật khẩu mới của bạn.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Mật khẩu mới</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-11 pr-12 py-3 border border-slate-200 rounded-xl text-slate-900 bg-slate-50/50 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all duration-200 outline-none"
                  placeholder="Nhập mật khẩu mới"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Nhập lại mật khẩu</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="block w-full pl-11 pr-12 py-3 border border-slate-200 rounded-xl text-slate-900 bg-slate-50/50 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all duration-200 outline-none"
                  placeholder="Nhập lại mật khẩu"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Lưu mật khẩu mới"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;