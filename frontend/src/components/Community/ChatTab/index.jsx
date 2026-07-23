import React from "react";
import "./ChatTab.css";

// Tải bộ xử lý
import useChatManager from "./hooks/useChatManager";

// Tải 2 khối giao diện
import ChatSidebar from "./components/ChatSidebar";
import ChatWindow from "./components/ChatWindow";

const ChatTab = () => {
  // 1. Gọi 1 dòng duy nhất để lấy toàn bộ dữ liệu từ "Bộ não"
  const chatLogic = useChatManager();

  // 2. Ném toàn bộ thông minh đó xuống 2 mảnh ghép hiển thị
  return (
    <div className="chat-tab-container">
      <ChatSidebar logic={chatLogic} />
      <ChatWindow logic={chatLogic} />
    </div>
  );
};

export default ChatTab;
