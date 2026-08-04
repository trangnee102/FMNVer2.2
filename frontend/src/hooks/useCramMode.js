// frontend/src/hooks/useCramMode.js
import { useState, useEffect } from "react";
import api, { studyAPI } from "../services/api";

// 👉 MÁY HÚT BỤI DỮ LIỆU: Bóc tách mảng chứa ABCD dù Backend trả về cấu trúc dị cỡ nào
const extractArrayData = (res) => {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.data)) return res.data;
  if (res.data && Array.isArray(res.data.data)) return res.data.data;
  if (res.data && Array.isArray(res.data.questions)) return res.data.questions;
  if (res.data && Array.isArray(res.data.cards)) return res.data.cards;
  return [];
};

const useCramMode = (deckId, onFinish) => {
  const [fullBatch, setFullBatch] = useState([]);
  const [cramQueue, setCramQueue] = useState([]);
  const [forgottenThisRound, setForgottenThisRound] = useState([]);

  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [totalThisRound, setTotalThisRound] = useState(0);

  const [stage, setStage] = useState("learning");
  const [countdown, setCountdown] = useState(3);
  const [cycleCount, setCycleCount] = useState(1);

  const [isFlipped, setIsFlipped] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initCramMode = async () => {
      try {
        setIsLoading(true);
        let items = [];

        // 👉 RADAR 1: DÙNG ĐÚNG HÀM TRONG API.JS ĐỂ BẾ ĐỀ THI & ABCD VỀ
        // Truyền 1000 vào config để limit lấy hết các câu hỏi của đề
        try {
          const qRes = await studyAPI.generateRandomExam(deckId, 1000);
          items = extractArrayData(qRes);
        } catch (e) {
          console.warn("Lỗi luồng Đề thi, tự động tìm luồng Thẻ ghi nhớ...");
        }

        // 👉 RADAR 2: NẾU KHO ĐỀ THI TRỐNG, TÌM TRONG KHO THẺ GHI NHỚ THƯỜNG
        if (items.length === 0) {
          try {
            const fRes = await api.get(`/flashcards/deck/${deckId}`);
            items = extractArrayData(fRes);
          } catch (e) {
            console.error("Lỗi lấy Thẻ:", e);
          }
        }

        if (items.length > 0) {
          // Bọc thép dữ liệu: Gắn type chuẩn để màn hình giao diện tự động chia form (Trắc nghiệm, Điền khuyết, Thẻ lật)
          const processedItems = items.map((item) => {
            const type = item.question_type || item.type || "FLASHCARD";
            return {
              ...item,
              question_type: type.toUpperCase(), // Ép về CHỮ HOA để so sánh với CramReviewPage
            };
          });

          setFullBatch(processedItems);
          setCramQueue(processedItems);
          setTotalThisRound(processedItems.length);
          setForgottenThisRound([]);
          setCorrectCount(0);
          setWrongCount(0);
          setCycleCount(1);
          setStage("learning");
        }
      } catch (error) {
        console.error("Lỗi khởi tạo:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (deckId) initCramMode();
  }, [deckId]);

  // Logic đếm ngược 3 giây
  useEffect(() => {
    let timer;
    if (stage === "summary") {
      if (countdown > 0) {
        timer = setTimeout(() => setCountdown((prev) => prev - 1), 1000);
      } else {
        moveToNextRound();
      }
    }
    return () => clearTimeout(timer);
  }, [stage, countdown]);

  const handleCramRating = (isRemembered) => {
    if (cramQueue.length === 0 || stage !== "learning") return;

    const currentItem = cramQueue[0];
    setIsFlipped(false);

    setTimeout(() => {
      let updatedQueue = cramQueue.slice(1);
      let newForgotten = [...forgottenThisRound];

      if (isRemembered) {
        setCorrectCount((prev) => prev + 1);
      } else {
        newForgotten.push(currentItem);
        setWrongCount((prev) => prev + 1);
      }

      setForgottenThisRound(newForgotten);
      setCramQueue(updatedQueue);

      if (updatedQueue.length === 0) {
        setStage("summary");
        setCountdown(3);
      }
    }, 150);
  };

  const moveToNextRound = () => {
    if (
      forgottenThisRound.length > 0 &&
      forgottenThisRound.length < fullBatch.length
    ) {
      setCramQueue(forgottenThisRound);
      setTotalThisRound(forgottenThisRound.length);
      setForgottenThisRound([]);
      setCorrectCount(0);
      setWrongCount(0);
      setCycleCount((prev) => prev + 1);
      setStage("learning");
      return;
    }

    if (forgottenThisRound.length === 0 && totalThisRound < fullBatch.length) {
      setCramQueue([...fullBatch]);
      setTotalThisRound(fullBatch.length);
      setForgottenThisRound([]);
      setCorrectCount(0);
      setWrongCount(0);
      setCycleCount((prev) => prev + 1);
      setStage("learning");
      return;
    }

    if (totalThisRound === fullBatch.length) {
      if (forgottenThisRound.length === 0) {
        setStage("finished");
      } else {
        setCramQueue(forgottenThisRound);
        setTotalThisRound(forgottenThisRound.length);
        setForgottenThisRound([]);
        setCorrectCount(0);
        setWrongCount(0);
        setCycleCount((prev) => prev + 1);
        setStage("learning");
      }
    }
  };

  return {
    cramQueue,
    fullBatch,
    cycleCount,
    stage,
    countdown,
    correctCount,
    wrongCount,
    totalThisRound,
    isFlipped,
    setIsFlipped,
    isLoading,
    handleCramRating,
  };
};

export default useCramMode;