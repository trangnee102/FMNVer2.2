import { useState, useEffect } from "react";

const useCramMode = (deckId, onFinish) => {
  const [fullBatch, setFullBatch] = useState([]); // Chứa toàn bộ N thẻ của phiên học (VD: 30 thẻ)
  const [cramQueue, setCramQueue] = useState([]); // Hàng đợi đang học hiện tại
  const [forgottenThisRound, setForgottenThisRound] = useState([]); // Chứa các thẻ bị sai trong lượt
  const [isPerfectCycle, setIsPerfectCycle] = useState(true); // Cờ đánh dấu lượt học này có hoàn hảo không
  const [cycleCount, setCycleCount] = useState(1); // Đếm xem đang ở Vòng thứ mấy

  const [isFlipped, setIsFlipped] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isBossMode, setIsBossMode] = useState(false);

  useEffect(() => {
    const initCramMode = async () => {
      try {
        const token = localStorage.getItem("token") || "";
        const savedSettings =
          JSON.parse(localStorage.getItem(`cram_settings_${deckId}`)) || {};
        const savedHistory =
          JSON.parse(localStorage.getItem(`cram_history_${deckId}`)) || {};
        const mockDate = localStorage.getItem("TIME_MACHINE");

        const response = await fetch(
          `http://localhost:5000/api/flashcards/deck/${deckId}/cram`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              examDate: savedSettings.examDate || null,
              currentDate: mockDate || null,
              bossModePercent: savedSettings.bossModePercent || 30,
              dailyQuota: savedSettings.dailyQuota || 50,
              forgetHistory: savedHistory,
            }),
          },
        );

        if (response.ok) {
          const responseData = await response.json();
          if (responseData.success && responseData.data) {
            const { cards, isBossMode: bossModeFlag } = responseData.data;

            // Khởi tạo các State cho Thuật toán Thác Nước
            setFullBatch(cards || []);
            setCramQueue(cards || []);
            setForgottenThisRound([]);
            setIsPerfectCycle(true);
            setCycleCount(1);
            setIsBossMode(bossModeFlag);
          }
        }
      } catch (error) {
        console.error("Lỗi khi kết nối với máy chủ Cram Mode:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (deckId) initCramMode();
  }, [deckId]);

  // ========================================================
  // THUẬT TOÁN "PERFECT CLEARANCE" (THEO ĐÚNG Ý TRANG)
  // ========================================================
  const handleCramRating = (isRemembered) => {
    if (cramQueue.length === 0) return;

    const currentCard = cramQueue[0];
    setIsFlipped(false); // Úp thẻ ngay lập tức để tạo hiệu ứng

    setTimeout(() => {
      let updatedQueue = cramQueue.slice(1); // Lấy phần còn lại của hàng đợi
      let newForgotten = [...forgottenThisRound];
      let newIsPerfect = isPerfectCycle;

      // NẾU BẤM QUÊN 🔴
      if (!isRemembered) {
        newForgotten.push(currentCard); // Nhét vào danh sách thẻ sai của lượt này
        newIsPerfect = false; // Đánh dấu là vòng này đã bị "vấy bẩn", không còn hoàn hảo nữa

        // Cập nhật Sổ thù vặt lưu vào LocalStorage
        const savedHistory =
          JSON.parse(localStorage.getItem(`cram_history_${deckId}`)) || {};
        const currentForgetCount = savedHistory[currentCard.id] || 0;
        savedHistory[currentCard.id] = currentForgetCount + 1;
        localStorage.setItem(
          `cram_history_${deckId}`,
          JSON.stringify(savedHistory),
        );
      }

      // KIỂM TRA XEM ĐÃ HẾT BÀI TRONG HÀNG ĐỢI HIỆN TẠI CHƯA?
      if (updatedQueue.length === 0) {
        if (newForgotten.length > 0) {
          // Trường hợp 1: Hết bài nhưng CÒN THẺ SAI (VD: thuộc 17, sai 13)
          // -> Bắt đầu lượt học lại với 13 thẻ bị sai
          setCramQueue(newForgotten);
          setForgottenThisRound([]);
          setIsPerfectCycle(newIsPerfect);
        } else {
          // Trường hợp 2: Đã thuộc hết thẻ trong hàng đợi
          if (newIsPerfect) {
            // CHIẾN THẮNG TUYỆT ĐỐI! (VD: Lượt này quét sạch 30/30)
            // -> Xóa sạch hàng đợi để kích hoạt màn hình Tốt nghiệp
            setCramQueue([]);
          } else {
            // KIẾP NẠN: Thuộc hết các thẻ sai rồi, nhưng vì lúc nãy có sai nên phải LÀM LẠI TỪ ĐẦU!
            setCramQueue([...fullBatch]); // Trả lại toàn bộ 30 thẻ
            setForgottenThisRound([]); // Xóa danh sách nháp
            setIsPerfectCycle(true); // Reset lại trạng thái hoàn hảo cho Vòng mới
            setCycleCount((prev) => prev + 1); // Tăng đếm số vòng
          }
        }
      } else {
        // Trường hợp 3: Vẫn còn thẻ trong hàng đợi, học tiếp thẻ tiếp theo
        setCramQueue(updatedQueue);
        setForgottenThisRound(newForgotten);
        setIsPerfectCycle(newIsPerfect);
      }
    }, 150); // Đợi 150ms cho hiệu ứng lật thẻ
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
