import axios from "axios";

const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL || "https://fmn-backend.onrender.com/api",
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
  updateProfile: (data) => api.put("/auth/update-profile", data),
};

export const dashboardAPI = {
  checkin: () => api.post("/dashboard/checkin"),
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

  submitExamResults: (deckId, results) =>
    api.post(`/study/exam/${deckId}/submit`, results),
};

export const statisticsAPI = {
  getStats: (timeFilter) => api.get(`/statistics?filter=${timeFilter}`),
};

export const aiAPI = {
  generateExam: (formData) =>
    api.post("/ai/generate-exam", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  saveExam: (examData) => api.post("/ai/save-exam", examData),
  editExamQuestion: (questionData) =>
    api.post("/ai/edit-exam-question", questionData),
};

// 👉 ĐÃ THÊM MỚI: Cỗ máy API chuyên dụng để tạo Flashcard bằng AI (gửi kèm file)
export const aiFlashcardAPI = {
  generate: (formData) =>
    api.post("/ai/generate", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
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
  // 👉 FIX: Lấy TOÀN BỘ thẻ trong bộ đề để tạo phòng QuickTest, không lọc theo
  // "đến hạn ôn" (due-cards là khái niệm SM2 cá nhân, không liên quan gì đến bài
  // thi chung của cả lớp) — trước đây dùng nhầm endpoint due-cards khiến phòng
  // thi báo "Không có câu hỏi hợp lệ" nếu giáo viên đã ôn hết thẻ hôm đó.
  getDeckQuestions: (deckId) => api.get(`/flashcards/deck/${deckId}`),
  createRoom: (payload) => api.post("/quicktest/rooms", payload),
  getRoom: (roomCode) => api.get(`/quicktest/rooms/${roomCode}`),
  joinRoom: (roomCode, participantName) =>
    api.post("/quicktest/join", { roomCode, participantName }),
  // 👉 Thống kê phân bố đáp án theo từng câu (chế độ Tự do) — chỉ xem được sau khi bài thi
  // đã kết thúc (server chặn nếu phòng chưa FINISHED), tránh rò đáp án cho người chưa làm xong
  getAllQuestionStats: (roomCode) =>
    api.get(`/quicktest/rooms/${roomCode}/all-question-stats`),
  // 👉 Xem trước số học sinh đã trả lời CÂU HIỆN TẠI (chế độ Đồng bộ) mà KHÔNG công bố —
  // dùng để cảnh báo giáo viên trước khi bấm "Công bố đáp án" lúc chưa có ai trả lời
  getQuestionStats: (roomCode, questionId) =>
    api.get(`/quicktest/rooms/${roomCode}/question-stats/${questionId}`),
};

export default api;
