import axios from "axios";

// =========================================
// 1. KHỞI TẠO "KẺ VẬN CHUYỂN NGẦM"
// =========================================
const api = axios.create({
  baseURL: "http://localhost:5000/api", // Đảm bảo khớp với cổng Backend
});

// =========================================
// 2. TRẠM KIỂM SOÁT ĐẦU RA (Tự động gắn thẻ căn cước)
// =========================================
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// =========================================
// 3. TRẠM KIỂM SOÁT ĐẦU VÀO (Xử lý dữ liệu & Bắt lỗi tự động)
// =========================================
api.interceptors.response.use(
  (response) => {
    // Tự động bóc tách vỏ Axios, trả về đúng dữ liệu lõi cho các hàm hook dễ dùng (giống fetch.json())
    return response.data;
  },
  (error) => {
    // Nếu Backend báo lỗi 401 (Chưa đăng nhập hoặc Token hết hạn/bị giả mạo)
    if (error.response && error.response.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login"; // Đá văng ra cửa Đăng nhập
    }
    // Trả về thẳng cục lỗi của Backend để hiển thị (nếu có)
    return Promise.reject(error.response?.data || error);
  },
);

// =========================================
// CÁC HÀM GỌI API ĐÃ ĐƯỢC NÂNG CẤP BẰNG AXIOS
// =========================================

export const authAPI = {
  // Ngắn gọn, không cần JSON.stringify hay khai báo method lằng nhằng!
  login: (email, password) => api.post("/auth/login", { email, password }),
};

export const deckAPI = {
  createDeckWithCards: (deckData) => api.post("/decks/bulk", deckData),
};

export const studyAPI = {
  getDueCards: (deckId) => api.get(`/study/deck/${deckId}/due-cards`),
  reviewCard: (cardId, grade) => api.post(`/study/${cardId}/review`, { grade }),
};

export const statisticsAPI = {
  getStats: (timeFilter) => api.get(`/statistics?filter=${timeFilter}`),
};

export const communityAPI = {
  getDiscoveryDecks: () => api.get("/community/discovery"),
  getLeaderboard: () => api.get("/community/leaderboard"),
  getContacts: () => api.get("/community/contacts"),
  getMessages: (friendId) => api.get(`/community/messages/${friendId}`),

  // Axios cực kỳ thông minh: Thấy formData truyền vào, nó tự động set header "multipart/form-data"!
  sendMessage: (formData) => api.post("/community/messages", formData),

  searchUser: (email) =>
    api.get(`/community/search?email=${encodeURIComponent(email)}`),
  sendFriendRequest: (targetUserId) =>
    api.post("/community/friend-request", { targetUserId }),
  getPendingRequests: () => api.get("/community/friend-requests/pending"),
  respondFriendRequest: (requestId, action) =>
    api.post("/community/friend-request/respond", { requestId, action }),

  createGroup: (name, description) =>
    api.post("/community/groups", { name, description }),
  joinGroup: (inviteCode) => api.post("/community/groups/join", { inviteCode }),
  getMyGroups: () => api.get("/community/groups"),
  getGroupMessages: (groupId) =>
    api.get(`/community/groups/${groupId}/messages`),
  sendGroupMessage: (groupId, formData) =>
    api.post(`/community/groups/${groupId}/messages`, formData),
  leaveGroup: (groupId) => api.post(`/community/groups/${groupId}/leave`),
};

// Export thêm kẻ vận chuyển gốc để dự phòng nếu sau này cần dùng trực tiếp
export default api;
