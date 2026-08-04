// frontend/src/pages/ExamPage.jsx
import React, { useState, useEffect, useCallback } from "react";
import { studyAPI } from "../services/api";

// Import CSS riêng biệt
import "./ExamPage.css";

// Import Component AI & Giao diện
import AIMentorChat from "../components/Study/AIMentorChat";
import ExamHeader from "../components/Study/ExamHeader";
import ExamResult from "../components/Study/ExamResult";
import ExamQuestion from "../components/Study/ExamQuestion";

const ExamPage = ({ deckId, onNavigate, onFinish }) => {
  const [questions, setQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  const [timeLeft, setTimeLeft] = useState(0);
  const [examMode, setExamMode] = useState("practice");
  const [checkedQuestions, setCheckedQuestions] = useState({});

  useEffect(() => {
    if (!deckId) {
      if (onFinish) onFinish();
      else onNavigate("my-decks");
      return;
    }

    const fetchExam = async () => {
      setIsLoading(true);
      setError("");
      try {
        const configStr = localStorage.getItem("fmn_exam_config");
        const config = configStr
          ? JSON.parse(configStr)
          : { limit: 20, mode: "practice", timeLimit: 15 };

        setExamMode(config.mode || "practice");

        const res = await studyAPI.generateRandomExam(
          deckId,
          config,
          config.difficulty,
        );
        const questionsData = res.data || res;

        if (!Array.isArray(questionsData) || questionsData.length === 0) {
          setError(
            "Không tìm thấy đủ câu hỏi phù hợp cho thiết lập này. Hãy giảm số lượng câu hỏi xuống.",
          );
        } else {
          setQuestions(questionsData);
          if (config.mode === "exam") {
            const timeInMinutes = config.timeLimit || questionsData.length;
            setTimeLeft(timeInMinutes * 60);
          }
        }
      } catch (err) {
        setError(err.message || "Có lỗi xảy ra khi tải đề thi.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchExam();
  }, [deckId, onNavigate, onFinish]);

  // LOGIC ĐỒNG HỒ ĐẾM NGƯỢC
  useEffect(() => {
    if (isLoading || isSubmitted || examMode !== "exam" || timeLeft <= 0)
      return;

    const timerId = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerId);
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerId);
  }, [isLoading, isSubmitted, timeLeft, examMode]);

  // LOGIC CHẤM ĐIỂM
  const getCorrectLetters = (ansStr) => {
    if (!ansStr) return [];
    try {
      const parsed = JSON.parse(ansStr);
      if (Array.isArray(parsed))
        return parsed.map((s) => String(s).trim().toUpperCase());
      return [String(parsed).trim().toUpperCase()];
    } catch {
      return ansStr.split(",").map((s) => s.trim().toUpperCase());
    }
  };

  const getLetterFromOption = (opt) => {
    if (!opt) return "";
    const match = opt.match(/^([A-D])/i);
    return match ? match[1].toUpperCase() : opt.charAt(0).toUpperCase();
  };

  const evaluateExam = useCallback(() => {
    let correctCount = 0;
    const resultsPayload = [];

    questions.forEach((q, idx) => {
      const userAns = selectedAnswers[idx];
      let isCorrect = false;

      if (!userAns || (Array.isArray(userAns) && userAns.length === 0)) {
        isCorrect = false;
      } else if (q.question_type === "FILL_BLANK") {
        const userText = String(userAns).trim().toLowerCase();
        const correctText = String(q.correct_answers).trim().toLowerCase();
        if (userText === correctText) isCorrect = true;
      } else if (q.question_type === "MULTIPLE_CHOICE") {
        const correctLetters = getCorrectLetters(q.correct_answers);
        const userLetters = userAns.map(getLetterFromOption);
        if (
          userLetters.length === correctLetters.length &&
          userLetters.every((l) => correctLetters.includes(l))
        ) {
          isCorrect = true;
        }
      } else {
        const correctLetters = getCorrectLetters(q.correct_answers);
        const userLetter = getLetterFromOption(userAns);
        if (correctLetters.includes(userLetter)) isCorrect = true;
      }

      if (isCorrect) correctCount++;

      resultsPayload.push({
        flashcard_id: q.id,
        is_correct: isCorrect,
      });
    });

    return { finalScore: correctCount, resultsPayload };
  }, [questions, selectedAnswers]);

  const handleSelectOption = (option) => {
    if (isSubmitted || checkedQuestions[currentIndex]) return;
    const currentQ = questions[currentIndex];
    const isMultiple = currentQ.question_type === "MULTIPLE_CHOICE";
    const isFillBlank = currentQ.question_type === "FILL_BLANK";

    setSelectedAnswers((prev) => {
      if (isFillBlank) return { ...prev, [currentIndex]: option };
      if (isMultiple) {
        const currentArr = prev[currentIndex] || [];
        if (currentArr.includes(option)) {
          return {
            ...prev,
            [currentIndex]: currentArr.filter((item) => item !== option),
          };
        } else {
          return { ...prev, [currentIndex]: [...currentArr, option] };
        }
      }
      return { ...prev, [currentIndex]: option };
    });
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1)
      setCurrentIndex((prev) => prev + 1);
  };

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex((prev) => prev - 1);
  };

  const handleCheckCurrentQuestion = () => {
    setCheckedQuestions((prev) => ({ ...prev, [currentIndex]: true }));
  };

  const handleSubmit = async () => {
    const currentAnsweredCount = Object.keys(selectedAnswers).filter((k) => {
      const ans = selectedAnswers[k];
      if (Array.isArray(ans)) return ans.length > 0;
      if (typeof ans === "string") return ans.trim() !== "";
      return ans !== undefined;
    }).length;

    const unansweredCount = questions.length - currentAnsweredCount;

    let confirmMessage = "";
    if (unansweredCount > 0) {
      confirmMessage = `⚠️ Bạn vẫn còn ${unansweredCount} câu chưa làm.\nBạn có chắc chắn muốn nộp bài và kết thúc không?`;
    } else {
      confirmMessage =
        examMode === "exam"
          ? "Bạn có chắc chắn muốn nộp bài?"
          : "Bạn muốn xem kết quả tổng kết?";
    }

    if (!window.confirm(confirmMessage)) return;

    const { finalScore, resultsPayload } = evaluateExam();
    setScore(finalScore);
    setIsSubmitted(true);

    try {
      await studyAPI.submitExamResults(resultsPayload);
    } catch (err) {
      console.error("Lỗi đồng bộ kết quả thi:", err);
    }
  };

  const handleTimeUp = useCallback(async () => {
    alert("⏳ Đã hết thời gian làm bài! Hệ thống sẽ tự động nộp bài.");
    const { finalScore, resultsPayload } = evaluateExam();
    setScore(finalScore);
    setIsSubmitted(true);

    try {
      await studyAPI.submitExamResults(resultsPayload);
    } catch (err) {
      console.error("Lỗi tự động đồng bộ kết quả thi:", err);
    }
  }, [evaluateExam]);

  if (isLoading) {
    return (
      <div className="exam-page-loading">
        <i className="fa-solid fa-spinner fa-spin"></i>
        <h2>Đang chuẩn bị phòng thi...</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div className="exam-page-error">
        <i className="fa-solid fa-triangle-exclamation"></i>
        <h2>Opps! Rớt mạng hoặc thiếu dữ liệu</h2>
        <p>{error}</p>
        <button onClick={onFinish}>Quay lại Thư Viện</button>
      </div>
    );
  }

  const currentQ = questions[currentIndex] || {};
  const isMultiple = currentQ.question_type === "MULTIPLE_CHOICE";
  const isFillBlank = currentQ.question_type === "FILL_BLANK";

  const isCurrentQChecked =
    isSubmitted || (examMode === "practice" && checkedQuestions[currentIndex]);

  const answeredCount = Object.keys(selectedAnswers).filter((k) => {
    const ans = selectedAnswers[k];
    if (Array.isArray(ans)) return ans.length > 0;
    if (typeof ans === "string") return ans.trim() !== "";
    return ans !== undefined;
  }).length;

  const isQuestionAnswered = isFillBlank
    ? (selectedAnswers[currentIndex] || "").trim() !== ""
    : isMultiple
      ? selectedAnswers[currentIndex] &&
        selectedAnswers[currentIndex].length > 0
      : selectedAnswers[currentIndex] !== undefined;

  const progressPercent = isSubmitted
    ? 100
    : (answeredCount / questions.length) * 100;

  return (
    <div className="exam-page-container">
      <ExamHeader
        isSubmitted={isSubmitted}
        examMode={examMode}
        timeLeft={timeLeft}
        answeredCount={answeredCount}
        totalQuestions={questions.length}
        progressPercent={progressPercent}
        onFinish={onFinish}
      />

      <main className="exam-page-main">
        {isSubmitted ? (
          <ExamResult
            questions={questions}
            selectedAnswers={selectedAnswers}
            score={score}
            onFinish={onFinish}
          />
        ) : (
          <>
            <div className="exam-palette-container">
              {questions.map((q, idx) => {
                const ans = selectedAnswers[idx];
                const isAnswered =
                  q.question_type === "FILL_BLANK"
                    ? (ans || "").trim() !== ""
                    : q.question_type === "MULTIPLE_CHOICE"
                      ? ans && ans.length > 0
                      : ans !== undefined;

                const isActive = currentIndex === idx;

                let btnClass = "exam-palette-btn";
                if (isActive) btnClass += " active";
                else if (isAnswered) btnClass += " answered";

                return (
                  <button
                    key={idx}
                    onClick={() => setCurrentIndex(idx)}
                    className={btnClass}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            <ExamQuestion
              currentQ={currentQ}
              currentIndex={currentIndex}
              totalQuestions={questions.length}
              examMode={examMode}
              selectedAnswer={selectedAnswers[currentIndex]}
              isCurrentQChecked={isCurrentQChecked}
              handleSelectOption={handleSelectOption}
              handleCheckCurrentQuestion={handleCheckCurrentQuestion}
              handlePrev={handlePrev}
              handleNext={handleNext}
              handleSubmit={handleSubmit}
              isQuestionAnswered={isQuestionAnswered}
            />
          </>
        )}
      </main>

      {!isSubmitted && <AIMentorChat currentQuestion={currentQ} />}
    </div>
  );
};

export default ExamPage;