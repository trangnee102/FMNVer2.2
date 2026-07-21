const BASE_URL = "http://localhost:5000/api";

const fetchWithAuth = async (endpoint, options = {}) => {
  const token = localStorage.getItem("token");
  const headers = { ...options.headers };

  if (token) headers["Authorization"] = `Bearer ${token}`;

  // Xử lý thông minh - Nếu dữ liệu không phải là file (FormData) thì mới ép kiểu JSON
  if (options.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });
  return response.json();
};

export const authAPI = {
  login: (email, password) =>
    fetchWithAuth("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
};

// =========================================
// 👉 ĐÃ THÊM: API CHO QUẢN LÝ BỘ THẺ (DECKS)
// =========================================
export const deckAPI = {
  // Gọi API tạo bộ thẻ và lưu hàng loạt Flashcard cùng lúc
  createDeckWithCards: (deckData) =>
    fetchWithAuth("/decks/bulk", {
      method: "POST",
      body: JSON.stringify(deckData),
    }),
};

export const studyAPI = {
  getDueCards: (deckId) =>
    fetchWithAuth(`/study/deck/${deckId}/due-cards`, { method: "GET" }),

  reviewCard: (cardId, grade) =>
    fetchWithAuth(`/study/${cardId}/review`, {
      method: "POST",
      body: JSON.stringify({ grade }),
    }),
};

export const statisticsAPI = {
  getStats: (timeFilter) =>
    fetchWithAuth(`/statistics?filter=${timeFilter}`, { method: "GET" }),
};

// =========================================
// API CHO TÍNH NĂNG CỘNG ĐỒNG
// =========================================
export const communityAPI = {
  getDiscoveryDecks: () =>
    fetchWithAuth("/community/discovery", { method: "GET" }),

  getLeaderboard: () =>
    fetchWithAuth("/community/leaderboard", { method: "GET" }),

  getContacts: () => fetchWithAuth("/community/contacts", { method: "GET" }),

  getMessages: (friendId) =>
    fetchWithAuth(`/community/messages/${friendId}`, { method: "GET" }),

  sendMessage: (formData) =>
    fetchWithAuth("/community/messages", {
      method: "POST",
      body: formData,
    }),

  searchUser: (email) =>
    fetchWithAuth(`/community/search?email=${encodeURIComponent(email)}`, {
      method: "GET",
    }),

  sendFriendRequest: (targetUserId) =>
    fetchWithAuth("/community/friend-request", {
      method: "POST",
      body: JSON.stringify({ targetUserId }),
    }),

  getPendingRequests: () =>
    fetchWithAuth("/community/friend-requests/pending", { method: "GET" }),

  respondFriendRequest: (requestId, action) =>
    fetchWithAuth("/community/friend-request/respond", {
      method: "POST",
      body: JSON.stringify({ requestId, action }),
    }),

  createGroup: (name, description) =>
    fetchWithAuth("/community/groups", {
      method: "POST",
      body: JSON.stringify({ name, description }),
    }),

  joinGroup: (inviteCode) =>
    fetchWithAuth("/community/groups/join", {
      method: "POST",
      body: JSON.stringify({ inviteCode }),
    }),

  getMyGroups: () => fetchWithAuth("/community/groups", { method: "GET" }),
  getGroupMessages: (groupId) =>
    fetchWithAuth(`/community/groups/${groupId}/messages`, { method: "GET" }),
  sendGroupMessage: (groupId, formData) =>
    fetchWithAuth(`/community/groups/${groupId}/messages`, {
      method: "POST",
      body: formData,
    }),
  leaveGroup: (groupId) =>
    fetchWithAuth(`/community/groups/${groupId}/leave`, {
      method: "POST",
    }),
};
