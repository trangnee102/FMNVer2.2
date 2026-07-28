// frontend/src/hooks/useCramMode.js
import { useState, useEffect } from "react";
import api from "../services/api"; // 👉 ĐÃ NÂNG CẤP: Dùng kẻ vận chuyển ngầm api.js

const useCramMode = (deckId, onFinish) => {
  const [fullBatch, setFullBatch] = useState([]); 
  const [cramQueue, setCramQueue] = useState([]); 
  const [forgottenThisRound, setForgottenThisRound] = useState([]); 
  const [isPerfectCycle, setIsPerfectCycle] = useState(true); 
  const [cycleCount, setCycleCount] = useState(1); 

  const [isFlipped, setIsFlipped] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isBossMode, setIsBossMode] = useState(false);

  useEffect(() => {
    const initCramMode = async () => {
      try {
        setIsLoading(true);
        const savedSettings = JSON.parse(localStorage.getItem(`cram_settings_${deckId}`)) || {};
        const savedHistory = JSON.parse(localStorage.getItem(`cram_history_${deckId}`)) || {};
        const mockDate = localStorage.getItem("TIME_MACHINE");

        let cards = [];
        let bossModeFlag = false;

        try {
          // Thử gọi API Cram Mode của Backend
          const responseData = await api.post(`/flashcards/deck/${deckId}/cram`, {
            examDate: savedSettings.examDate || null,
            currentDate: mockDate || null,
            bossModePercent: savedSettings.bossModePercent || 30,
            dailyQuota: savedSettings.dailyQuota || 50,
            forgetHistory: savedHistory,
          });

          if (responseData && responseData.data) {
            cards = responseData.data.cards || [];
            bossModeFlag = responseData.data.isBossMode || false;
          }
        } catch (error) {
          console.warn("API Cram trả lỗi, tự động kích hoạt chế độ Fallback...");
        }

        // 👉 ĐÃ FIX LỖI CỐT LÕI: NẾU BACKEND KHÔNG TRẢ VỀ THẺ (Do đã ôn xong hết)
        // Hệ thống sẽ ép buộc tải TOÀN BỘ thẻ gốc của bộ bài để bạn nhồi nhét lại!
        if (cards.length === 0) {
          const allCardsData = await api.get(`/flashcards/deck/${deckId}`);
          let rawCards = allCardsData.data || allCardsData || [];
          
          if (Array.isArray(rawCards) && rawCards.length > 0) {
            // Tự động sắp xếp: Ưu tiên nhét các thẻ hay sai (có trong sổ thù vặt) lên đầu
            cards = rawCards.sort((a, b) => (savedHistory[b.id] || 0) - (savedHistory[a.id] || 0));
            bossModeFlag = savedSettings.examDate ? true : false;
          }
        }

        // Khởi tạo các State cho Thuật toán Thác Nước
        setFullBatch(cards);
        setCramQueue(cards);
        setForgottenThisRound([]);
        setIsPerfectCycle(true);
        setCycleCount(1);
        setIsBossMode(bossModeFlag);

      } catch (error) {
        console.error("Lỗi khi khởi tạo Cram Mode:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (deckId) initCramMode();
  }, [deckId]);

  // ========================================================
  // THUẬT TOÁN "PERFECT CLEARANCE" (THÁC NƯỚC)
  // ========================================================
  const handleCramRating = (isRemembered) => {
    if (cramQueue.length === 0) return;

    const currentCard = cramQueue[0];
    setIsFlipped(false); // Úp thẻ ngay lập tức để tạo hiệu ứng

    setTimeout(() => {
      let updatedQueue = cramQueue.slice(1); 
      let newForgotten = [...forgottenThisRound];
      let newIsPerfect = isPerfectCycle;

      // NẾU BẤM QUÊN 🔴
      if (!isRemembered) {
        newForgotten.push(currentCard); 
        newIsPerfect = false; 

        // Lưu vào "Sổ thù vặt" LocalStorage để các phiên Cram sau tiếp tục ưu tiên hiển thị
        const savedHistory = JSON.parse(localStorage.getItem(`cram_history_${deckId}`)) || {};
        const currentForgetCount = savedHistory[currentCard.id] || 0;
        savedHistory[currentCard.id] = currentForgetCount + 1;
        localStorage.setItem(`cram_history_${deckId}`, JSON.stringify(savedHistory));
      }

      // KIỂM TRA XEM ĐÃ HẾT BÀI TRONG HÀNG ĐỢI HIỆN TẠI CHƯA?
      if (updatedQueue.length === 0) {
        if (newForgotten.length > 0) {
          // Trường hợp 1: Hết bài nhưng CÒN THẺ SAI -> Bắt đầu lượt học lại với các thẻ bị sai
          setCramQueue(newForgotten);
          setForgottenThisRound([]);
          setIsPerfectCycle(newIsPerfect);
        } else {
          // Trường hợp 2: Đã thuộc hết thẻ trong hàng đợi
          if (newIsPerfect) {
            // CHIẾN THẮNG TUYỆT ĐỐI! -> Xóa sạch hàng đợi để kích hoạt màn hình Tốt nghiệp
            setCramQueue([]);
          } else {
            // KIẾP NẠN: Thuộc hết các thẻ sai rồi, nhưng vì lúc nãy có sai nên phải LÀM LẠI TỪ ĐẦU!
            setCramQueue([...fullBatch]); 
            setForgottenThisRound([]); 
            setIsPerfectCycle(true); 
            setCycleCount((prev) => prev + 1); 
          }
        }
      } else {
        // Trường hợp 3: Vẫn còn thẻ trong hàng đợi, học tiếp thẻ tiếp theo
        setCramQueue(updatedQueue);
        setForgottenThisRound(newForgotten);
        setIsPerfectCycle(newIsPerfect);
      }
    }, 150); 
  };

  return {
    cramQueue,
    fullBatch,
    cycleCount,
    forgottenThisRound,
    isFlipped,
    setIsFlipped,
    isLoading,
    isBossMode,
    handleCramRating,
  };
};

export default useCramMode;