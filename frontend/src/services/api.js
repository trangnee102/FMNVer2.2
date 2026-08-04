import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api",
});

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

export const authAPI = {
  login: (email, password) => api.post("/auth/login", { email, password }),
};

export const deckAPI = {
  createDeckWithCards: (deckData) => api.post("/decks/bulk", deckData),
};

export const studyAPI = {
  getDueCards: (deckId) => api.get(`/study/deck/${deckId}/due-cards`),
  reviewCard: (cardId, grade) => api.post(`/study/${cardId}/review`, { grade }),

  generateRandomExam: (deckId, config, difficulty) => {
    let params = { difficulty };

    if (typeof config === "object" && config !== null) {
      params.easyCount = config.easyCount;
      params.mediumCount = config.mediumCount;
      params.hardCount = config.hardCount;
    } else {
      params.limit = config;
    }

    return api.get(`/study/exam/${deckId}/random`, { params });
  },
};

export const statisticsAPI = {
  getStats: (timeFilter) => api.get(`/statistics?filter=${timeFilter}`),
};

export const communityAPI = {
  getDiscoveryDecks: () => api.get("/community/discovery?type=deck"),
  getDiscoveryExams: () => api.get("/community/discovery?type=exam"),
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

export const quickTestAPI = {
  getMyDecks: () => api.get("/decks"),
  getDeckQuestions: (deckId) => api.get(`/study/deck/${deckId}/due-cards`),
  createRoom: (payload) => api.post("/quicktest/rooms", payload),
  getRoom: (roomCode) => api.get(`/quicktest/rooms/${roomCode}`),
  joinRoom: (roomCode, participantName) => api.post("/quicktest/join", { roomCode, participantName }),
};

export default api;