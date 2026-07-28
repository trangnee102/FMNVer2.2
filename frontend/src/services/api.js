import axios from "axios";

// =========================================
// 1. KHỞI TẠO "KẺ VẬN CHUYỂN NGẦM"
// =========================================
const api = axios.create({
  // 👉 Tự động đọc link Render từ file .env. Nếu không có file .env thì mới dự phòng bằng localhost
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
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
    return response.data;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error.response?.data || error);
  },
);

// =========================================
// CÁC HÀM GỌI API ĐÃ ĐƯỢC NÂNG CẤP BẰNG AXIOS
// =========================================

export const authAPI = {
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

  renameGroup: (groupId, name) =>
    api.put(`/community/groups/${groupId}/rename`, { name }),

  getGroupMembers: (groupId) => api.get(`/community/groups/${groupId}/members`),

  addGroupMember: (groupId, email) =>
    api.post(`/community/groups/${groupId}/members`, { email }),

  clearGroupHistory: (groupId) =>
    api.delete(`/community/groups/${groupId}/messages`),

  markAsRead: (conversationId) =>
    api.post(`/community/conversations/${conversationId}/read`),
};

export default api;
