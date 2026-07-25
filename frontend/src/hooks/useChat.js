// File: frontend/src/hooks/useChat.js
import { useState, useEffect, useCallback, useRef } from "react";
import { io } from "socket.io-client";
import { communityAPI } from "../services/api";

export const useChat = () => {
  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Dùng useRef để giữ ăng-ten kết nối không bị đứt khi React render lại màn hình
  const socketRef = useRef();

  // 1. KHỞI TẠO ĂNG-TEN KẾT NỐI
  useEffect(() => {
    // Kết nối tới Server Backend
    socketRef.current = io("http://localhost:5000");

    // Lắng nghe tín hiệu "receiveNewMessage" từ Server
    socketRef.current.on("receiveNewMessage", (incomingMessage) => {
      setMessages((prevMessages) => {
        // Kiểm tra chống trùng lặp (tránh tin nhắn bị nhân đôi do vừa nhận API vừa nhận Socket)
        const isExist = prevMessages.some(
          (msg) => msg.id === incomingMessage.id,
        );
        if (isExist) return prevMessages;

        // Lấy ID của user hiện tại từ token (để biết tin nhắn bay tới là của mình hay của bạn)
        const token = localStorage.getItem("token");
        let myId = null;
        if (token) {
          try {
            // Giải mã JWT token để lấy user ID (Payload nằm ở phần thứ 2 của chuỗi)
            const payload = JSON.parse(atob(token.split(".")[1]));
            myId = payload.id;
          } catch (e) {
            console.error("Lỗi đọc token");
          }
        }

        // Đánh dấu xem tin nhắn này là của mình (mine) hay của họ (theirs)
        const formattedMessage = {
          ...incomingMessage,
          isMine: incomingMessage.sender_id === myId,
        };

        return [...prevMessages, formattedMessage];
      });
    });

    // Khi người dùng tắt trình duyệt hoặc chuyển trang -> Rút điện ăng-ten
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // 2. LẤY DANH SÁCH CUỘC TRÒ CHUYỆN
  const loadConversations = useCallback(async () => {
    try {
      const res = await communityAPI.getMyConversations();
      if (res.success) setConversations(res.data);
    } catch (error) {
      console.error("Lỗi tải danh sách chat:", error);
    }
  }, []);

  // 3. CHỌN MỘT NGƯỜI BẠN / NHÓM ĐỂ CHAT
  const selectConversation = async (conversation) => {
    setActiveChat(conversation);
    setIsLoading(true);

    // 📡 Báo cho Server biết: "Tôi đang vào xem đoạn chat này, hãy vặn ăng-ten đúng tần số này nhé!"
    socketRef.current.emit("joinRoom", conversation.id);

    try {
      const res = await communityAPI.getConversationMessages(conversation.id);
      if (res.success) setMessages(res.data);
    } catch (error) {
      console.error("Lỗi tải tin nhắn:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // 4. GỬI TIN NHẮN
  const sendMessage = async (content, file = null) => {
    if (!activeChat) return;

    const formData = new FormData();
    formData.append("conversation_id", activeChat.id);
    if (content) formData.append("content", content);
    if (file) formData.append("file", file);

    try {
      // Chỉ cần gọi API HTTP bình thường.
      // Khi lưu xong, Backend sẽ TỰ ĐỘNG phát sóng qua Socket về lại hàm socket.on("receiveNewMessage") ở trên!
      await communityAPI.sendMessage(formData);
    } catch (error) {
      console.error("Lỗi gửi tin nhắn:", error);
    }
  };

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  return {
    conversations,
    activeChat,
    messages,
    isLoading,
    selectConversation,
    sendMessage,
    loadConversations,
  };
};
