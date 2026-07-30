// frontend/src/pages/ExamPage.jsx
import React, { useState, useEffect, useCallback } from "react";
import { studyAPI } from "../services/api";
import "./DashboardPage.css";

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
          // 👉 ĐÃ THÊM: Đọc số phút từ LocalStorage, đổi sang giây (Nếu lỗi thì fallback mặc định 1 phút/câu)
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

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const parseSafeJSON = (str, fallback = []) => {
    if (!str) return fallback;
    try {
      return JSON.parse(str);
    } catch {
      return fallback;
    }
  };

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

  const handleSelectOption = (option) => {
    if (isSubmitted || checkedQuestions[currentIndex]) return;

    const currentQ = questions[currentIndex];
    const isMultiple = currentQ.question_type === "MULTIPLE_CHOICE";

    setSelectedAnswers((prev) => {
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
      } else {
        return { ...prev, [currentIndex]: option };
      }
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

  const calculateScore = useCallback(() => {
    let correctCount = 0;
    questions.forEach((q, idx) => {
      const userAns = selectedAnswers[idx];
      const correctLetters = getCorrectLetters(q.correct_answers);

      if (!userAns || (Array.isArray(userAns) && userAns.length === 0)) return;

      if (q.question_type === "MULTIPLE_CHOICE") {
        const userLetters = userAns.map(getLetterFromOption);
        if (
          userLetters.length === correctLetters.length &&
          userLetters.every((l) => correctLetters.includes(l))
        ) {
          correctCount++;
        }
      } else {
        const userLetter = getLetterFromOption(userAns);
        if (correctLetters.includes(userLetter)) correctCount++;
      }
    });
    return correctCount;
  }, [questions, selectedAnswers]);

  const handleSubmit = () => {
    if (
      !window.confirm(
        examMode === "exam"
          ? "Bạn có chắc chắn muốn nộp bài?"
          : "Bạn muốn xem kết quả tổng kết?",
      )
    )
      return;
    const finalScore = calculateScore();
    setScore(finalScore);
    setIsSubmitted(true);
  };

  const handleTimeUp = useCallback(() => {
    alert("⏳ Đã hết thời gian làm bài! Hệ thống sẽ tự động nộp bài.");
    const finalScore = calculateScore();
    setScore(finalScore);
    setIsSubmitted(true);
  }, [calculateScore]);

  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          backgroundColor: "var(--bg-main)",
          color: "var(--text-dark)",
        }}
      >
        <i
          className="fa-solid fa-spinner fa-spin"
          style={{ fontSize: "3rem", color: "#8b5cf6", marginBottom: "15px" }}
        ></i>
        <h2>Đang chuẩn bị phòng thi...</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          backgroundColor: "var(--bg-main)",
          color: "var(--text-dark)",
          padding: "20px",
          textAlign: "center",
        }}
      >
        <i
          className="fa-solid fa-triangle-exclamation"
          style={{ fontSize: "4rem", color: "#ef4444", marginBottom: "20px" }}
        ></i>
        <h2 style={{ marginBottom: "10px" }}>
          Opps! Rớt mạng hoặc thiếu dữ liệu
        </h2>
        <p
          style={{
            color: "var(--text-gray)",
            maxWidth: "400px",
            marginBottom: "25px",
          }}
        >
          {error}
        </p>
        <button
          onClick={onFinish}
          style={{
            padding: "12px 25px",
            backgroundColor: "var(--primary)",
            color: "white",
            borderRadius: "8px",
            border: "none",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          Quay lại Thư Viện
        </button>
      </div>
    );
  }

  const currentQ = questions[currentIndex] || {};
  const options = parseSafeJSON(currentQ.options);
  const isMultiple = currentQ.question_type === "MULTIPLE_CHOICE";

  const isCurrentQChecked =
    isSubmitted || (examMode === "practice" && checkedQuestions[currentIndex]);

  const answeredCount = Object.keys(selectedAnswers).filter((k) => {
    const ans = selectedAnswers[k];
    if (Array.isArray(ans)) return ans.length > 0;
    return ans !== undefined;
  }).length;

  const isQuestionAnswered = isMultiple
    ? selectedAnswers[currentIndex] && selectedAnswers[currentIndex].length > 0
    : selectedAnswers[currentIndex] !== undefined;

  const progressPercent = isSubmitted
    ? 100
    : (answeredCount / questions.length) * 100;

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--bg-main)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* HEADER PHÒNG THI */}
      <header
        style={{
          backgroundColor: "var(--bg-card)",
          padding: "15px 30px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid var(--border)",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
          <button
            onClick={() => {
              if (
                !isSubmitted &&
                !window.confirm(
                  "Thoát bây giờ sẽ mất toàn bộ tiến trình. Vẫn thoát?",
                )
              )
                return;
              onFinish();
            }}
            style={{
              background: "none",
              border: "none",
              fontSize: "1.2rem",
              color: "var(--text-gray)",
              cursor: "pointer",
            }}
          >
            <i className="fa-solid fa-arrow-left"></i>
          </button>
          <h2
            style={{ color: "var(--text-dark)", fontSize: "1.2rem", margin: 0 }}
          >
            {isSubmitted
              ? "Bảng Điểm & Chi Tiết"
              : examMode === "exam"
                ? "Kiểm Tra Trắc Nghiệm ⏳"
                : "Ôn Luyện Trắc Nghiệm 🧠"}
          </h2>
        </div>

        {!isSubmitted && (
          <div style={{ display: "flex", gap: "15px", alignItems: "center" }}>
            {examMode === "exam" && (
              <div
                style={{
                  fontWeight: "bold",
                  color: timeLeft <= 60 ? "#ef4444" : "#f59e0b",
                  backgroundColor:
                    timeLeft <= 60
                      ? "rgba(239, 68, 68, 0.1)"
                      : "rgba(245, 158, 11, 0.1)",
                  padding: "8px 15px",
                  borderRadius: "20px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <i
                  className="fa-solid fa-stopwatch"
                  style={
                    timeLeft <= 60 ? { animation: "pulse 1s infinite" } : {}
                  }
                ></i>
                <span style={{ fontSize: "1.1rem", fontFamily: "monospace" }}>
                  {formatTime(timeLeft)}
                </span>
              </div>
            )}
            <div
              style={{
                fontWeight: "bold",
                color: "#8b5cf6",
                backgroundColor: "rgba(139, 92, 246, 0.1)",
                padding: "8px 15px",
                borderRadius: "20px",
              }}
            >
              Đã trả lời: {answeredCount} / {questions.length}
            </div>
          </div>
        )}
      </header>

      {/* THANH TIẾN ĐỘ */}
      <div
        style={{
          width: "100%",
          height: "4px",
          backgroundColor: "var(--border)",
        }}
      >
        <div
          style={{
            width: `${progressPercent}%`,
            height: "100%",
            backgroundColor: isSubmitted ? "#10b981" : "#8b5cf6",
            transition: "width 0.3s ease",
          }}
        ></div>
      </div>

      <main
        style={{
          flex: 1,
          padding: "30px 20px",
          maxWidth: "800px",
          margin: "0 auto",
          width: "100%",
        }}
      >
        {isSubmitted ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "30px",
              animation: "fadeIn 0.5s ease-in-out",
            }}
          >
            <div
              style={{
                backgroundColor: "var(--bg-card)",
                padding: "30px",
                borderRadius: "16px",
                border: "1px solid var(--border)",
                textAlign: "center",
                boxShadow: "0 10px 25px rgba(0,0,0,0.05)",
              }}
            >
              <h2
                style={{
                  fontSize: "2rem",
                  margin: "0 0 10px 0",
                  color: "var(--text-dark)",
                }}
              >
                Kết Quả Tổng Kết
              </h2>
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: "20px",
                  margin: "20px 0",
                }}
              >
                <div
                  style={{
                    width: "120px",
                    height: "120px",
                    borderRadius: "50%",
                    border: `8px solid ${score / questions.length >= 0.5 ? "#10b981" : "#ef4444"}`,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    flexDirection: "column",
                  }}
                >
                  <span
                    style={{
                      fontSize: "2rem",
                      fontWeight: "900",
                      color: "var(--text-dark)",
                    }}
                  >
                    {Math.round((score / questions.length) * 100)}%
                  </span>
                </div>
                <div style={{ textAlign: "left" }}>
                  <p
                    style={{
                      fontSize: "1.2rem",
                      margin: "0 0 5px 0",
                      color: "var(--text-gray)",
                    }}
                  >
                    Số câu đúng:
                  </p>
                  <p
                    style={{
                      fontSize: "2rem",
                      fontWeight: "bold",
                      color: "var(--text-dark)",
                      margin: 0,
                    }}
                  >
                    <span style={{ color: "#10b981" }}>{score}</span> /{" "}
                    {questions.length}
                  </p>
                </div>
              </div>
              <p style={{ color: "var(--text-gray)", fontSize: "1.1rem" }}>
                {score / questions.length >= 0.8
                  ? "🎉 Cậu đỉnh quá, giữ vững phong độ nhé!"
                  : score / questions.length >= 0.5
                    ? "👍 Cố gắng thêm chút nữa là hoàn hảo!"
                    : "💪 Sai sót là mẹ thành công, xem lại phần giải thích bên dưới nhé!"}
              </p>
            </div>

            {questions.map((q, idx) => {
              const qOptions = parseSafeJSON(q.options);
              const correctLetters = getCorrectLetters(q.correct_answers);
              const qIsMultiple = q.question_type === "MULTIPLE_CHOICE";
              const userAns = selectedAnswers[idx];

              return (
                <div
                  key={idx}
                  style={{
                    backgroundColor: "var(--bg-card)",
                    padding: "30px",
                    borderRadius: "16px",
                    border: "1px solid var(--border)",
                    boxShadow: "0 4px 15px rgba(0,0,0,0.03)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "20px",
                    }}
                  >
                    <span
                      style={{ fontWeight: "bold", color: "var(--text-gray)" }}
                    >
                      Câu {idx + 1} / {questions.length}
                    </span>
                    <span
                      style={{
                        padding: "4px 10px",
                        backgroundColor: "var(--bg-main)",
                        borderRadius: "6px",
                        fontSize: "0.85rem",
                        color: "var(--text-gray)",
                        fontWeight: "bold",
                      }}
                    >
                      {q.difficulty || "Mặc định"}
                    </span>
                  </div>

                  <h3
                    style={{
                      fontSize: "1.3rem",
                      color: "var(--text-dark)",
                      lineHeight: "1.6",
                      marginBottom: "15px",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {q.question ||
                      q.front ||
                      q.front_text ||
                      "Không có nội dung câu hỏi"}
                  </h3>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                    }}
                  >
                    {qOptions.map((opt, oIdx) => {
                      const optLetter = getLetterFromOption(opt);
                      const isSelected = qIsMultiple
                        ? (userAns || []).includes(opt)
                        : userAns === opt;
                      const isCorrect = correctLetters.includes(optLetter);

                      let bg = "var(--bg-main)";
                      let border = "2px solid var(--border)";
                      let color = "var(--text-dark)";

                      if (isCorrect) {
                        bg = "rgba(16, 185, 129, 0.1)";
                        border = "2px solid #10b981";
                        color = "#10b981";
                      } else if (isSelected && !isCorrect) {
                        bg = "rgba(239, 68, 68, 0.1)";
                        border = "2px solid #ef4444";
                        color = "#ef4444";
                      }

                      return (
                        <div
                          key={oIdx}
                          style={{
                            padding: "16px 20px",
                            borderRadius: "12px",
                            backgroundColor: bg,
                            border: border,
                            color: color,
                            fontSize: "1.05rem",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "12px",
                            }}
                          >
                            <span>{opt}</span>
                          </div>
                          {isCorrect && (
                            <i
                              className="fa-solid fa-check"
                              style={{ color: "#10b981", fontSize: "1.2rem" }}
                            ></i>
                          )}
                          {isSelected && !isCorrect && (
                            <i
                              className="fa-solid fa-xmark"
                              style={{ color: "#ef4444", fontSize: "1.2rem" }}
                            ></i>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {(q.explanation ||
                    q.source_reference ||
                    q.back_text ||
                    q.answer) && (
                    <div
                      style={{
                        marginTop: "20px",
                        padding: "15px",
                        backgroundColor: "rgba(59, 130, 246, 0.05)",
                        borderLeft: "4px solid #3b82f6",
                        borderRadius: "4px 8px 8px 4px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                      }}
                    >
                      {q.explanation && (
                        <div>
                          <strong
                            style={{
                              color: "#3b82f6",
                              display: "block",
                              marginBottom: "5px",
                            }}
                          >
                            <i className="fa-solid fa-lightbulb"></i> Giải
                            thích:
                          </strong>
                          <span
                            style={{
                              color: "var(--text-dark)",
                              lineHeight: "1.5",
                            }}
                          >
                            {q.explanation}
                          </span>
                        </div>
                      )}
                      {q.source_reference && (
                        <div>
                          <strong
                            style={{
                              color: "#f59e0b",
                              display: "block",
                              marginBottom: "5px",
                            }}
                          >
                            <i className="fa-solid fa-book-open"></i> Nguồn tham
                            chiếu:
                          </strong>
                          <span
                            style={{
                              color: "var(--text-gray)",
                              fontStyle: "italic",
                              lineHeight: "1.5",
                            }}
                          >
                            "{q.source_reference}"
                          </span>
                        </div>
                      )}
                      {!q.explanation && (q.back_text || q.answer) && (
                        <div>
                          <strong
                            style={{
                              color: "#3b82f6",
                              display: "block",
                              marginBottom: "5px",
                            }}
                          >
                            <i className="fa-solid fa-check-double"></i> Đáp án:
                          </strong>
                          <span
                            style={{
                              color: "var(--text-dark)",
                              lineHeight: "1.5",
                            }}
                          >
                            {q.back_text || q.answer}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            <button
              onClick={onFinish}
              style={{
                width: "100%",
                padding: "15px",
                borderRadius: "12px",
                backgroundColor: "#8b5cf6",
                border: "none",
                color: "white",
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: "1.2rem",
                boxShadow: "0 4px 12px rgba(139,92,246,0.3)",
              }}
            >
              Thoát Phòng Thi <i className="fa-solid fa-right-from-bracket"></i>
            </button>
          </div>
        ) : (
          <div style={{ animation: "fadeIn 0.3s ease-in-out" }}>
            <div
              style={{
                backgroundColor: "var(--bg-card)",
                padding: "30px",
                borderRadius: "16px",
                border: "1px solid var(--border)",
                boxShadow: "0 4px 15px rgba(0,0,0,0.03)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "20px",
                }}
              >
                <span style={{ fontWeight: "bold", color: "var(--text-gray)" }}>
                  Câu {currentIndex + 1} / {questions.length}
                </span>
                <span
                  style={{
                    padding: "4px 10px",
                    backgroundColor: "var(--bg-main)",
                    borderRadius: "6px",
                    fontSize: "0.85rem",
                    color: "var(--text-gray)",
                    fontWeight: "bold",
                  }}
                >
                  {currentQ.difficulty || "Mặc định"}
                </span>
              </div>

              <h3
                style={{
                  fontSize: "1.4rem",
                  color: "var(--text-dark)",
                  lineHeight: "1.6",
                  marginBottom: "10px",
                  whiteSpace: "pre-wrap",
                }}
              >
                {currentQ.question ||
                  currentQ.front ||
                  currentQ.front_text ||
                  "Không có nội dung câu hỏi"}
              </h3>

              {isMultiple && (
                <p
                  style={{
                    color: "#8b5cf6",
                    fontSize: "0.95rem",
                    marginBottom: "25px",
                    fontStyle: "italic",
                  }}
                >
                  <i className="fa-solid fa-list-check"></i> (Câu hỏi chọn nhiều
                  đáp án)
                </p>
              )}

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                  marginTop: isMultiple ? "0" : "25px",
                }}
              >
                {options.map((opt, idx) => {
                  const userAns = selectedAnswers[currentIndex];
                  const isSelected = isMultiple
                    ? (userAns || []).includes(opt)
                    : userAns === opt;

                  const optLetter = getLetterFromOption(opt);
                  const isCorrectAnswer = getCorrectLetters(
                    currentQ.correct_answers,
                  ).includes(optLetter);

                  let bg = "var(--bg-main)";
                  let border = "2px solid var(--border)";
                  let color = "var(--text-dark)";

                  if (isCurrentQChecked) {
                    if (isCorrectAnswer) {
                      bg = "rgba(16, 185, 129, 0.1)";
                      border = "2px solid #10b981";
                      color = "#10b981";
                    } else if (isSelected && !isCorrectAnswer) {
                      bg = "rgba(239, 68, 68, 0.1)";
                      border = "2px solid #ef4444";
                      color = "#ef4444";
                    }
                  } else if (isSelected) {
                    bg = "rgba(139, 92, 246, 0.1)";
                    border = "2px solid #8b5cf6";
                    color = "#8b5cf6";
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => handleSelectOption(opt)}
                      disabled={isCurrentQChecked}
                      style={{
                        padding: "16px 20px",
                        borderRadius: "12px",
                        backgroundColor: bg,
                        border: border,
                        color: color,
                        fontSize: "1.1rem",
                        textAlign: "left",
                        cursor: isCurrentQChecked ? "default" : "pointer",
                        transition: "all 0.2s ease",
                        opacity:
                          isCurrentQChecked && !isCorrectAnswer && !isSelected
                            ? 0.6
                            : 1,
                      }}
                      className={!isCurrentQChecked ? "hover-option" : ""}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                        }}
                      >
                        {!isCurrentQChecked && (
                          <i
                            className={`fa-regular ${isMultiple ? (isSelected ? "fa-square-check" : "fa-square") : isSelected ? "fa-circle-dot" : "fa-circle"}`}
                            style={{
                              fontSize: "1.2rem",
                              color: isSelected
                                ? "#8b5cf6"
                                : "var(--text-gray)",
                            }}
                          ></i>
                        )}
                        <span>{opt}</span>
                        {isCurrentQChecked && isCorrectAnswer && (
                          <i
                            className="fa-solid fa-check"
                            style={{
                              color: "#10b981",
                              fontSize: "1.2rem",
                              marginLeft: "auto",
                            }}
                          ></i>
                        )}
                        {isCurrentQChecked &&
                          isSelected &&
                          !isCorrectAnswer && (
                            <i
                              className="fa-solid fa-xmark"
                              style={{
                                color: "#ef4444",
                                fontSize: "1.2rem",
                                marginLeft: "auto",
                              }}
                            ></i>
                          )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {isCurrentQChecked &&
                (currentQ.explanation || currentQ.source_reference) && (
                  <div
                    style={{
                      marginTop: "25px",
                      padding: "20px",
                      backgroundColor: "rgba(59, 130, 246, 0.05)",
                      borderLeft: "4px solid #3b82f6",
                      borderRadius: "4px 12px 12px 4px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px",
                      animation: "fadeIn 0.4s",
                    }}
                  >
                    {currentQ.explanation && (
                      <div>
                        <strong
                          style={{
                            color: "#3b82f6",
                            display: "block",
                            marginBottom: "5px",
                          }}
                        >
                          <i className="fa-solid fa-lightbulb"></i> Giải thích
                          chi tiết:
                        </strong>
                        <span
                          style={{
                            color: "var(--text-dark)",
                            lineHeight: "1.6",
                          }}
                        >
                          {currentQ.explanation}
                        </span>
                      </div>
                    )}
                    {currentQ.source_reference && (
                      <div>
                        <strong
                          style={{
                            color: "#f59e0b",
                            display: "block",
                            marginBottom: "5px",
                          }}
                        >
                          <i className="fa-solid fa-book-open"></i> Nguồn tham
                          chiếu:
                        </strong>
                        <span
                          style={{
                            color: "var(--text-gray)",
                            fontStyle: "italic",
                            lineHeight: "1.6",
                          }}
                        >
                          "{currentQ.source_reference}"
                        </span>
                      </div>
                    )}
                  </div>
                )}
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: "30px",
                gap: "15px",
              }}
            >
              <button
                onClick={handlePrev}
                disabled={currentIndex === 0}
                style={{
                  padding: "12px 25px",
                  borderRadius: "10px",
                  backgroundColor: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  color:
                    currentIndex === 0
                      ? "var(--text-gray)"
                      : "var(--text-dark)",
                  cursor: currentIndex === 0 ? "not-allowed" : "pointer",
                  fontWeight: "bold",
                }}
              >
                <i className="fa-solid fa-chevron-left"></i> Câu Trước
              </button>

              <div style={{ display: "flex", gap: "15px" }}>
                {examMode === "practice" && !isCurrentQChecked && (
                  <button
                    onClick={handleCheckCurrentQuestion}
                    disabled={!isQuestionAnswered}
                    style={{
                      padding: "12px 25px",
                      borderRadius: "10px",
                      backgroundColor: isQuestionAnswered
                        ? "#f59e0b"
                        : "var(--text-gray)",
                      border: "none",
                      color: "white",
                      cursor: isQuestionAnswered ? "pointer" : "not-allowed",
                      fontWeight: "bold",
                      boxShadow: isQuestionAnswered
                        ? "0 4px 12px rgba(245, 158, 11, 0.3)"
                        : "none",
                    }}
                  >
                    Kiểm tra ngay{" "}
                    <i className="fa-solid fa-magnifying-glass"></i>
                  </button>
                )}

                {currentIndex === questions.length - 1 ? (
                  <button
                    onClick={handleSubmit}
                    disabled={examMode === "exam" ? !isQuestionAnswered : false}
                    style={{
                      padding: "12px 30px",
                      borderRadius: "10px",
                      backgroundColor:
                        examMode === "exam" && !isQuestionAnswered
                          ? "var(--text-gray)"
                          : "#10b981",
                      border: "none",
                      color: "white",
                      cursor:
                        examMode === "exam" && !isQuestionAnswered
                          ? "not-allowed"
                          : "pointer",
                      fontWeight: "bold",
                      boxShadow:
                        examMode === "exam" && !isQuestionAnswered
                          ? "none"
                          : "0 4px 12px rgba(16,185,129,0.3)",
                    }}
                  >
                    {examMode === "exam" ? "Nộp Bài Thi" : "Xem Tổng Kết"}{" "}
                    <i className="fa-solid fa-flag-checkered"></i>
                  </button>
                ) : (
                  <button
                    onClick={handleNext}
                    style={{
                      padding: "12px 25px",
                      borderRadius: "10px",
                      backgroundColor: "#8b5cf6",
                      border: "none",
                      color: "white",
                      cursor: "pointer",
                      fontWeight: "bold",
                      boxShadow: "0 4px 12px rgba(139,92,246,0.3)",
                    }}
                  >
                    Câu Tiếp <i className="fa-solid fa-chevron-right"></i>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      <style>{`
        .hover-option:hover {
          border-color: #8b5cf6 !important;
          background-color: rgba(139, 92, 246, 0.05) !important;
        }
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default ExamPage;
